import { build } from 'esbuild';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = join(process.cwd(), 'tmp');
await mkdir(root, { recursive: true });
const directory = await mkdtemp(join(root, 'dxt-native-test-'));
try {
  const output = join(directory, 'postgres-native.test.mjs');
  await build({
    entryPoints: ['tests/postgres-native.test.ts'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    packages: 'external',
    outfile: output,
  });
  const result = spawnSync(process.execPath, ['--test', output], { stdio: 'inherit' });
  process.exitCode = result.status ?? 1;
} finally {
  await rm(directory, { recursive: true, force: true });
}
