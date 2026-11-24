// Disposable database only; never consumes DATABASE_URL or modifies a running UAT.
import { build } from 'esbuild';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
await mkdir('tmp', { recursive: true });
const directory = await mkdtemp(
  join(process.cwd(), 'tmp', 'reasoning-proposal-'),
);
try {
  const output = join(directory, 'migration.test.mjs');
  await build({
    entryPoints: ['docs/proposals/issue-16/migration.test.ts'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    packages: 'external',
    outfile: output,
  });
  const result = spawnSync(process.execPath, ['--test', output], {
    stdio: 'inherit',
  });
  process.exitCode = result.status ?? 1;
} finally {
  await rm(directory, { recursive: true, force: true });
}
