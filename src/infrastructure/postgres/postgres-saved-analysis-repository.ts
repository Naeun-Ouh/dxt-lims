import { createHash, randomUUID } from 'node:crypto';
import { savedAnalysisViewSchema, type SavedAnalysisView } from '@/src/domain/analysis';
import { ApplicationError, type RepositoryCommand, type SavedAnalysisRepository } from '@/src/application/repository-ports';
import type { SqlDatabase } from './sql-database';

const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, canonical(v)])) : value;

/** Stores only the frozen configuration contract; observations are resolved by MeasurementRepository. */
export class PostgresSavedAnalysisRepository implements SavedAnalysisRepository {
  constructor(private readonly database: SqlDatabase) {}
  private async read(id?: string) {
    const result = await this.database.query<{ configuration: Omit<SavedAnalysisView, 'sourceReferences'>; version: number; refs: SavedAnalysisView['sourceReferences'] }>(`
      SELECT a.configuration, a.version, COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'studyId',r.study_domain_id,'runId',r.run_domain_id,'subjectId',r.subject_domain_id,
        'measurementExecutionId',r.execution_domain_id,'datasetId',r.dataset_domain_id,
        'parameterId',r.parameter_domain_id,'representativeResultId',r.representative_domain_id
      ) ORDER BY r.ordinal) FROM saved_analysis_source_ref r WHERE r.saved_analysis_id=a.id),'[]'::jsonb) AS refs
      FROM saved_analysis a WHERE a.version>0 ${id === undefined ? '' : 'AND a.domain_id=$1'} ORDER BY a.created_at DESC,a.domain_id`, id === undefined ? [] : [id]);
    return result.rows.map(row => ({ version: Number(row.version), record: savedAnalysisViewSchema.parse({ ...row.configuration, sourceReferences: row.refs }) }));
  }
  async list() { return (await this.read()).map(row => row.record); }
  async getState(id: string) { return (await this.read(id))[0] ?? { version: 0, record: null }; }
  async get(id: string) { return (await this.getState(id)).record; }
  async save(input: SavedAnalysisView, command: RepositoryCommand) {
    const parsed = savedAnalysisViewSchema.safeParse(input);
    if (!parsed.success) throw new ApplicationError('VALIDATION', 'Invalid Saved Analysis configuration.');
    const { sourceReferences, ...configuration } = parsed.data;
    const requestHash = createHash('sha256').update(JSON.stringify(canonical({ view: parsed.data, expectedVersion: command.expectedVersion ?? 0 }))).digest('hex');
    try {
      await this.database.transaction(async sql => {
        const study = await sql.query<{ study_id: string }>('SELECT study_id FROM study WHERE series_slug=$1', [configuration.studyId]);
        if (!study.rows[0]) throw new ApplicationError('NOT_FOUND', 'Saved Analysis Study is unavailable.');
        await sql.query('INSERT INTO saved_analysis(id,domain_id,study_id,version,configuration) VALUES($1,$2,$3,0,$4) ON CONFLICT(domain_id) DO NOTHING', [randomUUID(), configuration.id, study.rows[0].study_id, JSON.stringify(configuration)]);
        const current = (await sql.query<{ id: string; version: number }>('SELECT id,version FROM saved_analysis WHERE domain_id=$1 FOR UPDATE', [configuration.id])).rows[0];
        const receipt = (await sql.query<{ request_hash: string }>('SELECT request_hash FROM saved_analysis_command_receipt WHERE saved_analysis_id=$1 AND command_id=$2', [current.id, command.commandId])).rows[0];
        if (receipt) {
          if (receipt.request_hash !== requestHash) throw new ApplicationError('CONFLICT', 'Saved Analysis command identity was reused with different input.');
          return;
        }
        if (Number(current.version) !== (command.expectedVersion ?? 0)) throw new ApplicationError('CONFLICT', 'Saved Analysis changed. Reload its version before saving.');
        const version = Number(current.version) + 1;
        await sql.query('UPDATE saved_analysis SET configuration=$2,study_id=$3,version=$4,updated_at=now() WHERE id=$1', [current.id, JSON.stringify(configuration), study.rows[0].study_id, version]);
        await sql.query('DELETE FROM saved_analysis_source_ref WHERE saved_analysis_id=$1', [current.id]);
        for (const [ordinal, ref] of sourceReferences.entries()) await sql.query(`INSERT INTO saved_analysis_source_ref(saved_analysis_id,ordinal,study_domain_id,run_domain_id,subject_domain_id,execution_domain_id,dataset_domain_id,parameter_domain_id,representative_domain_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [current.id, ordinal, ref.studyId, ref.runId, ref.subjectId, ref.measurementExecutionId, ref.datasetId, ref.parameterId, ref.representativeResultId]);
        await sql.query('INSERT INTO saved_analysis_command_receipt VALUES($1,$2,$3,$4)', [current.id, command.commandId, requestHash, version]);
      });
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      throw new ApplicationError('PERSISTENCE', 'Saved Analysis could not be persisted.', { cause: error });
    }
  }
}
