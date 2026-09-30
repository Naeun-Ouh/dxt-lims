BEGIN;
CREATE TABLE auth_principal(id text PRIMARY KEY, user_id text NOT NULL UNIQUE, active boolean NOT NULL DEFAULT true, role text NOT NULL CHECK(role IN ('GENERAL_USER','ADMIN')));
CREATE TABLE auth_org_unit(id text PRIMARY KEY, kind text NOT NULL CHECK(kind IN ('DEPARTMENT','PART','TEAM','AREA','MODULE')), parent_id text REFERENCES auth_org_unit(id));
CREATE TABLE auth_membership(principal_id text REFERENCES auth_principal(id), unit_id text REFERENCES auth_org_unit(id), managed boolean NOT NULL DEFAULT false, PRIMARY KEY(principal_id,unit_id,managed));
CREATE TABLE study_access(study_id uuid PRIMARY KEY REFERENCES study(study_id), responsible_user_id text NOT NULL REFERENCES auth_principal(id), responsible_department_id text NOT NULL REFERENCES auth_org_unit(id), area_id text REFERENCES auth_org_unit(id), visibility text NOT NULL DEFAULT 'RESPONSIBLE_DEPARTMENT' CHECK(visibility IN ('PRIVATE','RESPONSIBLE_DEPARTMENT','AREA')), version bigint NOT NULL DEFAULT 1 CHECK(version>0));
CREATE TABLE study_module_access(study_id uuid REFERENCES study_access(study_id), module_id text REFERENCES auth_org_unit(id), PRIMARY KEY(study_id,module_id));
CREATE TABLE study_access_grant(id text PRIMARY KEY, study_id uuid NOT NULL REFERENCES study_access(study_id), principal_id text REFERENCES auth_principal(id), unit_id text REFERENCES auth_org_unit(id), action text NOT NULL CHECK(action IN ('VIEW_STUDY','VIEW_RUN','EDIT_STUDY','EDIT_STUDY_SETUP','CREATE_RUN','EDIT_RUN_PLAN','MANAGE_ACCESS')), granted_by text NOT NULL REFERENCES auth_principal(id), active boolean NOT NULL DEFAULT true, expires_at timestamptz, CHECK((principal_id IS NULL) <> (unit_id IS NULL)));
CREATE INDEX auth_grant_study_action ON study_access_grant(study_id,action) WHERE active;
CREATE INDEX auth_member_unit ON auth_membership(unit_id,principal_id);
CREATE INDEX auth_access_department ON study_access(responsible_department_id);
CREATE INDEX auth_access_area ON study_access(area_id) WHERE area_id IS NOT NULL;
CREATE INDEX auth_org_parent ON auth_org_unit(parent_id);
-- One predicate governs detail and SQL lists. Missing context never grants access.
CREATE FUNCTION dxt_study_access_reason(pid text, sid uuid, act text) RETURNS text LANGUAGE sql STABLE AS $$
 WITH RECURSIVE managed(id) AS (
  SELECT m.unit_id FROM auth_membership m JOIN auth_org_unit o ON o.id=m.unit_id WHERE m.principal_id=pid AND m.managed AND o.kind IN ('PART','TEAM','DEPARTMENT')
  UNION SELECT o.id FROM auth_org_unit o JOIN managed d ON o.parent_id=d.id
 ), ctx AS (
 SELECT p.role,a.* FROM auth_principal p CROSS JOIN study_access a WHERE p.id=pid AND p.active AND a.study_id=sid
 ), grants AS (
 SELECT g.action FROM study_access_grant g WHERE g.study_id=sid AND g.active AND (g.expires_at IS NULL OR g.expires_at>statement_timestamp()) AND
 (g.principal_id=pid OR EXISTS(SELECT 1 FROM auth_membership m WHERE m.principal_id=pid AND NOT m.managed AND m.unit_id=g.unit_id))
 ), visible AS (
 SELECT *, CASE
 WHEN role='ADMIN' THEN 'ADMIN'
 WHEN responsible_user_id=pid THEN 'RESPONSIBLE_USER'
 WHEN EXISTS(SELECT 1 FROM grants WHERE action IN ('VIEW_STUDY','VIEW_RUN')) THEN 'EXPLICIT_GRANT'
 WHEN visibility<>'PRIVATE' AND EXISTS(SELECT 1 FROM auth_membership m WHERE m.principal_id=pid AND NOT m.managed AND m.unit_id=responsible_department_id) THEN 'RESPONSIBLE_DEPARTMENT'
 WHEN visibility='AREA' AND area_id IS NOT NULL AND EXISTS(SELECT 1 FROM auth_membership m WHERE m.principal_id=pid AND NOT m.managed AND m.unit_id=area_id) THEN 'AREA_SCOPE'
 WHEN visibility<>'PRIVATE' AND (responsible_department_id IN (SELECT id FROM managed) OR EXISTS(SELECT 1 FROM study_module_access sm JOIN auth_membership m ON m.unit_id=sm.module_id WHERE sm.study_id=sid AND m.principal_id=pid AND m.managed)) THEN 'MANAGED_ORG_SCOPE'
 ELSE 'OUT_OF_SCOPE' END AS view_reason FROM ctx
 ) SELECT COALESCE((SELECT CASE
 WHEN act NOT IN ('VIEW_STUDY','VIEW_RUN','EDIT_STUDY','EDIT_STUDY_SETUP','CREATE_RUN','EDIT_RUN_PLAN','MANAGE_ACCESS') THEN 'UNSUPPORTED_ACTION'
 WHEN view_reason='OUT_OF_SCOPE' THEN view_reason
 WHEN act IN ('VIEW_STUDY','VIEW_RUN') THEN view_reason
 WHEN act='MANAGE_ACCESS' AND role='ADMIN' THEN 'ADMIN'
 WHEN responsible_user_id=pid AND act<>'MANAGE_ACCESS' THEN 'RESPONSIBLE_USER'
 WHEN EXISTS(SELECT 1 FROM grants WHERE action=act) THEN 'EXPLICIT_GRANT'
 ELSE 'MISSING_CAPABILITY' END FROM visible),'CONTEXT_UNAVAILABLE')
$$;
COMMIT;
