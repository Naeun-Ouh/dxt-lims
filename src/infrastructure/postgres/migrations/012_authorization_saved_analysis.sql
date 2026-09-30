BEGIN;
ALTER TABLE saved_analysis_access ADD COLUMN visibility text NOT NULL DEFAULT 'PRIVATE' CHECK(visibility IN ('PRIVATE','STUDY','DEPARTMENT','AREA'));
ALTER TABLE saved_analysis_access ADD COLUMN audience_study_id uuid REFERENCES study(study_id);
ALTER TABLE saved_analysis_access ADD COLUMN audience_unit_id text REFERENCES auth_org_unit(id);
ALTER TABLE saved_analysis_access ADD COLUMN created_by_principal_id text REFERENCES auth_principal(id);
ALTER TABLE saved_analysis_access ADD CONSTRAINT saved_analysis_audience_shape CHECK(
 (visibility='PRIVATE' AND audience_study_id IS NULL AND audience_unit_id IS NULL) OR
 (visibility='STUDY' AND audience_study_id IS NOT NULL AND audience_unit_id IS NULL) OR
 (visibility IN ('DEPARTMENT','AREA') AND audience_study_id IS NULL AND audience_unit_id IS NOT NULL));
CREATE FUNCTION protect_saved_analysis_creator() RETURNS trigger LANGUAGE plpgsql AS $$
 BEGIN IF NEW.created_by_principal_id IS DISTINCT FROM OLD.created_by_principal_id THEN RAISE EXCEPTION 'Saved Analysis creation provenance is immutable'; END IF; RETURN NEW; END
$$;
CREATE TRIGGER saved_analysis_creator_immutable BEFORE UPDATE ON saved_analysis_access FOR EACH ROW EXECUTE FUNCTION protect_saved_analysis_creator();
CREATE TABLE saved_analysis_access_grant(
 id text PRIMARY KEY,
 saved_analysis_id uuid NOT NULL REFERENCES saved_analysis(id),
 principal_id text REFERENCES auth_principal(id),
 unit_id text REFERENCES auth_org_unit(id),
 action text NOT NULL CHECK(action IN ('VIEW_SAVED_ANALYSIS','EDIT_SAVED_ANALYSIS','SHARE_SAVED_ANALYSIS','MANAGE_SAVED_ANALYSIS_ACCESS')),
 granted_by text NOT NULL REFERENCES auth_principal(id),
 active boolean NOT NULL DEFAULT true,
 expires_at timestamptz,
 CHECK((principal_id IS NULL)<>(unit_id IS NULL))
);
CREATE INDEX saved_analysis_grant_resource_action ON saved_analysis_access_grant(saved_analysis_id,action) WHERE active;
CREATE FUNCTION dxt_saved_analysis_audience(pid text,aid uuid,act text) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM auth_principal WHERE id=pid AND active) AND EXISTS(
 SELECT 1 FROM saved_analysis_access a WHERE a.saved_analysis_id=aid AND (
 (a.owner_principal_id=pid AND act IN ('VIEW_SAVED_ANALYSIS','EDIT_SAVED_ANALYSIS','SHARE_SAVED_ANALYSIS'))
 OR EXISTS(SELECT 1 FROM saved_analysis_access_grant g WHERE g.saved_analysis_id=aid AND g.action=act AND g.active AND (g.expires_at IS NULL OR g.expires_at>statement_timestamp()) AND
 (g.principal_id=pid OR EXISTS(SELECT 1 FROM auth_membership m WHERE m.principal_id=pid AND NOT m.managed AND m.unit_id=g.unit_id)))
 OR (act='VIEW_SAVED_ANALYSIS' AND (
 (a.visibility='STUDY' AND dxt_study_access_reason(pid,a.audience_study_id,'VIEW_STUDY') IN ('RESPONSIBLE_USER','RESPONSIBLE_DEPARTMENT','AREA_SCOPE','MANAGED_ORG_SCOPE','EXPLICIT_GRANT','ADMIN'))
 OR (a.visibility IN ('DEPARTMENT','AREA') AND EXISTS(SELECT 1 FROM auth_membership m JOIN auth_org_unit u ON u.id=m.unit_id WHERE m.principal_id=pid AND NOT m.managed AND u.id=a.audience_unit_id AND u.kind=a.visibility))
 ))))
$$;
-- Same source predicate is used for list/detail, complete replacement saves and audience commands.
CREATE FUNCTION dxt_saved_analysis_sources(pid text,sid uuid,cfg jsonb,refs jsonb) RETURNS boolean LANGUAGE sql STABLE AS $$
 WITH RECURSIVE observations(id) AS (
 SELECT v.id FROM measurement_value v JOIN measurement_dataset d ON d.id=v.dataset_id
 WHERE d.domain_id IN (SELECT jsonb_array_elements_text(cfg->'datasetIds'))
 OR EXISTS(SELECT 1 FROM measurement_summary_source ms JOIN measurement_summary m ON m.id=ms.summary_id WHERE ms.value_id=v.id AND EXISTS(SELECT 1 FROM jsonb_array_elements(refs) ref WHERE ref->>'representativeResultId'=m.domain_id))
 UNION SELECT l.source_value_id FROM measurement_value_lineage l JOIN observations o ON o.id=l.value_id
 )
 SELECT EXISTS(SELECT 1 FROM auth_principal WHERE id=pid AND active)
 AND dxt_study_access_reason(pid,sid,'VIEW_STUDY') IN ('RESPONSIBLE_USER','RESPONSIBLE_DEPARTMENT','AREA_SCOPE','MANAGED_ORG_SCOPE','EXPLICIT_GRANT','ADMIN')
 AND jsonb_array_length(COALESCE(refs,'[]'))>0
 AND jsonb_array_length(COALESCE(cfg->'runIds','[]'))>0
 AND jsonb_array_length(COALESCE(cfg->'datasetIds','[]'))>0
 AND jsonb_array_length(COALESCE(cfg->'subjectIds','[]'))>0
 AND jsonb_array_length(COALESCE(cfg->'parameterIds','[]'))>0
 AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements_text(cfg->'runIds') x(id) WHERE NOT EXISTS(
 SELECT 1 FROM experiment_run r WHERE r.run_domain_id=x.id AND dxt_study_access_reason(pid,r.study_id,'VIEW_MEASUREMENT') IN ('RESPONSIBLE_USER','RESPONSIBLE_DEPARTMENT','AREA_SCOPE','MANAGED_ORG_SCOPE','EXPLICIT_GRANT','ADMIN')))
 AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements_text(cfg->'datasetIds') x(id) WHERE NOT EXISTS(
 SELECT 1 FROM measurement_dataset d JOIN experiment_run r ON r.run_id=d.run_id WHERE d.domain_id=x.id AND cfg->'runIds' ? r.run_domain_id
 AND dxt_study_access_reason(pid,r.study_id,'VIEW_MEASUREMENT') IN ('RESPONSIBLE_USER','RESPONSIBLE_DEPARTMENT','AREA_SCOPE','MANAGED_ORG_SCOPE','EXPLICIT_GRANT','ADMIN')))
 AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements_text(cfg->'subjectIds') x(id) WHERE NOT EXISTS(
 SELECT 1 FROM subject s JOIN run_subject rs USING(subject_id) JOIN experiment_run r USING(run_id) WHERE s.subject_domain_id=x.id AND cfg->'runIds' ? r.run_domain_id))
 AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements_text(cfg->'parameterIds') x(id) WHERE NOT EXISTS(
 SELECT 1 FROM measurement_reference m JOIN measurement_dataset d ON d.package_version_id=m.package_version_id WHERE cfg->'datasetIds' ? d.domain_id AND m.kind='parameters' AND m.revision_id=x.id))
 AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(refs) s WHERE NOT EXISTS(
 SELECT 1 FROM measurement_dataset d JOIN experiment_run r ON r.run_id=d.run_id JOIN study st USING(study_id)
 JOIN measurement_execution e ON e.id=d.execution_id
 JOIN run_subject rs ON rs.run_id=r.run_id JOIN subject sub USING(subject_id)
 WHERE d.domain_id=s->>'datasetId' AND r.run_domain_id=s->>'runId' AND st.series_slug=s->>'studyId'
 AND sub.subject_domain_id=s->>'subjectId' AND e.domain_id=s->>'measurementExecutionId'
 AND cfg->'runIds' ? (s->>'runId') AND cfg->'datasetIds' ? (s->>'datasetId')
 AND cfg->'subjectIds' ? (s->>'subjectId') AND cfg->'parameterIds' ? (s->>'parameterId')
 AND dxt_study_access_reason(pid,r.study_id,'VIEW_MEASUREMENT') IN ('RESPONSIBLE_USER','RESPONSIBLE_DEPARTMENT','AREA_SCOPE','MANAGED_ORG_SCOPE','EXPLICIT_GRANT','ADMIN')
 AND EXISTS(SELECT 1 FROM measurement_value v WHERE v.dataset_id=d.id AND v.run_subject_id=rs.run_subject_id AND v.parameter_id=s->>'parameterId')
 AND (s->>'representativeResultId' IS NULL OR EXISTS(SELECT 1 FROM measurement_summary m WHERE m.dataset_id=d.id AND m.domain_id=s->>'representativeResultId' AND m.run_subject_id=rs.run_subject_id AND m.parameter_id=s->>'parameterId'))
 ))
 AND NOT EXISTS(SELECT 1 FROM observations o JOIN measurement_value v ON v.id=o.id JOIN experiment_run r ON r.run_id=v.run_id WHERE dxt_study_access_reason(pid,r.study_id,'VIEW_MEASUREMENT') NOT IN ('RESPONSIBLE_USER','RESPONSIBLE_DEPARTMENT','AREA_SCOPE','MANAGED_ORG_SCOPE','EXPLICIT_GRANT','ADMIN'))
$$;
COMMIT;
