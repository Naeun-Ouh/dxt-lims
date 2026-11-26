// Isolated proposal validation only. Never accepts an external database URL.
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
const dir = await mkdtemp(join(process.cwd(), 'tmp-sample-contract-'));
try {
  const output = join(dir, 'sample-contract.mjs');
  await build({
    entryPoints: ['docs/proposals/issue-9/sample-contract.test.ts'],
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
  await rm(dir, { recursive: true, force: true });
}
