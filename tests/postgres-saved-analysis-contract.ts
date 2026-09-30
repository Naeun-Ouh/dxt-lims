import { createBrowserRepositories } from '@/src/infrastructure/browser/browser-repositories';
import { createInMemoryRepositories } from '@/src/infrastructure/memory/in-memory-repositories';
import assert from 'node:assert/strict';
import { DxtApplication } from '@/src/application/dxt-application';
import { ApplicationError, type SavedAnalysisRepository } from '@/src/application/repository-ports';
import { saveAnalysisView, projectAnalysisRows, type SavedAnalysisView } from '@/src/domain/analysis';
import { projectSavedAnalysisRows, resolveSavedAnalysisView } from '@/src/features/analysis/saved-view-repository';
import { hydrateConfigurationPackages } from '@/src/infrastructure/postgres/configuration-hydrator';
import { createProductionSliceRepositories } from '@/src/infrastructure/postgres/postgres-repositories';
import type { SqlDatabase } from '@/src/infrastructure/postgres/sql-database';
import type { productionMeasurementContract } from './postgres-measurement-contract';

export async function savedAnalysisContract(repo: SavedAnalysisRepository, view: SavedAnalysisView) {
  const command={commandId:`${view.id}:save`,expectedVersion:0};
  await repo.save(view,command);
  await repo.save(view,command);
  assert.deepEqual(await repo.get(view.id),view);
  assert.equal((await repo.list()).filter(v=>v.id===view.id).length,1);
  const state=await repo.getState(view.id);
  const updated={...view,name:`${view.name} updated`};
  await repo.save(updated,{commandId:`${view.id}:update`,expectedVersion:state.version});
  await assert.rejects(repo.save(view,{commandId:`${view.id}:stale`,expectedVersion:state.version}),e=>e instanceof ApplicationError&&e.code==='CONFLICT');
  await repo.save(view,command);
  assert.deepEqual(await repo.get(view.id),updated,'old retry does not overwrite a later update');
  return updated;
}

export async function productionSavedAnalysisContract(db:SqlDatabase, measurements:Awaited<ReturnType<typeof productionMeasurementContract>>) {
  const configuration=await hydrateConfigurationPackages(db,['config-package-photo-v1','config-package-material-rd-v1']);
  const app=new DxtApplication(createProductionSliceRepositories(db,configuration));
  const proofs=[];
  for(const proof of measurements) {
    const selection={...proof.selection,aggregation:'MEAN' as const};
    const rows=projectAnalysisRows(await app.queryAnalysisSources(await app.analysisSourceCatalog(),selection),selection);
    assert.ok(rows.some(row=>row.representativeResultId),'test requires an exact persisted representative result');
    const view=saveAnalysisView({id:`saved-${proof.snapshot.id}`,name:'Exact results',owner:'Engineer',visibility:'PRIVATE',
      studyId:selection.studyId,runIds:selection.runIds,subjectIds:selection.subjectIds,parameterIds:selection.parameterIds,datasetIds:selection.datasetIds,
      visualization:{type:'BAR',xDimension:'SUBJECT',groupBy:'SUBJECT'},
      preparation:{aggregation:selection.aggregation,datasetOrigin:selection.datasetOrigin,includeExcluded:selection.includeExcluded},filters:{text:'',sort:'SUBJECT'},savedAt:'2026-09-17T10:00:00.000Z'},rows);
    const updated=await savedAnalysisContract(app.repositories.savedAnalysis,view);
    await savedAnalysisContract(createInMemoryRepositories(configuration).savedAnalysis,view);
    const previousWindow=Object.getOwnPropertyDescriptor(globalThis,'window'),storage=new Map<string,string>();
    Object.defineProperty(globalThis,'window',{configurable:true,value:{localStorage:{getItem:(key:string)=>storage.get(key)??null,setItem:(key:string,value:string)=>{storage.set(key,value);}}}});
    try {await savedAnalysisContract(createBrowserRepositories(configuration).savedAnalysis,view);assert.deepEqual(await createBrowserRepositories(configuration).savedAnalysis.get(view.id),updated);}
    finally {if(previousWindow)Object.defineProperty(globalThis,'window',previousWindow);else Reflect.deleteProperty(globalThis,'window');}
    await Promise.all([1,2].map(()=>app.savedAnalyses.save({...view,id:`${view.id}:concurrent`},`${view.id}:concurrent`)));
    assert.equal((await app.savedAnalyses.list()).filter(v=>v.id===`${view.id}:concurrent`).length,1);
    await assert.rejects(app.savedAnalyses.save({...view,id:`${view.id}:concurrent`,name:'different'},`${view.id}:concurrent`),e=>e instanceof ApplicationError&&e.code==='CONFLICT');
    const restored=resolveSavedAnalysisView(updated,await app.queryAnalysisSources(await app.analysisSourceCatalog(),selection));
    assert.deepEqual(restored.missingReferences,[]);
    assert.deepEqual(projectAnalysisRows(await app.queryAnalysisSources(await app.analysisSourceCatalog(),restored.selection),restored.selection),rows);
    const unavailable={...updated,id:`${view.id}:missing`,datasetIds:['unavailable-exact-dataset'],sourceReferences:updated.sourceReferences.map(ref=>({...ref,datasetId:'unavailable-exact-dataset'}))};
    await app.savedAnalyses.save(unavailable,unavailable.id);
    const missingSources=await app.queryAnalysisSources(await app.analysisSourceCatalog(),resolveSavedAnalysisView(unavailable,[]).selection);
    assert.ok(resolveSavedAnalysisView((await app.savedAnalyses.get(unavailable.id))!,missingSources).missingReferences.some(ref=>ref.includes('unavailable-exact-dataset')));
    assert.ok(projectAnalysisRows(missingSources,resolveSavedAnalysisView(unavailable,[]).selection).every(row=>row.value===null),'no same-parameter Dataset substitution');
    const exactSources=await app.queryAnalysisSources(await app.analysisSourceCatalog(),selection);
    assert.deepEqual(projectSavedAnalysisRows(updated,exactSources),rows);
    const withOtherSummary=structuredClone(exactSources);
    for(const source of withOtherSummary){const original=source.measurements.summaries[0];if(original)source.measurements.summaries.unshift({...original,id:`other-${original.id}`,value:{dataType:'NUMBER',value:999}});}
    assert.deepEqual(projectSavedAnalysisRows(updated,withOtherSummary),rows,'another same-context representative cannot replace an exact saved result');
    if(updated.sourceReferences.some(ref=>ref.representativeResultId)) {
      const withoutPinned=withOtherSummary.map(source=>({...source,measurements:{...source.measurements,summaries:source.measurements.summaries.filter(summary=>summary.id.startsWith('other-'))}}));
      assert.deepEqual(projectSavedAnalysisRows(updated,withoutPinned),[],'missing pinned representative never falls forward');
    }
    const payload=(await db.query<{configuration:unknown}>('SELECT configuration FROM saved_analysis WHERE domain_id=$1',[view.id])).rows[0].configuration;
    const {sourceReferences:_refs,...expected}=updated;
    assert.deepEqual(payload,expected,'SQL configuration is the exact refs/config contract, no chart or Measurement values');
    const columns=await db.query<{column_name:string}>("SELECT column_name FROM information_schema.columns WHERE table_name LIKE 'saved_analysis%'");
    assert.ok(columns.rows.every(row=>!/(numeric_value|measurement_value|chart_point|result_value)/.test(row.column_name)));
    const before=await app.measurements.load(proof.snapshot.id);
    await db.query("CREATE OR REPLACE FUNCTION fail_saved_ref() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected saved reference failure'; END $$");
    await db.query('CREATE TRIGGER fail_saved_ref BEFORE INSERT ON saved_analysis_source_ref FOR EACH ROW EXECUTE FUNCTION fail_saved_ref()');
    try {
      await assert.rejects(app.savedAnalyses.save({...view,id:`${view.id}:rollback`},`${view.id}:rollback`));
      await assert.rejects(app.savedAnalyses.save({...updated,name:'rollback-update'},`${view.id}:rollback-update`,2));
    } finally {await db.query('DROP TRIGGER fail_saved_ref ON saved_analysis_source_ref');}
    assert.equal(await app.savedAnalyses.get(`${view.id}:rollback`),null);
    assert.deepEqual(await app.savedAnalyses.get(view.id),updated);
    assert.equal(Number((await db.query<{count:string}>('SELECT count(*) FROM saved_analysis_command_receipt WHERE command_id=$1',[`${view.id}:rollback-update`])).rows[0].count),0);
    assert.deepEqual(await app.measurements.load(proof.snapshot.id),before);
    proofs.push({view:updated,selection:selection,rows:rows});
  }
  return proofs;
}
