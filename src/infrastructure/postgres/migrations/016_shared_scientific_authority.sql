-- Shared prerequisite only; no grant backfill, resource policy change or criteria/Sample schema.
BEGIN;
CREATE OR REPLACE FUNCTION dxt_explicit_scientific_access_reason(pid text,sid uuid,act text)
RETURNS text LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
 WITH visibility AS (SELECT public.dxt_study_access_reason(pid,sid,'VIEW_RUN') reason)
 SELECT CASE
 WHEN act IS NULL OR act NOT IN ('CREATE_RUN','EDIT_RUN_PLAN','RECORD_ACTUAL','RECORD_MEASUREMENT',
  'MANAGE_MEASUREMENT_VALIDITY','AUTHOR_EVALUATION','AUTHOR_DECISION','AUTHOR_NEXT_ACTION','MANAGE_REASONING_CONTEXT') THEN 'MISSING_CAPABILITY'
 WHEN NOT EXISTS(SELECT 1 FROM public.auth_principal WHERE id=pid AND active) THEN 'CONTEXT_UNAVAILABLE'
 WHEN reason IS NULL THEN 'CONTEXT_UNAVAILABLE'
 WHEN reason NOT IN ('RESPONSIBLE_USER','RESPONSIBLE_DEPARTMENT','AREA_SCOPE','MANAGED_ORG_SCOPE','EXPLICIT_GRANT','ADMIN') THEN reason
 WHEN EXISTS(SELECT 1 FROM public.study_access_grant g WHERE g.study_id=sid AND g.action=act AND g.active
  AND (g.expires_at IS NULL OR g.expires_at>statement_timestamp())
  AND (g.principal_id=pid OR EXISTS(SELECT 1 FROM public.auth_membership m
   WHERE m.principal_id=pid AND NOT m.managed AND m.unit_id=g.unit_id))) THEN 'EXPLICIT_GRANT'
 ELSE 'MISSING_CAPABILITY' END FROM visibility
$$;

REVOKE ALL ON FUNCTION dxt_explicit_scientific_access_reason(text,uuid,text) FROM PUBLIC;
COMMIT;
