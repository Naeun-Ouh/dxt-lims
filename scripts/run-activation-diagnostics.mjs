/** Bounded diagnostics only. Product databases and environment URLs are never used. */
import { build } from 'esbuild';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
await mkdir('tmp', { recursive: true });
const directory = await mkdtemp('tmp/activation-probes-');
for (const name of [
  'diagnose-configuration-activation',
  'diagnose-activation-clock-rollback',
]) {
  const outfile = `${directory}/${name}.mjs`;
  await build({
    entryPoints: [`scripts/${name}.ts`],
    bundle: true,
    platform: 'node',
    format: 'esm',
    packages: 'external',
    outfile,
  });
  const result = spawnSync(process.execPath, [outfile], { stdio: 'inherit' });
  if (result.status !== 0) {
    process.exitCode = 1;
    break;
  }
}
