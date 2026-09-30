BEGIN;
ALTER TABLE study_access_grant DROP CONSTRAINT study_access_grant_action_check;
ALTER TABLE study_access_grant ADD CONSTRAINT study_access_grant_action_check CHECK(action IN ('VIEW_STUDY','VIEW_RUN','EDIT_STUDY','EDIT_STUDY_SETUP','CREATE_RUN','EDIT_RUN_PLAN','MANAGE_ACCESS','VIEW_EXECUTION','RECORD_ACTUAL','VIEW_MEASUREMENT','RECORD_MEASUREMENT','MANAGE_MEASUREMENT_VALIDITY','VIEW_EVALUATION','AUTHOR_EVALUATION','VIEW_DECISION','AUTHOR_DECISION','AUTHOR_NEXT_ACTION'));
ALTER FUNCTION dxt_study_access_reason(text,uuid,text) RENAME TO dxt_study_access_reason_v1;
CREATE FUNCTION dxt_study_access_reason(pid text,sid uuid,act text) RETURNS text LANGUAGE sql STABLE AS $$
 WITH visibility AS (SELECT dxt_study_access_reason_v1(pid,sid,'VIEW_RUN') reason)
 SELECT CASE
 WHEN act IN ('VIEW_EXECUTION','VIEW_MEASUREMENT','VIEW_EVALUATION','VIEW_DECISION') THEN reason
 WHEN act IN ('RECORD_ACTUAL','RECORD_MEASUREMENT','MANAGE_MEASUREMENT_VALIDITY','AUTHOR_EVALUATION','AUTHOR_DECISION','AUTHOR_NEXT_ACTION') THEN
 CASE WHEN reason IN ('OUT_OF_SCOPE','CONTEXT_UNAVAILABLE') THEN reason
 WHEN EXISTS(SELECT 1 FROM study_access WHERE study_id=sid AND responsible_user_id=pid) THEN 'RESPONSIBLE_USER'
 WHEN EXISTS(SELECT 1 FROM study_access_grant g WHERE g.study_id=sid AND g.action=act AND g.active AND (g.expires_at IS NULL OR g.expires_at>statement_timestamp()) AND (g.principal_id=pid OR EXISTS(SELECT 1 FROM auth_membership m WHERE m.principal_id=pid AND NOT m.managed AND m.unit_id=g.unit_id))) THEN 'EXPLICIT_GRANT'
 ELSE 'MISSING_CAPABILITY' END
 ELSE dxt_study_access_reason_v1(pid,sid,act) END FROM visibility
$$;
-- Explicit trusted ownership mapping only; legacy display-name ownership is not identity.
-- No sharing commands/audiences are introduced by this read-only boundary.
CREATE TABLE saved_analysis_access(saved_analysis_id uuid PRIMARY KEY REFERENCES saved_analysis(id),owner_principal_id text NOT NULL REFERENCES auth_principal(id));
CREATE INDEX saved_analysis_access_owner ON saved_analysis_access(owner_principal_id);
COMMIT;
