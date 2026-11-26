import { build } from 'esbuild';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
await mkdir('tmp/reasoning-focused', { recursive: true });
const runner = `import {readFile,readdir} from 'node:fs/promises';
import {PGliteTestDatabase} from '../../src/infrastructure/postgres/pglite-test-database';
import {seedProductionSlice} from '../../src/infrastructure/postgres/slice-seed';
import {configurationRepository} from '../../src/mock/configuration-packages';
import {provisionMeasurementReferences} from '../../src/infrastructure/postgres/measurement-references';
import {provisionReasoningContexts} from '../../src/infrastructure/postgres/reasoning-context';
import {definitions} from '../../src/mock/reference';
import {lifecycleAuthoringProfiles} from '../../src/mock/lifecycle-authoring';
import {runCriteriaContract} from '../../tests/postgres-run-criteria-contract';
const db=await PGliteTestDatabase.open();
try{for(const file of (await readdir('src/infrastructure/postgres/migrations')).filter(n=>/^[0-9]{3}_.*sql$/.test(n)&&Number(n.slice(0,3))<=17).sort())await db.exec(await readFile('src/infrastructure/postgres/migrations/'+file,'utf8'));await seedProductionSlice(db,configurationRepository);await provisionMeasurementReferences(db,definitions);await provisionReasoningContexts(db,lifecycleAuthoringProfiles);await runCriteriaContract(db);console.log('PASS: Run criteria runtime, exact historical retry, optional continuation, permissions');}finally{await db.close();}`;
await writeFile('tmp/reasoning-focused/runner.ts', runner);
await build({
  entryPoints: ['tmp/reasoning-focused/runner.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  outfile: 'tmp/reasoning-focused/runner.mjs',
});
const child = spawnSync(
  process.execPath,
  ['tmp/reasoning-focused/runner.mjs'],
  { stdio: 'inherit' },
);
process.exitCode = child.status ?? 1;
await rm('tmp/reasoning-focused', { recursive: true, force: true });
