import {createNextRunPreview} from '@/src/features/run-registration/decision-continuation-model';
import assert from 'node:assert/strict';
import {DxtApplication} from '@/src/application/dxt-application';
import type {SqlDatabase} from '@/src/infrastructure/postgres/sql-database';
import {createProductionSliceRepositories} from '@/src/infrastructure/postgres/postgres-repositories';
import {hydrateConfigurationPackages} from '@/src/infrastructure/postgres/configuration-hydrator';
import type {productionReasoningContract} from './postgres-reasoning-contract';
import {persistStudySetupVersion} from '@/src/infrastructure/postgres/slice-seed';
import {updateStudySetupItem} from '@/src/features/experiment-series/study-setup-model';
import {activateConfigurationPackage} from '@/src/infrastructure/postgres/configuration-activation';
import {runRepositoryContract} from './run-repository-contract';
export async function productionNextRunContract(db:SqlDatabase,reasoning:Awaited<ReturnType<typeof productionReasoningContract>>){
 const config=await hydrateConfigurationPackages(db,['config-package-photo-v1','config-package-material-rd-v1']);const app=new DxtApplication(createProductionSliceRepositories(db,config));const proofs=[];
 for(const proof of reasoning){const source=proof.snapshot;let state=await app.loadLifecycle(source,proof.profile);
 const change=source.assignments.find(a=>a.kind==='CONDITION'&&a.intentRole==='FIXED')!;
 const proposal=createNextRunPreview(source,state.nextRunPreview!.snapshot.id,[{assignmentId:change.id,after:String(Number(change.value)+1)}]);
 const decision={context:{...state.decisionContext!,decision:{...state.decisionContext!.decision,id:'next-proposal-'+source.id}},nextRunPreview:proposal};
 await app.repositories.decision.saveByRun(source.id,decision,{commandId:'next-proposal-'+source.id,expectedVersion:state.decisionVersion});
 state=await app.loadLifecycle(source,proof.profile);const preview=state.nextRunPreview!;
 const before=(await app.repositories.run.listSnapshots()).length;assert.ok(preview);assert.equal((await app.repositories.run.listSnapshots()).length,before,'preview loading does not create');
 const commandId='next-'+source.id;
 const created=await app.createNextRun(proof.profile.studyId,state,commandId);
 assert.notEqual(created.id,source.id);assert.equal(created.provenance.sourceId,source.id);assert.equal(created.configurationPackageVersionId,source.configurationPackageVersionId);
 assert.deepEqual(created.subjects,preview.snapshot.subjects);
 assert.deepEqual(created.assignments.map(a=>[a.kind,a.label,a.value,a.referenceId,a.intentRole,a.provenance,a.subjectId,a.positionId]),preview.snapshot.assignments.map(a=>[a.kind,a.label,a.value,a.referenceId,a.intentRole,a.provenance,a.subjectId,a.positionId]));
 assert.deepEqual(created.steps.map(s=>[s.label,s.operationDefinitionId,s.role,s.context]),preview.snapshot.steps.map(s=>[s.label,s.operationDefinitionId,s.role,s.context]));
 assert.deepEqual({...created.delta,items:created.delta.items.map(({id:_id,...item})=>item)},{...preview.snapshot.delta,items:preview.snapshot.delta.items.map(({id:_id,...item})=>item)});
 assert.deepEqual(await app.repositories.run.getSnapshot(source.id),source);
 const repeated=await Promise.all([1,2,3].map(()=>app.createNextRun(proof.profile.studyId,state,commandId)));assert.ok(repeated.every(r=>r.id===created.id));
 assert.equal((await app.repositories.run.listSnapshots()).length,before+1);
 const raced=await Promise.all([1,2].map(n=>app.createNextRun(proof.profile.studyId,state,commandId+'-'+n)));assert.equal(new Set([created,...raced].map(r=>r.runNumber)).size,3);
 const setup=(await app.studies.load(proof.profile.studyId))!;const assignment=setup.operations.flatMap(o=>o.items).find(i=>i.editor==='NUMBER');if(assignment)await persistStudySetupVersion(db,updateStudySetupItem(setup,assignment.id,'99'));
 if(source.configurationPackageVersionId==='config-package-photo-v1')await activateConfigurationPackage(db,{scopeType:'AREA',scopeId:'semiconductor-rd',packageId:config.getPackageVersion(source.configurationPackageVersionId)!.packageId,packageVersionId:'config-package-photo-v2'});
 assert.deepEqual(await app.repositories.run.getSnapshot(created.id),created);
 const counts=()=>db.query(`SELECT (SELECT count(*) FROM experiment_run) runs,(SELECT count(*) FROM run_subject) subjects,(SELECT count(*) FROM run_operation) operations,(SELECT count(*) FROM run_assignment) assignments,(SELECT count(*) FROM idempotency_record) receipts`);
 const old=(await counts()).rows;
 await db.query("CREATE OR REPLACE FUNCTION fail_next_assignment() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected Next Run failure'; END $$");await db.query('CREATE TRIGGER fail_next_assignment BEFORE INSERT ON run_assignment FOR EACH ROW EXECUTE FUNCTION fail_next_assignment()');
 try{await assert.rejects(app.createNextRun(proof.profile.studyId,state,commandId+'-fail'));}finally{await db.query('DROP TRIGGER fail_next_assignment ON run_assignment');}
 assert.deepEqual((await counts()).rows,old);
 assert.ok((await app.repositories.run.listSnapshots()).some(r=>r.id===created.id));
 await runRepositoryContract(app.repositories.run,created,'next-shared-'+source.id);
 proofs.push({created,sourceId:source.id,decisionId:state.decisionContext!.decision.id,commandId});
 }
 return proofs;
}
