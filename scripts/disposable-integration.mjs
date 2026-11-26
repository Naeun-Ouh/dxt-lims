/** Creates only a NEW isolated localhost cluster. Never reads project .env files. */
import { build } from 'esbuild';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { createServer } from 'node:net';
import {
  mkdir,
  mkdtemp,
  readFile,
  writeFile,
  readdir,
  copyFile,
  symlink,
  open,
} from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
const run = promisify(execFile),
  root = process.cwd(),
  action = process.argv[2];
const pgBin = process.env.DXT_POSTGRES_BIN;
const port = () =>
  new Promise((ok, fail) => {
    const s = createServer();
    s.on('error', fail);
    s.listen(0, '127.0.0.1', () => {
      const p = s.address().port;
      s.close((e) => (e ? fail(e) : ok(p)));
    });
  });
const safeEnv = () => {
  const env = { ...process.env };
  for (const key of Object.keys(env))
    if (key.startsWith('DXT_') || key === 'DATABASE_URL') delete env[key];
  return env;
};
if (action === 'create') {
  if (process.argv[3] !== '--new-empty-only')
    throw new Error('Require create --new-empty-only');
  if (!pgBin)
    throw new Error('Set DXT_POSTGRES_BIN to native PostgreSQL18 binaries');
  const migrations = await readdir(
    join(root, 'src/infrastructure/postgres/migrations'),
  );
  for (const prefix of ['017_', '018_'])
    if (!migrations.some((f) => f.startsWith(prefix)))
      throw new Error(
        'Wait for approved integration migration ' +
          prefix +
          ' before provisioning',
      );
  await mkdir(join(root, 'tmp'), { recursive: true });
  const dir = await mkdtemp(join(root, 'tmp/agent-integration-'));
  const dbPort = await port(),
    data = join(dir, 'data'),
    socket = join(dir, 'socket');
  await mkdir(socket);
  await run(join(pgBin, 'initdb'), [
    '-D',
    data,
    '-U',
    'dxt_agent',
    '--auth=trust',
    '--no-locale',
    '--encoding=UTF8',
  ]);
  await run(join(pgBin, 'pg_ctl'), [
    '-D',
    data,
    '-l',
    join(dir, 'postgres.log'),
    '-o',
    `-p ${dbPort} -h 127.0.0.1 -k ${socket}`,
    'start',
    '-w',
  ]);
  const databaseUrl = `postgresql://dxt_agent@127.0.0.1:${dbPort}/postgres`;
  const state = {
    label: 'AGENT TEST ONLY',
    directory: dir,
    postgresBin: pgBin,
    databaseUrl,
    dbPort,
    sourceHead: (await run('git', ['rev-parse', 'HEAD'])).stdout.trim(),
  };
  await writeFile(
    join(dir, 'environment.json'),
    JSON.stringify(state, null, 2),
    { mode: 0o600 },
  );
  const bundle = join(dir, 'seed.mjs');
  await build({
    entryPoints: ['scripts/seed-disposable-integration.ts'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    packages: 'external',
    outfile: bundle,
  });
  const env = {
    ...safeEnv(),
    DATABASE_URL: databaseUrl,
    DXT_SCHEMA_STAGE: 'disposable-development',
    DXT_DISPOSABLE_INTEGRATION: 'NEW_EMPTY_DATABASE_ONLY',
    DXT_DISPOSABLE_MANIFEST: join(dir, 'routes.json'),
  };
  try {
    const result = await run(process.execPath, [bundle], {
      env,
      maxBuffer: 10 * 1024 * 1024,
    });
    console.log(result.stdout);
    console.log('ENVIRONMENT ' + join(dir, 'environment.json'));
  } catch (error) {
    console.error(
      'Seed failed; fresh isolated cluster retained for diagnosis at ' + dir,
    );
    throw error;
  }
} else if (action === 'start') {
  const file = resolve(process.argv[3] ?? '');
  if (
    !file.startsWith(join(root, 'tmp/agent-integration-')) ||
    !file.endsWith('/environment.json')
  )
    throw new Error('Only this harness local environment file is accepted');
  const state = JSON.parse(await readFile(file, 'utf8'));
  const files = (await run('git', ['ls-files', '-z'])).stdout
    .split('\0')
    .filter(Boolean);
  const servers = [];
  for (const principal of [
    'agent-integration-writer',
    'agent-integration-viewer',
  ]) {
    const appPort = await port(),
      dest = join(state.directory, 'app-' + appPort);
    await mkdir(dest);
    for (const file of files) {
      const target = join(dest, file);
      await mkdir(dirname(target), { recursive: true });
      await copyFile(join(root, file), target);
    }
    await mkdir(join(dest, '.openai'));
    await copyFile(
      join(root, '.openai/hosting.json'),
      join(dest, '.openai/hosting.json'),
    );
    const modules = join(dest, 'node_modules');
    await mkdir(modules);
    for (const dep of await readdir(join(root, 'node_modules'))) {
      if (dep.startsWith('.vite')) continue;
      await symlink(resolve(root, 'node_modules', dep), join(modules, dep));
    }
    const log = await open(
      join(state.directory, 'app-' + appPort + '.log'),
      'a',
    );
    const child = spawn(
      process.execPath,
      [
        join(root, 'node_modules/vinext/dist/cli.js'),
        'dev',
        '--hostname',
        '127.0.0.1',
        '--port',
        String(appPort),
      ],
      {
        cwd: dest,
        env: {
          ...safeEnv(),
          DATABASE_URL: state.databaseUrl,
          DXT_REPOSITORY: 'postgres',
          DXT_AUTH_PROVIDER: 'server-development',
          DXT_DEV_PRINCIPAL: principal,
          DXT_SCHEMA_STAGE: 'disposable-development',
        },
        stdio: ['ignore', log.fd, log.fd],
        detached: true,
      },
    );
    child.unref();
    await log.close();
    servers.push({
      principal,
      port: appPort,
      pid: child.pid,
      baseUrl: `http://127.0.0.1:${appPort}`,
    });
  }
  await writeFile(
    join(state.directory, 'servers.json'),
    JSON.stringify(servers, null, 2),
  );
  console.log(JSON.stringify(servers, null, 2));
} else
  throw new Error(
    'Usage: create --new-empty-only | start <local environment.json>',
  );
