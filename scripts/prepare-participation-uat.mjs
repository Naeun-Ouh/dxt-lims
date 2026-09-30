import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
await mkdir('tmp/participation-uat-tools', { recursive: true });
const file = 'tmp/participation-uat-tools/prepare.mjs';
await build({
  entryPoints: ['scripts/prepare-participation-uat.ts'],
  outfile: file,
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
});
const result = spawnSync(process.execPath, [file, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env,
});
process.exitCode = result.status ?? 1;
