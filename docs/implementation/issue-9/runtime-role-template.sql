-- Deployment template ONLY. Review role names/ownership before execution.
-- Do not grant this role to end users/browser roles. Trusted backend resolves actor;
-- actor arguments/GUCs supplied by arbitrary SQL clients are never authentication.
-- Existing public Run/repository permissions are managed by the existing backend role.
-- This fragment adds the precise Sample privileges used by runtime helpers.
CREATE ROLE dxt_sample_runtime NOLOGIN;
GRANT USAGE ON SCHEMA dxt_sample TO dxt_sample_runtime;
GRANT SELECT ON ALL TABLES IN SCHEMA dxt_sample TO dxt_sample_runtime;
GRANT INSERT ON dxt_sample.material_mapping,dxt_sample.run_assignment_link,
 dxt_sample.assignment_selection TO dxt_sample_runtime;
GRANT UPDATE ON dxt_sample.assignment_selection TO dxt_sample_runtime;
GRANT EXECUTE ON FUNCTION dxt_sample.lock_policy(),dxt_sample.allowed(text,text,text,text),
 dxt_sample.read_revisions(text,text),
 dxt_sample.write_revision(text,text,integer,jsonb) TO dxt_sample_runtime;
-- No CREATE, TRUNCATE, DELETE, access-grant DML, revision DML, ownership or BYPASSRLS.
-- The SQL writer is SECURITY DEFINER; aggregate/graph validation and policy locks
-- occur at sampleOperation before calling it. Grant EXECUTE only to this backend.
-- Function owner must retain required public policy SELECT/EXECUTE privileges.
