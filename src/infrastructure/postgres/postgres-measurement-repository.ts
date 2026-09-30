import {allowReasons} from './authorization';
import { randomUUID, createHash } from 'node:crypto';
import {
  ApplicationError,
  type MeasurementRepository,
  type MeasurementQuery,
  type MeasurementRecord,
  type RepositoryCommand,
  type MeasurementDatasetEntry,
} from '@/src/application/repository-ports';
import {
  subjectMeasurementResultSetSchema,
  type SubjectMeasurementResultSet,
} from '@/src/domain/measurement/subject-measurement';
import type { SqlDatabase, SqlSession, SqlRow } from './sql-database';
import { readMeasurementCatalog } from './measurement-references';
import { plannedMeasurementIdentity } from '@/src/features/run-registration/measurement-grid-model';

const MAX_VALUES = 10000;
const hash = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
type Ids = Record<keyof SubjectMeasurementResultSet, string[]>;
const idsOf = (record: SubjectMeasurementResultSet) =>
  Object.fromEntries(
    Object.entries(record).map(([key, rows]) => [
      key,
      rows.map((r: { id: string }) => r.id),
    ]),
  ) as Ids;
async function bulk(
  session: SqlSession,
  table: string,
  rows: Record<string, unknown>[],
) {
  for (let start = 0; start < rows.length; start += 500) {
    const batch = rows.slice(start, start + 500),
      columns = Object.keys(batch[0]);
    const params: unknown[] = [];
    const tuples = batch.map(
      (row) =>
        '(' +
        columns
          .map((col) => {
            params.push(row[col]);
            return `$${params.length}`;
          })
          .join(',') +
        ')',
    );
    await session.query(
      `INSERT INTO ${table}(${columns.join(',')}) VALUES ${tuples.join(',')} ON CONFLICT DO NOTHING`,
      params,
    );
  }
}
async function identities(
  session: SqlSession,
  table: string,
  items: Array<{ id: string }>,
) {
  const rows = items.length
    ? await session.query<{
        id: string;
        domain_id: string;
        content_hash: string;
      }>(
        `SELECT id,domain_id,content_hash FROM ${table} WHERE domain_id=ANY($1::text[])`,
        [items.map((i) => i.id)],
      )
    : { rows: [] };
  const existing = new Map(rows.rows.map((r) => [r.domain_id, r]));
  return new Map(
    items.map((item) => {
      const old = existing.get(item.id);
      if (old && old.content_hash !== hash(item))
        throw new ApplicationError(
          'CONFLICT',
          'Measurement identity is immutable. Record a new observation or validity decision.',
        );
      return [item.id, { id: old?.id ?? randomUUID(), fresh: !old }];
    }),
  );
}
type ValueRow = SqlRow & {
  id: string;
  domain_id: string;
  dataset_domain_id: string;
  subject_domain_id: string;
  parameter_id: string;
  unit_id: string | null;
  grain: 'SUBJECT' | 'SITE';
  site_identity: string | null;
  value_type: string;
  number_value: number | null;
  text_value: string | null;
  boolean_value: boolean | null;
  metadata: Record<string, unknown>;
};
const valueSelect = `SELECT v.*,d.domain_id AS dataset_domain_id,s.subject_domain_id,site.site_identity
 FROM measurement_value v JOIN measurement_dataset d ON d.id=v.dataset_id
 JOIN experiment_run r ON r.run_id=v.run_id
 JOIN run_subject rs ON rs.run_subject_id=v.run_subject_id JOIN subject s USING(subject_id)
 LEFT JOIN measurement_site site ON site.id=v.site_id`;
async function graph(
  session: SqlSession,
  values: ValueRow[],
  scope?: { runId?: string; ids?: Ids },
): Promise<SubjectMeasurementResultSet> {
  const selected = values.map((v) => v.id),
    datasetIds = [...new Set(values.map((v) => v.dataset_domain_id))];
  const datasets = await session.query<{
    id: string;
    payload: SubjectMeasurementResultSet['datasets'][number];
  }>(
    `SELECT id,payload FROM measurement_dataset WHERE ${scope?.runId ? 'run_id=$1' : 'domain_id=ANY($1::text[])'} ORDER BY domain_id`,
    [scope?.runId ?? scope?.ids?.datasets ?? datasetIds],
  );
  const executionIds = datasets.rows
    .map((d) => d.payload.measurementExecutionId)
    .filter(Boolean);
  const executions = await session.query<{
    payload: SubjectMeasurementResultSet['executions'][number];
  }>(
    `SELECT payload FROM measurement_execution WHERE ${scope?.runId ? 'run_id=$1' : 'domain_id=ANY($1::text[])'} ORDER BY (payload->>'sequence')::int,domain_id`,
    [scope?.runId ?? scope?.ids?.executions ?? executionIds],
  );
  const coords = await session.query<{
    value_id: string;
    definition_id: string;
    coordinate_value: number;
  }>(
    'SELECT * FROM measurement_coordinate_value WHERE value_id=ANY($1::uuid[]) ORDER BY ordinal',
    [selected],
  );
  const lineage = await session.query<{ value_id: string; domain_id: string }>(
    'SELECT l.value_id,s.domain_id FROM measurement_value_lineage l JOIN measurement_value s ON s.id=l.source_value_id WHERE l.value_id=ANY($1::uuid[]) ORDER BY l.ordinal',
    [selected],
  );
  const summaries = await session.query<{ payload: unknown }>(
    `SELECT payload FROM measurement_summary s WHERE dataset_id=ANY($1::uuid[])
 ${scope?.ids ? 'AND domain_id=ANY($2::text[])' : ''}
 ${scope ? '' : 'AND NOT EXISTS(SELECT 1 FROM measurement_summary_source ss WHERE ss.summary_id=s.id AND NOT(ss.value_id=ANY($2::uuid[])))'} ORDER BY domain_id`,
    scope?.ids
      ? [datasets.rows.map((d) => d.id), scope.ids.summaries]
      : scope
        ? [datasets.rows.map((d) => d.id)]
        : [datasets.rows.map((d) => d.id), selected],
  );
  const decisions = await session.query<{ payload: unknown }>(
    `SELECT payload FROM measurement_validity_decision WHERE value_id=ANY($1::uuid[]) ${scope?.ids ? 'AND domain_id=ANY($2::text[])' : ''} ORDER BY decided_at,insertion_order`,
    scope?.ids ? [selected, scope.ids.validityDecisions] : [selected],
  );
  return subjectMeasurementResultSetSchema.parse({
    executions: executions.rows.map((r) => r.payload),
    datasets: datasets.rows.map((r) => r.payload),
    summaries: summaries.rows.map((r) => r.payload),
    validityDecisions: decisions.rows.map((r) => r.payload),
    values: values.map((v) => ({
      ...v.metadata,
      id: v.domain_id,
      datasetId: v.dataset_domain_id,
      subjectId: v.subject_domain_id,
      parameterDefinitionId: v.parameter_id,
      unitDefinitionId: v.unit_id,
      granularity: v.grain,
      siteIdentity: v.site_identity,
      value: {
        dataType: v.value_type,
        value:
          v.value_type === 'NUMBER'
            ? v.number_value
            : v.value_type === 'BOOLEAN'
              ? v.boolean_value
              : v.text_value,
      },
      coordinateValues: coords.rows
        .filter((c) => c.value_id === v.id)
        .map((c) => ({
          coordinateDefinitionId: c.definition_id,
          value: c.coordinate_value,
        })),
      sourceMeasurementValueIds: lineage.rows
        .filter((l) => l.value_id === v.id)
        .map((l) => l.domain_id),
    })),
  });
}
async function readSnapshot(session: SqlSession, runId: string, ids?: Ids) {
  const values = await session.query<ValueRow>(
    `${valueSelect} WHERE ${ids ? 'v.domain_id=ANY($1::text[])' : 'v.run_id=$1'} ORDER BY v.domain_id LIMIT ${MAX_VALUES + 1}`,
    [ids?.values ?? runId],
  );
  if (values.rows.length > MAX_VALUES)
    throw new ApplicationError(
      'VALIDATION',
      'Measurement result exceeds the bounded query limit; select a Dataset or narrower filters.',
    );
  return graph(session, values.rows, ids ? { ids } : { runId });
}
export class PostgresMeasurementRepository implements MeasurementRepository {
  constructor(private readonly database: SqlDatabase, private readonly principalId?:string) {}
  getCatalog(packageId: string) {
    return readMeasurementCatalog(this.database, packageId);
  }
  async listDatasets(): Promise<MeasurementDatasetEntry[]> {
    const rows = await this.database.query<{
      payload: MeasurementDatasetEntry['dataset'];
      parameters: string[];
      subjects: string[];
    }>(`SELECT d.payload,
   ARRAY(SELECT DISTINCT v.parameter_id FROM measurement_value v WHERE v.dataset_id=d.id) AS parameters,
   ARRAY(SELECT DISTINCT s.subject_domain_id FROM measurement_value v JOIN run_subject rs ON rs.run_subject_id=v.run_subject_id JOIN subject s USING(subject_id) WHERE v.dataset_id=d.id) AS subjects
   FROM measurement_dataset d JOIN experiment_run r ON r.run_id=d.run_id ${this.principalId ? "WHERE r.study_id IN (SELECT study_id FROM dxt_discoverable_studies($1) WHERE reason=ANY($2::text[]))" : ''} ORDER BY d.domain_id LIMIT 1001`,this.principalId?[this.principalId,allowReasons]:[]);
    if (rows.rows.length > 1000)
      throw new ApplicationError(
        'VALIDATION',
        'Dataset catalog exceeds the current bounded workspace limit.',
      );
    return rows.rows.map((r) => ({
      dataset: r.payload,
      parameterIds: r.parameters,
      subjectIds: r.subjects,
    }));
  }
  async getStateByRun(runId: string): Promise<MeasurementRecord> {
    return this.database.transaction(async (session) => {
      const run = await session.query<{ run_id: string }>(
        'SELECT run_id FROM experiment_run WHERE run_domain_id=$1 FOR SHARE',
        [runId],
      );
      if (!run.rows[0])
        throw new ApplicationError('NOT_FOUND', 'Run is not persisted.');
      const state = await session.query<{ aggregate_version: number }>(
        'SELECT aggregate_version FROM measurement_state WHERE run_id=$1',
        [run.rows[0].run_id],
      );
      return {
        version: state.rows[0]?.aggregate_version ?? 0,
        record: await readSnapshot(session, run.rows[0].run_id),
      };
    });
  }
  async getByRun(runId: string) {
    return (await this.getStateByRun(runId)).record;
  }
  async query(query: MeasurementQuery) {
    return this.database.transaction(async (session) => {
      await session.query(
        'SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY',
      );
      const params: unknown[] = [],
        where: string[] = [];
      if(this.principalId){params.push(this.principalId,allowReasons);where.push("r.study_id IN (SELECT study_id FROM dxt_discoverable_studies($1) WHERE reason=ANY($2::text[]))");}
      const filter = (values: string[] | undefined, column: string) => {
        if (values) {
          params.push(values);
          where.push(`${column}=ANY($${params.length}::text[])`);
        }
      };
      filter(query.runIds, 'r.run_domain_id');
      filter(query.datasetIds, 'd.domain_id');
      filter(query.subjectIds, 's.subject_domain_id');
      filter(query.parameterDefinitionIds, 'v.parameter_id');
      filter(query.siteIdentities, 'site.site_identity');
      if (query.coordinateDefinitionIds) {
        params.push(query.coordinateDefinitionIds);
        where.push(
          `NOT EXISTS(SELECT 1 FROM unnest($${params.length}::text[]) requested(id) WHERE NOT EXISTS(SELECT 1 FROM measurement_coordinate_value c WHERE c.value_id=v.id AND c.definition_id=requested.id))`,
        );
      }
      if (query.validity) {
        params.push(query.validity);
        where.push(
          `COALESCE((SELECT state FROM measurement_validity_decision vd WHERE vd.value_id=v.id ORDER BY vd.decided_at DESC,vd.insertion_order LIMIT 1),'INCLUDED')=$${params.length}`,
        );
      }
      const limit = query.limit ?? MAX_VALUES;
      if (!Number.isInteger(limit) || limit < 1 || limit > MAX_VALUES)
        throw new ApplicationError(
          'VALIDATION',
          'Measurement query limit must be 1–10000.',
        );
      params.push(limit + 1);
      const rows = await session.query<ValueRow>(
        `${valueSelect} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY v.domain_id LIMIT $${params.length}`,
        params,
      );
      if (rows.rows.length > limit)
        throw new ApplicationError(
          'VALIDATION',
          'Measurement query exceeds its limit. Narrow the Dataset/Subject/Parameter selection.',
        );
      return graph(session, rows.rows);
    });
  }
  async saveByRun(
    runId: string,
    input: SubjectMeasurementResultSet,
    command: RepositoryCommand,
  ): Promise<MeasurementRecord> {
    const parsed = subjectMeasurementResultSetSchema.safeParse(input);
    if (!parsed.success)
      throw new ApplicationError('VALIDATION', 'Invalid Measurement record.');
    const record = parsed.data;
    const unique = (ids: string[]) => new Set(ids).size === ids.length;
    if (
      Object.values(record).some(
        (rows) => !unique(rows.map((row) => row.id)),
      ) ||
      record.values.some(
        (value) =>
          !unique(
            value.coordinateValues.map((c) => c.coordinateDefinitionId),
          ) || !unique(value.sourceMeasurementValueIds),
      ) ||
      record.executions.some((e) => !unique(e.subjectIds)) ||
      record.summaries.some((s) => !unique(s.sourceMeasurementIds))
    )
      throw new ApplicationError(
        'VALIDATION',
        'Measurement identities and source references must be unique within a command.',
      );
    if (record.values.length > MAX_VALUES)
      throw new ApplicationError(
        'VALIDATION',
        'Measurement command exceeds 10000 values.',
      );
    const requestHash = hash({
      record,
      expectedVersion: command.expectedVersion,
    });
    try {
      return await this.database.transaction(async (session) => {
        const root = await session.query<{
          run_id: string;
          configuration_package_version_id: string;
          subject_type_revision_id: string;
        }>(
          'SELECT run_id,configuration_package_version_id,subject_type_revision_id FROM experiment_run WHERE run_domain_id=$1 FOR UPDATE',
          [runId],
        );
        const run = root.rows[0];
        if (!run)
          throw new ApplicationError('NOT_FOUND', 'Run is not persisted.');
        const receipts = await session.query<{
          request_hash: string;
          result_version: number;
          result_ids: Ids;
        }>(
          'SELECT * FROM measurement_command_receipt WHERE run_id=$1 AND command_id=$2',
          [run.run_id, command.commandId],
        );
        if (receipts.rows[0]) {
          const r = receipts.rows[0];
          if (r.request_hash !== requestHash)
            throw new ApplicationError(
              'CONFLICT',
              'Measurement command identity was reused.',
            );
          return {
            version: r.result_version,
            record: await readSnapshot(session, run.run_id, r.result_ids),
          };
        }
        const state = await session.query<{ aggregate_version: number }>(
          'SELECT aggregate_version FROM measurement_state WHERE run_id=$1',
          [run.run_id],
        );
        const version = state.rows[0]?.aggregate_version ?? 0;
        if (command.expectedVersion !== version)
          throw new ApplicationError(
            'CONFLICT',
            'Measurement changed. Reload before saving.',
          );
        const catalog = await readMeasurementCatalog(
          session,
          run.configuration_package_version_id,
        );
        const subjects = await session.query<{
          run_subject_id: string;
          subject_domain_id: string;
        }>(
          'SELECT rs.run_subject_id,s.subject_domain_id FROM run_subject rs JOIN subject s USING(subject_id) WHERE rs.run_id=$1',
          [run.run_id],
        );
        const subjectIds = new Map(
          subjects.rows.map((s) => [s.subject_domain_id, s.run_subject_id]),
        );
        const operations = await session.query<{
          operation_domain_id: string;
          operation_definition_revision_id: string;
          subject_domain_id: string;
        }>(
          `SELECT o.operation_domain_id,o.operation_definition_revision_id,s.subject_domain_id FROM run_subject_operation l JOIN run_operation o ON o.run_operation_id=l.run_operation_id JOIN run_subject rs ON rs.run_subject_id=l.run_subject_id JOIN subject s USING(subject_id) WHERE l.run_id=$1`,
          [run.run_id],
        );
        const actual = await session.query<{
          execution_event_id: string;
          event_domain_id: string;
          run_subject_id: string;
        }>(
          'SELECT execution_event_id,event_domain_id,run_subject_id FROM execution_event WHERE run_id=$1',
          [run.run_id],
        );
        const actualIds = new Map(
          actual.rows.map((e) => [e.event_domain_id, e]),
        );
        const executions = new Map(record.executions.map((e) => [e.id, e])),
          datasets = new Map(record.datasets.map((d) => [d.id, d]));
        const reject = (message: string): never => {
          throw new ApplicationError('VALIDATION', message);
        };
        for (const e of record.executions) {
          if (
            e.experimentRunId !== runId ||
            !catalog.measurementOperations.some(
              (o) => o.id === e.measurementOperationDefinitionId,
            ) ||
            e.subjectIds.some(
              (s) =>
                !operations.rows.some(
                  (o) =>
                    o.subject_domain_id === s &&
                    o.operation_definition_revision_id ===
                      e.measurementOperationDefinitionId,
                ),
            )
          )
            reject(
              'Measurement execution must reference configured Run Subjects and Operation.',
            );
        }
        for (const d of record.datasets) {
          const e = executions.get(d.measurementExecutionId ?? '');
          if (
            d.experimentRunId !== runId ||
            !e ||
            e.measurementOperationDefinitionId !==
              d.measurementOperationDefinitionId
          )
            reject(
              'Dataset must reference the exact Run MeasurementExecution.',
            );
          if (
            d.plannedExecutionItemId &&
            !operations.rows.some(
              (o) =>
                o.operation_definition_revision_id ===
                  d.measurementOperationDefinitionId &&
                e!.subjectIds.includes(o.subject_domain_id) &&
                plannedMeasurementIdentity(
                  runId,
                  o.subject_domain_id,
                  o.operation_domain_id,
                ) === d.plannedExecutionItemId,
            )
          )
            reject('Dataset planned item is incompatible.');
          if (
            d.executionEventId &&
            (!actualIds.has(d.executionEventId) ||
              !e!.subjectIds.some(
                (s) =>
                  subjectIds.get(s) ===
                  actualIds.get(d.executionEventId!)!.run_subject_id,
              ))
          )
            reject('Dataset Actual evidence is outside its Run/Subject.');
        }
        for (const v of record.values) {
          const d = datasets.get(v.datasetId),
            e = executions.get(d?.measurementExecutionId ?? ''),
            p = catalog.parameters.find(
              (p) => p.id === v.parameterDefinitionId,
            );
          if (
            !d ||
            !e?.subjectIds.includes(v.subjectId) ||
            !p ||
            p.measurementOperationDefinitionId !==
              d.measurementOperationDefinitionId ||
            p.unitId !== v.unitDefinitionId ||
            p.dataType !== v.value.dataType
          )
            reject(
              'Measurement Parameter, Unit or Subject is incompatible with its exact Dataset.',
            );
          if (
            v.granularity === 'SUBJECT' &&
            (v.siteIdentity !== null || v.coordinateValues.length)
          )
            reject(
              'SUBJECT Measurement cannot contain a fake Site or coordinates.',
            );
          if (
            v.granularity === 'SITE' &&
            (!v.siteIdentity ||
              !catalog.coordinateSets.some(
                (s) =>
                  s.measurementOperationDefinitionIds.includes(
                    d!.measurementOperationDefinitionId,
                  ) &&
                  v.coordinateValues.length > 0 &&
                  v.coordinateValues.every((c) =>
                    s.coordinateDefinitionIds.includes(
                      c.coordinateDefinitionId,
                    ),
                  ),
              ))
          )
            reject(
              'SITE Measurement requires configured coordinates under its Subject.',
            );
          if (
            (d!.datasetOrigin === 'SOURCE' &&
              (v.acquisitionMethod === 'DERIVED' ||
                v.sourceMeasurementValueIds.length)) ||
            (d!.datasetOrigin === 'DERIVED' &&
              v.acquisitionMethod !== 'DERIVED')
          )
            reject('RAW and DERIVED provenance must remain distinct.');
        }
        const eids = await identities(
            session,
            'measurement_execution',
            record.executions,
          ),
          dids = await identities(
            session,
            'measurement_dataset',
            record.datasets,
          ),
          vids = await identities(session, 'measurement_value', record.values),
          sids = await identities(
            session,
            'measurement_summary',
            record.summaries,
          ),
          validids = await identities(
            session,
            'measurement_validity_decision',
            record.validityDecisions,
          );
        await bulk(
          session,
          'measurement_execution',
          record.executions
            .filter((e) => eids.get(e.id)!.fresh)
            .map((e) => ({
              id: eids.get(e.id)!.id,
              domain_id: e.id,
              run_id: run.run_id,
              package_version_id: run.configuration_package_version_id,
              operation_revision_id: e.measurementOperationDefinitionId,
              payload: JSON.stringify(e),
              content_hash: hash(e),
            })),
        );
        await bulk(
          session,
          'measurement_execution_subject',
          record.executions.flatMap((e) =>
            e.subjectIds.map((s) => ({
              execution_id: eids.get(e.id)!.id,
              run_id: run.run_id,
              run_subject_id: subjectIds.get(s)!,
            })),
          ),
        );
        await bulk(
          session,
          'measurement_dataset',
          record.datasets
            .filter((d) => dids.get(d.id)!.fresh)
            .map((d) => ({
              id: dids.get(d.id)!.id,
              domain_id: d.id,
              run_id: run.run_id,
              execution_id: eids.get(d.measurementExecutionId!)!.id,
              actual_event_id: d.executionEventId
                ? actualIds.get(d.executionEventId)!.execution_event_id
                : null,
              package_version_id: run.configuration_package_version_id,
              operation_revision_id: d.measurementOperationDefinitionId,
              origin: d.datasetOrigin,
              payload: JSON.stringify(d),
              content_hash: hash(d),
            })),
        );
        const siteKeys = new Map(
          record.values
            .filter((v) => v.siteIdentity)
            .map((v) => [
              `${v.subjectId}\u0000${v.siteIdentity}`,
              {
                id: randomUUID(),
                run_subject_id: subjectIds.get(v.subjectId)!,
                site_identity: v.siteIdentity!,
              },
            ]),
        );
        await bulk(session, 'measurement_site', [...siteKeys.values()]);
        const sites = await session.query<{
          id: string;
          run_subject_id: string;
          site_identity: string;
        }>(
          'SELECT * FROM measurement_site WHERE run_subject_id=ANY($1::uuid[])',
          [[...subjectIds.values()]],
        );
        const siteId = (v: SubjectMeasurementResultSet['values'][number]) =>
          sites.rows.find(
            (s) =>
              s.run_subject_id === subjectIds.get(v.subjectId) &&
              s.site_identity === v.siteIdentity,
          )?.id ?? null;
        await bulk(
          session,
          'measurement_value',
          record.values
            .filter((v) => vids.get(v.id)!.fresh)
            .map((v) => ({
              id: vids.get(v.id)!.id,
              domain_id: v.id,
              run_id: run.run_id,
              dataset_id: dids.get(v.datasetId)!.id,
              run_subject_id: subjectIds.get(v.subjectId)!,
              package_version_id: run.configuration_package_version_id,
              parameter_id: v.parameterDefinitionId,
              unit_id: v.unitDefinitionId,
              grain: v.granularity,
              site_id: siteId(v),
              value_type: v.value.dataType,
              number_value:
                v.value.dataType === 'NUMBER' ? v.value.value : null,
              text_value:
                v.value.dataType === 'TEXT' || v.value.dataType === 'SELECT'
                  ? v.value.value
                  : null,
              boolean_value:
                v.value.dataType === 'BOOLEAN' ? v.value.value : null,
              metadata: JSON.stringify({
                physicalSubjectId: v.physicalSubjectId,
                observedAt: v.observedAt,
                sourceParameterReference: v.sourceParameterReference,
                acquisitionMethod: v.acquisitionMethod,
                adHocParameter: v.adHocParameter,
              }),
              content_hash: hash(v),
            })),
        );
        await bulk(
          session,
          'measurement_coordinate_value',
          record.values.flatMap((v) =>
            v.coordinateValues.map((c, i) => ({
              value_id: vids.get(v.id)!.id,
              ordinal: i,
              package_version_id: run.configuration_package_version_id,
              definition_id: c.coordinateDefinitionId,
              coordinate_value: c.value,
            })),
          ),
        );
        const sourceIds = [
          ...new Set(
            record.values
              .flatMap((v) => v.sourceMeasurementValueIds)
              .concat(
                record.summaries.flatMap((s) => s.sourceMeasurementIds),
                record.validityDecisions.map((v) => v.measurementValueId),
              ),
          ),
        ];
        const sourceRows = await session.query<{
          id: string;
          domain_id: string;
          run_id: string;
        }>(
          'SELECT id,domain_id,run_id FROM measurement_value WHERE domain_id=ANY($1::text[])',
          [sourceIds],
        );
        const sourceMap = new Map(sourceRows.rows.map((v) => [v.domain_id, v]));
        const source = (id: string) => {
          const v = sourceMap.get(id);
          if (!v || v.run_id !== run.run_id)
            return reject(
              'Measurement source/value reference is unavailable in this Run.',
            );
          return v.id;
        };
        await bulk(
          session,
          'measurement_value_lineage',
          record.values.flatMap((v) =>
            v.sourceMeasurementValueIds.map((id, i) => ({
              value_id: vids.get(v.id)!.id,
              source_value_id: source(id),
              ordinal: i,
            })),
          ),
        );
        for (const s of record.summaries) {
          const d = datasets.get(s.datasetId),
            p = catalog.parameters.find(
              (p) => p.id === s.parameterDefinitionId,
            );
          if (
            !d ||
            !subjectIds.has(s.subjectId) ||
            !p ||
            p.unitId !== s.unitDefinitionId ||
            p.measurementOperationDefinitionId !==
              d.measurementOperationDefinitionId
          )
            reject('Summary references are incompatible.');
        }
        await bulk(
          session,
          'measurement_summary',
          record.summaries
            .filter((s) => sids.get(s.id)!.fresh)
            .map((s) => ({
              id: sids.get(s.id)!.id,
              domain_id: s.id,
              dataset_id: dids.get(s.datasetId)!.id,
              run_subject_id: subjectIds.get(s.subjectId)!,
              parameter_id: s.parameterDefinitionId,
              payload: JSON.stringify(s),
              content_hash: hash(s),
            })),
        );
        await bulk(
          session,
          'measurement_summary_source',
          record.summaries.flatMap((s) =>
            s.sourceMeasurementIds.map((id, i) => ({
              summary_id: sids.get(s.id)!.id,
              value_id: source(id),
              ordinal: i,
            })),
          ),
        );
        await bulk(
          session,
          'measurement_validity_decision',
          record.validityDecisions
            .filter((v) => validids.get(v.id)!.fresh)
            .map((v) => ({
              id: validids.get(v.id)!.id,
              domain_id: v.id,
              value_id: source(v.measurementValueId),
              state: v.state,
              decided_at: v.decidedAt,
              payload: JSON.stringify(v),
              content_hash: hash(v),
            })),
        );
        await session.query(
          'INSERT INTO measurement_state VALUES($1,$2) ON CONFLICT(run_id) DO UPDATE SET aggregate_version=EXCLUDED.aggregate_version',
          [run.run_id, version + 1],
        );
        const stored = await readSnapshot(session, run.run_id);
        await session.query(
          'INSERT INTO measurement_command_receipt VALUES($1,$2,$3,$4,$5::jsonb)',
          [
            run.run_id,
            command.commandId,
            requestHash,
            version + 1,
            JSON.stringify(idsOf(stored)),
          ],
        );
        return { version: version + 1, record: stored };
      });
    } catch (cause) {
      if (cause instanceof ApplicationError) throw cause;
      throw new ApplicationError(
        'PERSISTENCE',
        'Measurement could not be saved. No partial change was committed.',
        { cause },
      );
    }
  }
}
