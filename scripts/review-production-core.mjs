// Read-only freeze diagnostic. A successful test suite is not lifecycle acceptance.
// Usage: DATABASE_URL=... node scripts/review-production-core.mjs
import pg from 'pg';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required; no fixture fallback.');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const sql = await pool.connect();
try {
  await sql.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const studies = await sql.query(`SELECT s.series_slug, v.configuration_package_version_id,
    EXISTS(SELECT 1 FROM reasoning_context c WHERE c.study_id=s.study_id
      AND c.package_version_id=v.configuration_package_version_id) AS exact_reasoning_context
    FROM study s JOIN study_setup_version v ON v.setup_version_id=s.current_setup_version_id
    ORDER BY s.series_slug`);
  const runs = await sql.query(`SELECT s.series_slug, r.run_number, r.run_domain_id,
    r.configuration_package_version_id, r.aggregate_version,
    EXISTS(SELECT 1 FROM reasoning_context c WHERE c.study_id=r.study_id
      AND c.package_version_id=r.configuration_package_version_id) AS exact_reasoning_context,
    (SELECT count(*) FROM execution_event e WHERE e.run_id=r.run_id) AS executions,
    (SELECT count(*) FROM measurement_dataset d WHERE d.run_id=r.run_id) AS datasets,
    (SELECT count(*) FROM measurement_value m WHERE m.run_id=r.run_id) AS measurement_values,
    (SELECT count(*) FROM engineer_evaluation e WHERE e.run_id=r.run_id) AS evaluations,
    (SELECT count(*) FROM decision d WHERE d.run_id=r.run_id) AS decisions
    FROM experiment_run r JOIN study s ON s.study_id=r.study_id
    ORDER BY s.series_slug,r.run_number`);
  const views = await sql.query(`SELECT a.domain_id, a.configuration->>'name' AS name, a.version,
    (SELECT jsonb_agg(jsonb_build_object('run',r.run_domain_id,'subject',r.subject_domain_id,
      'dataset',r.dataset_domain_id,'parameter',r.parameter_domain_id,
      'representative',r.representative_domain_id) ORDER BY r.ordinal)
      FROM saved_analysis_source_ref r WHERE r.saved_analysis_id=a.id) AS exact_sources
    FROM saved_analysis a ORDER BY a.created_at`);
  const blockers = studies.rows.filter(s => !s.exact_reasoning_context);
  console.log(JSON.stringify({
    reviewedAt: new Date().toISOString(),
    scope: 'Read-only persisted context diagnostic; browser UX and full acceptance are separate.',
    currentStudyReasoningReady: blockers.length === 0,
    missingReasoningContexts: blockers,
    studies: studies.rows, runs: runs.rows, savedViews: views.rows,
  }, null, 2));
  await sql.query('COMMIT');
  if (blockers.length) process.exitCode = 1;
} finally {
  sql.release();
  await pool.end();
}
