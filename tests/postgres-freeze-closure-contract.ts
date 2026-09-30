import {resolveSavedAnalysisView,projectSavedAnalysisRows} from '@/src/features/analysis/saved-view-repository';
import assert from 'node:assert/strict';
import { DxtApplication } from '@/src/application/dxt-application';
import { createProductionSliceRepositories } from '@/src/infrastructure/postgres/postgres-repositories';
import { hydrateConfigurationPackages } from '@/src/infrastructure/postgres/configuration-hydrator';
import type { SqlDatabase } from '@/src/infrastructure/postgres/sql-database';
import type { productionConfigurationStudyContract } from './postgres-configuration-study-contract';
import { createExperimentWorkspace } from '@/src/features/run-registration/workspace-model';
import { lifecycleAuthoringProfiles } from '@/src/mock/lifecycle-authoring';
import { projectAnalysisRows,saveAnalysisView } from '@/src/domain/analysis';
import { calculateTargetAchievement } from '@/src/features/run-registration/evaluation-grid-model';
import { projectMeasurementEvidence } from '@/src/features/run-registration/measurement-grid-model';

export async function productionFreezeClosureContract(db:SqlDatabase,adoption:Awaited<ReturnType<typeof productionConfigurationStudyContract>>){
  const configuration=await hydrateConfigurationPackages(db,adoption.proofs.map(p=>p.newPin));
  const app=new DxtApplication(createProductionSliceRepositories(db,configuration));
  const proofs=[];
  for(const {slug,newPin,oldRun} of adoption.proofs){
    const modes=[];
    for(const source of ['STUDY_DEFAULT','PREVIOUS_RUN','EXISTING_RUN','BLANK'] as const){
      const template=(await app.repositories.run.getCreatedRun(slug))!;
      const request={seriesSlug:slug,source,...(source==='EXISTING_RUN'?{sourceRunId:template.id}:{})};
      const preview=await app.runs.previewCreation(request);
      assert.equal(preview.readiness.status,'READY');
      const before=(await app.repositories.run.listSnapshots()).length;
      const command=`closure-${slug}-${source}`;
      const run=await app.runs.createFromPreview(request,preview.fingerprint,command);
      assert.deepEqual(await app.runs.createFromPreview(request,preview.fingerprint,command),run);
      assert.equal((await app.repositories.run.listSnapshots()).length,before+1);
      assert.deepEqual(await app.repositories.run.getSnapshot(template.id),template);
      assert.deepEqual(await app.repositories.run.getCreatedRun(slug,run.runNumber),run);
      if(source==='BLANK'){
        assert.equal(run.steps.length,0);assert.equal(run.assignments.length,0);assert.equal(run.measurements.length,0);
        assert.ok(run.subjects.length);assert.equal(createExperimentWorkspace(run,configuration).operations.length,0,'Blank cannot expand fixture Operations');
      }
      // Every source shares the same transactional insert/receipt path.
      const retryPreview=await app.runs.previewCreation(request);
      await db.query("CREATE OR REPLACE FUNCTION fail_closure_subject() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'closure injected failure'; END $$");
      await db.query('CREATE TRIGGER fail_closure_subject BEFORE INSERT ON run_subject FOR EACH ROW EXECUTE FUNCTION fail_closure_subject()');
      try{await assert.rejects(app.runs.createFromPreview(request,retryPreview.fingerprint,command+'-rollback'));}finally{await db.query('DROP TRIGGER fail_closure_subject ON run_subject');}
      assert.equal((await app.repositories.run.listSnapshots()).length,before+1);
      modes.push(run);
      const concurrentPreview=await app.runs.previewCreation(request);
      const raced=await Promise.allSettled([1,2].map(n=>app.runs.createFromPreview(request,concurrentPreview.fingerprint,`${command}-race-${n}`)));
      const successful=raced.flatMap(r=>r.status==='fulfilled'?[r.value]:[]);
      assert.ok(successful.length>=1);assert.equal(new Set(successful.map(r=>r.runNumber)).size,successful.length);
      if(source!=='PREVIOUS_RUN')assert.equal(successful.length,2);
      modes.push(...successful);
    }
    const request={seriesSlug:slug,source:'STUDY_DEFAULT' as const};
    const preview=await app.runs.previewCreation(request);
    await assert.rejects(app.runs.createFromPreview(request,'stale-fingerprint',`stale-${slug}`),/source changed/);
    const snapshot=await app.runs.createFromPreview(request,preview.fingerprint,`full-${slug}`);
    assert.equal(snapshot.configurationPackageVersionId,newPin);
    const planning=(await app.runs.loadPlanning(snapshot.id))!;
    const numeric=planning.snapshot.assignments.find(a=>a.kind==='CONDITION'&&Number.isFinite(Number(a.value)))!;
    numeric.value=String(Number(numeric.value)+1);
    await app.runs.savePlanning(planning,`edit-${slug}`);
    const edited=(await app.runs.loadPlanning(snapshot.id))!;
    const model=createExperimentWorkspace(edited.snapshot,configuration);
    const profile=lifecycleAuthoringProfiles[slug];
    let state:import('@/src/features/run-registration/lifecycle-authoring').AuthoredLifecycleState=await app.loadLifecycle(edited.snapshot,profile,'ACTUAL');
    const operation=model.operations.find(o=>o.id===numeric.processStepId)!;
    state=await app.recordActual(state,model,{id:`full-actual-${slug}`,operationId:operation.id,subjectId:model.subjects[0].id,status:'COMPLETED',startedAt:'2026-09-19T01:00:00Z',endedAt:'2026-09-19T01:30:00Z',actualOverrides:{[numeric.referenceId]:String(Number(numeric.value)+1)}});
    assert.deepEqual(await app.repositories.run.getSnapshot(snapshot.id),edited.snapshot);
    await assert.rejects(app.runs.savePlanning(edited,`stale-after-evidence-${slug}`),/locked/);
    const ctx=await app.repositories.evaluation.getContext!(snapshot.id);
    const binding=ctx.targetBindings[0];
    const catalog=await app.repositories.measurement.getCatalog(newPin);
    const measurementOperation=model.operations.find(o=>o.role==='MEASUREMENT')!;
    const grain=edited.snapshot.subjects[0].type==='WAFER'?'SITE' as const:'SUBJECT' as const;
    const coordinateSet=catalog.coordinateSets.find(s=>s.measurementOperationDefinitionIds.includes(measurementOperation.operationDefinitionRevisionId));
    state=await app.recordMeasurement(state,model,catalog,{id:`full-measurement-${slug}`,operationId:measurementOperation.id,subjectId:model.subjects[0].id,parameterDefinitionId:binding.target.parameterDefinitionId,measurementPoint:binding.measurementPoint,value:String(binding.target.threshold??binding.target.lowerBound??1),grain,siteIdentity:grain==='SITE'?'S01':undefined,coordinateValues:grain==='SITE'?coordinateSet!.coordinateDefinitionIds.map(id=>({coordinateDefinitionId:id,value:0})):[],recordedAt:'2026-09-19T02:00:00Z'});
    const dataset=state.measurementResults.datasets[0];
    const selection={studyId:slug,runIds:[snapshot.id],subjectIds:[model.subjects[0].id],datasetIds:[dataset.id],parameterIds:[binding.target.parameterDefinitionId],aggregation:'MEAN' as const,datasetOrigin:'SOURCE' as const,includeExcluded:true};
    const sources=await app.queryAnalysisSources(await app.analysisSourceCatalog(),selection);
    const rows=projectAnalysisRows(sources,selection);assert.equal(rows.length,1);
    const view=saveAnalysisView({id:`full-analysis-${slug}`,name:'New package full lifecycle',owner:'Engineer',visibility:'PRIVATE',studyId:slug,runIds:selection.runIds,subjectIds:selection.subjectIds,parameterIds:selection.parameterIds,datasetIds:selection.datasetIds,visualization:{type:'BAR',xDimension:'SUBJECT',groupBy:'SUBJECT'},preparation:{aggregation:'MEAN',datasetOrigin:'SOURCE',includeExcluded:true},filters:{text:'',sort:'SUBJECT'},savedAt:'2026-09-19T02:01:00Z'},rows);
    await app.savedAnalyses.save(view,view.id);
    const reopened=(await app.savedAnalyses.get(view.id))!;
    assert.deepEqual(resolveSavedAnalysisView(reopened,sources).missingReferences,[]);assert.deepEqual(projectSavedAnalysisRows(reopened,sources),rows);
    state=await app.loadLifecycle(edited.snapshot,profile);
    const summary=state.measurementResults.summaries[0];
    state=await app.recordEvaluation(state,{id:`full-eval-${slug}`,subjectId:summary.subjectId,seriesTargetId:binding.target.id,measurementSummaryId:summary.id,disposition:'INFORMATIVE',comment:'Explicit new-package lifecycle review',evaluator:'Engineer',evaluatedAt:'2026-09-19T03:00:00Z'});
    const achievement=calculateTargetAchievement(binding,projectMeasurementEvidence(model,state.measurementResults,ctx.catalog,state.actualEvidence)[0]);
    state=await app.recordDecision(state,ctx.catalog,{id:`full-decision-${slug}`,decisionStatement:'Continue controlled experiment',conclusion:'Continue',reason:'Explicit exact evidence',nextActionTypeDefinitionId:ctx.catalog.nextActionTypes.find(t=>t.code==='DESIGN_NEXT_EXPERIMENT')!.id,nextActionNote:'Independent next Run',evaluationIds:state.engineerEvaluations.map(e=>e.id),targetReferences:[{seriesTargetId:binding.target.id,measurementSummaryId:summary.id,status:achievement.status}],targetSubjectIds:[summary.subjectId],targetOperationIds:[],recordedBy:'Engineer',recordedAt:'2026-09-19T03:01:00Z',nextRunChange:null});
    assert.equal(await app.repositories.run.getSnapshot(state.nextRunPreview!.snapshot.id),null);
    const next=await app.createNextRun(slug,state,`full-next-${slug}`);
    const newPlan=(await app.runs.loadPlanning(next.id))!;assert.equal(newPlan.lockReason,null);
    newPlan.snapshot.assignments.find(a=>a.kind==='CONDITION')!.value=String(Number(numeric.value)+1);
    await app.runs.savePlanning(newPlan,`full-next-edit-${slug}`);
    const nextSnapshot=(await app.repositories.run.getSnapshot(next.id))!;
    const nextModel=createExperimentWorkspace(nextSnapshot,configuration);
    await app.recordActual(await app.loadLifecycle(nextSnapshot,profile,'ACTUAL'),nextModel,{id:`next-own-actual-${slug}`,operationId:nextModel.operations.find(o=>o.role==='PROCESS')!.id,subjectId:nextModel.subjects[0].id,status:'COMPLETED',startedAt:'2026-09-19T04:00:00Z',endedAt:'2026-09-19T04:30:00Z',actualOverrides:{}});
    assert.ok((await app.runs.loadPlanning(next.id))!.lockReason);
    assert.deepEqual(await app.repositories.run.getSnapshot(oldRun.id),oldRun);
    proofs.push({modes,source:edited.snapshot,next:await app.repositories.run.getSnapshot(next.id),view,selection,rows,decision:await app.reasoning.loadDecision(snapshot.id)});
  }
  await assert.rejects(app.repositories.study.getLifecycleReadiness!('dts-improvement','missing-package'));
  await assert.rejects(app.runs.previewCreation({seriesSlug:'missing' as never,source:'STUDY_DEFAULT'}));
  await assert.rejects(app.runs.previewCreation({seriesSlug:'dts-improvement',source:'EXISTING_RUN',sourceRunId:'missing'}));
  return proofs;
}
