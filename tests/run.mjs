import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
const testRoot = join(process.cwd(), 'tmp');
await mkdir(testRoot, { recursive: true });
const dir = await mkdtemp(join(testRoot, 'dxt-lims-test-'));
try {
  for (const [entry, name, format] of [
    ['tests/study-creation.test.tsx', 'study-creation.test.cjs', 'cjs'],
    ['tests/package-validation.test.tsx', 'package-validation.test.cjs', 'cjs'],
    ['tests/evaluation-workflow.test.tsx', 'evaluation-workflow.test.cjs', 'cjs'],
    ['tests/participation.test.tsx', 'participation.test.cjs', 'cjs'],
    ['tests/domain.test.ts', 'domain.test.mjs', 'esm'],
    ['tests/localization.test.tsx', 'localization.test.cjs', 'cjs'],
    ['tests/catalog-final.test.tsx', 'catalog-final.test.cjs', 'cjs'],
    ['tests/entry-final.test.tsx', 'entry-final.test.cjs', 'cjs'],
    ['tests/workspace-inline.test.tsx', 'workspace-inline.test.cjs', 'cjs'],
    ['tests/postgres-adapter.test.tsx', 'postgres-adapter.test.mjs', 'esm'],
  ]) {
    const file = join(dir, name);
    const isPostgresIntegration = entry.includes('postgres-adapter');
    await build({
      entryPoints: [entry],
      bundle: true,
      platform: 'node',
      format,
      outfile: file,
      packages: isPostgresIntegration ? 'external' : 'bundle',
      alias: {
        'next/link': join(process.cwd(), 'tests/stubs/next-link.tsx'),
        'next/navigation': join(process.cwd(), 'node_modules/vinext/dist/shims/navigation.js'),
      },
    });
    const result = spawnSync(process.execPath, ['--test', file], {
      stdio: 'inherit',
    });
    if (result.status !== 0) process.exitCode = result.status ?? 1;
  }
} finally {
  await rm(dir, { recursive: true, force: true });
}
