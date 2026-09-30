BEGIN;
-- Resolve current memberships/grants once for the request, before any aggregate.
-- The same relation also supplies the existing detail policy: no dashboard policy fork.
CREATE FUNCTION dxt_discoverable_studies(pid text)
RETURNS TABLE(study_id uuid, reason text, personally_relevant boolean) LANGUAGE sql STABLE AS $$
 WITH RECURSIVE principal AS MATERIALIZED (
  SELECT id,role FROM auth_principal WHERE id=pid AND active
 ), memberships AS MATERIALIZED (
  SELECT m.unit_id,m.managed,o.kind FROM auth_membership m JOIN auth_org_unit o ON o.id=m.unit_id
  JOIN principal p ON p.id=m.principal_id
 ), managed(id) AS (
  SELECT unit_id FROM memberships WHERE managed AND kind IN ('PART','TEAM','DEPARTMENT')
  UNION SELECT o.id FROM auth_org_unit o JOIN managed m ON o.parent_id=m.id WHERE o.kind IN ('PART','TEAM','DEPARTMENT')
 ), grants AS MATERIALIZED (
  SELECT g.study_id,g.action FROM study_access_grant g CROSS JOIN principal
  WHERE g.active AND (g.expires_at IS NULL OR g.expires_at>statement_timestamp())
  AND (g.principal_id=pid OR g.unit_id IN (SELECT unit_id FROM memberships WHERE NOT managed))
 ), candidates AS (
  SELECT a.study_id, a.responsible_user_id=pid OR EXISTS(SELECT 1 FROM grants g WHERE g.study_id=a.study_id AND g.action<>'MANAGE_ACCESS') AS personally_relevant,
  CASE
   WHEN p.role='ADMIN' THEN 'ADMIN'
   WHEN a.responsible_user_id=pid THEN 'RESPONSIBLE_USER'
   WHEN EXISTS(SELECT 1 FROM grants g WHERE g.study_id=a.study_id AND g.action IN ('VIEW_STUDY','VIEW_RUN')) THEN 'EXPLICIT_GRANT'
   WHEN a.visibility<>'PRIVATE' AND a.responsible_department_id IN (SELECT unit_id FROM memberships WHERE NOT managed AND kind='DEPARTMENT') THEN 'RESPONSIBLE_DEPARTMENT'
   WHEN a.visibility='AREA' AND a.area_id IN (SELECT unit_id FROM memberships WHERE NOT managed AND kind='AREA') THEN 'AREA_SCOPE'
   WHEN a.visibility<>'PRIVATE' AND (a.responsible_department_id IN (SELECT id FROM managed) OR EXISTS(
    SELECT 1 FROM study_module_access sm JOIN memberships m ON m.unit_id=sm.module_id
    WHERE sm.study_id=a.study_id AND m.managed AND m.kind='MODULE'
   )) THEN 'MANAGED_ORG_SCOPE'
   ELSE 'OUT_OF_SCOPE' END AS reason
  FROM study_access a CROSS JOIN principal p
 ) SELECT study_id,reason,personally_relevant FROM candidates WHERE reason<>'OUT_OF_SCOPE'
$$;
CREATE OR REPLACE FUNCTION dxt_study_access_reason_v1(pid text, sid uuid, act text) RETURNS text LANGUAGE sql STABLE AS $$
 WITH ctx AS (
 SELECT p.role,a.* FROM auth_principal p CROSS JOIN study_access a WHERE p.id=pid AND p.active AND a.study_id=sid
 ), visible AS (
 SELECT ctx.*,COALESCE(d.reason,'OUT_OF_SCOPE') view_reason FROM ctx LEFT JOIN dxt_discoverable_studies(pid) d USING(study_id)
 ) SELECT COALESCE((SELECT CASE
 WHEN act NOT IN ('VIEW_STUDY','VIEW_RUN','EDIT_STUDY','EDIT_STUDY_SETUP','CREATE_RUN','EDIT_RUN_PLAN','MANAGE_ACCESS') THEN 'UNSUPPORTED_ACTION'
 WHEN view_reason='OUT_OF_SCOPE' THEN view_reason
 WHEN act IN ('VIEW_STUDY','VIEW_RUN') THEN view_reason
 WHEN act='MANAGE_ACCESS' AND role='ADMIN' THEN 'ADMIN'
 WHEN responsible_user_id=pid AND act<>'MANAGE_ACCESS' THEN 'RESPONSIBLE_USER'
 WHEN EXISTS(SELECT 1 FROM study_access_grant g WHERE g.study_id=sid AND g.action=act AND g.active AND (g.expires_at IS NULL OR g.expires_at>statement_timestamp()) AND (g.principal_id=pid OR EXISTS(SELECT 1 FROM auth_membership m WHERE m.principal_id=pid AND NOT m.managed AND m.unit_id=g.unit_id))) THEN 'EXPLICIT_GRANT'
 ELSE 'MISSING_CAPABILITY' END FROM visible),'CONTEXT_UNAVAILABLE')
$$;
COMMIT;
