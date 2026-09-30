BEGIN;
-- Explicit mapping: a configuration owner identifier is not an organization identifier.
CREATE TABLE configuration_access_scope (
 scope_kind text NOT NULL CHECK(scope_kind IN ('GLOBAL','AREA','TEAM','USER')),
 scope_owner_id text NOT NULL,
 unit_id text REFERENCES auth_org_unit(id),
 principal_id text REFERENCES auth_principal(id),
 PRIMARY KEY(scope_kind,scope_owner_id),
 CHECK((scope_kind='GLOBAL' AND scope_owner_id='' AND unit_id IS NULL AND principal_id IS NULL)
 OR (scope_kind IN ('AREA','TEAM') AND scope_owner_id<>'' AND unit_id IS NOT NULL AND principal_id IS NULL)
 OR (scope_kind='USER' AND scope_owner_id<>'' AND unit_id IS NULL AND principal_id IS NOT NULL))
);
CREATE TABLE configuration_access_grant (
 id text PRIMARY KEY,
 scope_kind text NOT NULL,
 scope_owner_id text NOT NULL,
 principal_id text REFERENCES auth_principal(id),
 unit_id text REFERENCES auth_org_unit(id),
 action text NOT NULL CHECK(action IN ('VIEW_CONFIGURATION','AUTHOR_DEFINITION','MANAGE_APPLICABILITY','CREATE_PACKAGE_VERSION','ACTIVATE_PACKAGE_VERSION')),
 granted_by text NOT NULL REFERENCES auth_principal(id),
 active boolean NOT NULL DEFAULT true,
 expires_at timestamptz,
 FOREIGN KEY(scope_kind,scope_owner_id) REFERENCES configuration_access_scope,
 CHECK((principal_id IS NULL)<>(unit_id IS NULL))
);
CREATE INDEX configuration_grant_scope_action ON configuration_access_grant(scope_kind,scope_owner_id,action) WHERE active;
CREATE FUNCTION dxt_configuration_allowed(pid text,kind text,owner text,act text) RETURNS boolean LANGUAGE sql STABLE AS $$
 WITH RECURSIVE managed(id) AS (
 SELECT unit_id FROM auth_membership WHERE principal_id=pid AND managed
 UNION SELECT o.id FROM auth_org_unit o JOIN managed m ON o.parent_id=m.id
 ), resolved AS (
 SELECT s.* FROM configuration_access_scope s
 WHERE s.scope_kind=kind AND s.scope_owner_id=owner
 AND (kind NOT IN ('AREA','TEAM') OR EXISTS(SELECT 1 FROM auth_org_unit o WHERE o.id=s.unit_id AND o.kind=$2))
 ), grants AS (
 SELECT g.action FROM configuration_access_grant g JOIN resolved s USING(scope_kind,scope_owner_id)
 WHERE g.active AND (g.expires_at IS NULL OR g.expires_at>statement_timestamp())
 AND (g.principal_id=pid OR EXISTS(SELECT 1 FROM auth_membership m WHERE m.principal_id=pid AND NOT m.managed AND m.unit_id=g.unit_id))
 )
 SELECT EXISTS(SELECT 1 FROM auth_principal WHERE id=pid AND active)
 AND EXISTS(SELECT 1 FROM resolved s WHERE
 EXISTS(SELECT 1 FROM grants WHERE action=act)
 OR (act='VIEW_CONFIGURATION' AND (
 EXISTS(SELECT 1 FROM grants) OR kind='GLOBAL' OR s.principal_id=pid
 OR EXISTS(SELECT 1 FROM auth_principal WHERE id=pid AND role='ADMIN')
 OR EXISTS(SELECT 1 FROM auth_membership WHERE principal_id=pid AND unit_id=s.unit_id)
 OR s.unit_id IN(SELECT id FROM managed))))
$$;
ALTER TABLE study_access_grant DROP CONSTRAINT study_access_grant_action_check;
ALTER TABLE study_access_grant ADD CONSTRAINT study_access_grant_action_check CHECK(action IN ('VIEW_STUDY','VIEW_RUN','EDIT_STUDY','EDIT_STUDY_SETUP','CREATE_RUN','EDIT_RUN_PLAN','MANAGE_ACCESS','VIEW_EXECUTION','RECORD_ACTUAL','VIEW_MEASUREMENT','RECORD_MEASUREMENT','MANAGE_MEASUREMENT_VALIDITY','VIEW_EVALUATION','AUTHOR_EVALUATION','VIEW_DECISION','AUTHOR_DECISION','AUTHOR_NEXT_ACTION','MANAGE_REASONING_CONTEXT'));
ALTER FUNCTION dxt_study_access_reason(text,uuid,text) RENAME TO dxt_study_access_reason_v2;
CREATE FUNCTION dxt_study_access_reason(pid text,sid uuid,act text) RETURNS text LANGUAGE sql STABLE AS $$
 SELECT CASE WHEN act<>'MANAGE_REASONING_CONTEXT' THEN dxt_study_access_reason_v2(pid,sid,act)
 WHEN dxt_study_access_reason_v2(pid,sid,'VIEW_STUDY') IN ('OUT_OF_SCOPE','CONTEXT_UNAVAILABLE') THEN 'OUT_OF_SCOPE'
 WHEN EXISTS(SELECT 1 FROM auth_principal WHERE id=pid AND active) AND EXISTS(
 SELECT 1 FROM study_access_grant g WHERE g.study_id=sid AND g.action=act AND g.active
 AND (g.expires_at IS NULL OR g.expires_at>statement_timestamp())
 AND (g.principal_id=pid OR EXISTS(SELECT 1 FROM auth_membership m WHERE m.principal_id=pid AND NOT m.managed AND m.unit_id=g.unit_id))) THEN 'EXPLICIT_GRANT'
 ELSE 'MISSING_CAPABILITY' END
$$;
COMMIT;
