-- REVIEW PROPOSAL ONLY. Not registered in the runtime migration list.
-- Requires 001–015. Reserves 016 for Issue #16, but has no dependency on it.
BEGIN;
-- Legacy authorization functions call other public functions without qualification.
-- Only the migration owner may create objects in public before definer entrypoints activate.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
CREATE SCHEMA dxt_sample;
REVOKE ALL ON SCHEMA dxt_sample FROM PUBLIC;

CREATE TABLE dxt_sample.sample (
 id text PRIMARY KEY CHECK (length(btrim(id)) > 0),
 owning_org_id text NOT NULL REFERENCES public.auth_org_unit(id),
 sample_code text NOT NULL CHECK (length(btrim(sample_code)) > 0),
 name text NOT NULL CHECK (length(btrim(name)) > 0),
 -- No authoritative operational supplier/material master exists yet. NULL is honest.
 material_id text CHECK (material_id IS NULL),
 supplier_id text CHECK (supplier_id IS NULL),
 description text,
 status text NOT NULL CHECK (status IN ('Draft','Active','Retired')),
 created_at timestamptz NOT NULL,
 created_by text NOT NULL REFERENCES public.auth_principal(id),
 UNIQUE(owning_org_id,sample_code)
);
CREATE TABLE dxt_sample.revision (
 id text PRIMARY KEY CHECK (length(btrim(id)) > 0),
 sample_id text NOT NULL REFERENCES dxt_sample.sample(id),
 revision_number integer NOT NULL CHECK (revision_number > 0),
 metadata jsonb NOT NULL CHECK (jsonb_typeof(metadata)='object'),
 composition jsonb NOT NULL CHECK ((jsonb_typeof(composition)='object' AND
   jsonb_typeof(composition->'nodes')='array' AND jsonb_typeof(composition->'edges')='array') IS TRUE),
 properties jsonb NOT NULL CHECK (jsonb_typeof(properties)='array'),
 created_by text NOT NULL REFERENCES public.auth_principal(id),
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(sample_id,revision_number), UNIQUE(sample_id,id)
);
CREATE TABLE dxt_sample.access_grant (
 id text PRIMARY KEY,
 owning_org_id text NOT NULL REFERENCES public.auth_org_unit(id),
 sample_id text,
 principal_id text REFERENCES public.auth_principal(id),
 unit_id text REFERENCES public.auth_org_unit(id),
 action text NOT NULL CHECK (action IN ('READ_SAMPLE','REGISTER_SAMPLE','REVISE_SAMPLE')),
 active boolean NOT NULL DEFAULT true,
 expires_at timestamptz,
 granted_by text NOT NULL REFERENCES public.auth_principal(id),
 CHECK ((principal_id IS NULL) <> (unit_id IS NULL)),
 CHECK (action <> 'REGISTER_SAMPLE' OR sample_id IS NULL),
 FOREIGN KEY(sample_id) REFERENCES dxt_sample.sample(id)
);
CREATE INDEX sample_grant_scope ON dxt_sample.access_grant(owning_org_id,action,sample_id) WHERE active;
CREATE INDEX sample_grant_principal ON dxt_sample.access_grant(principal_id) WHERE active;
CREATE INDEX sample_grant_unit ON dxt_sample.access_grant(unit_id) WHERE active;
CREATE TABLE dxt_sample.command_receipt (
 actor_id text NOT NULL REFERENCES public.auth_principal(id),
 command_id text NOT NULL CHECK(length(btrim(command_id))>0),
 request jsonb NOT NULL, revision_id text NOT NULL REFERENCES dxt_sample.revision(id),
 PRIMARY KEY(actor_id,command_id)
);
-- Immutable assertion made by the trusted command after explicit user selection.
-- Mapping is specific to exact package+configured reference+revision, not global/latest.
CREATE TABLE dxt_sample.material_mapping (
 id uuid PRIMARY KEY,
 package_version_id text NOT NULL REFERENCES public.configuration_package_version(package_version_id),
 reference_kind text NOT NULL,
 material_reference_id text NOT NULL,
 sample_revision_id text NOT NULL REFERENCES dxt_sample.revision(id),
 selected_by text NOT NULL REFERENCES public.auth_principal(id),
 selected_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 FOREIGN KEY(package_version_id,reference_kind,material_reference_id)
  REFERENCES public.configuration_package_member(package_version_id,member_kind,member_revision_id),
 UNIQUE(package_version_id,reference_kind,material_reference_id,sample_revision_id)
);
CREATE TABLE dxt_sample.run_assignment_link (
 id uuid PRIMARY KEY,
 run_id uuid NOT NULL REFERENCES public.experiment_run(run_id),
 assignment_domain_id text NOT NULL,
 link_version integer NOT NULL CHECK(link_version>0),
 source_assignment_row_id uuid NOT NULL, -- audit only: existing Plan writer replaces row UUIDs
 mapping_id uuid NOT NULL REFERENCES dxt_sample.material_mapping(id),
 recorded_by text NOT NULL REFERENCES public.auth_principal(id),
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(run_id,assignment_domain_id,link_version)
);
CREATE INDEX sample_mapping_revision ON dxt_sample.material_mapping(sample_revision_id);
CREATE INDEX sample_link_mapping ON dxt_sample.run_assignment_link(mapping_id);
-- Migration inventory only: no revision inference and no change to historical assignment rows.
-- Stable keys prohibit an old unresolved assignment becoming linked after physical row replacement.
CREATE TABLE dxt_sample.legacy_unlinked_assignment (
 run_id uuid NOT NULL REFERENCES public.experiment_run(run_id),
 assignment_domain_id text NOT NULL,
 PRIMARY KEY(run_id,assignment_domain_id)
);
INSERT INTO dxt_sample.legacy_unlinked_assignment
 SELECT run_id,assignment_domain_id FROM public.run_assignment WHERE assignment_kind='MATERIAL';


CREATE FUNCTION dxt_sample.immutable() RETURNS trigger LANGUAGE plpgsql
 SET search_path=pg_catalog,dxt_sample,public,pg_temp AS $$
BEGIN RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='Sample provenance is append-only'; END $$;
CREATE TRIGGER sample_immutable BEFORE UPDATE OR DELETE ON dxt_sample.sample FOR EACH ROW EXECUTE FUNCTION dxt_sample.immutable();
CREATE TRIGGER revision_immutable BEFORE UPDATE OR DELETE ON dxt_sample.revision FOR EACH ROW EXECUTE FUNCTION dxt_sample.immutable();
CREATE TRIGGER receipt_immutable BEFORE UPDATE OR DELETE ON dxt_sample.command_receipt FOR EACH ROW EXECUTE FUNCTION dxt_sample.immutable();
CREATE TRIGGER mapping_immutable BEFORE UPDATE OR DELETE ON dxt_sample.material_mapping FOR EACH ROW EXECUTE FUNCTION dxt_sample.immutable();
CREATE TRIGGER link_immutable BEFORE UPDATE OR DELETE ON dxt_sample.run_assignment_link FOR EACH ROW EXECUTE FUNCTION dxt_sample.immutable();
CREATE TRIGGER legacy_immutable BEFORE UPDATE OR DELETE ON dxt_sample.legacy_unlinked_assignment FOR EACH ROW EXECUTE FUNCTION dxt_sample.immutable();
CREATE TRIGGER sample_no_truncate BEFORE TRUNCATE ON dxt_sample.sample FOR EACH STATEMENT EXECUTE FUNCTION dxt_sample.immutable();
CREATE TRIGGER revision_no_truncate BEFORE TRUNCATE ON dxt_sample.revision FOR EACH STATEMENT EXECUTE FUNCTION dxt_sample.immutable();
CREATE TRIGGER receipt_no_truncate BEFORE TRUNCATE ON dxt_sample.command_receipt FOR EACH STATEMENT EXECUTE FUNCTION dxt_sample.immutable();
CREATE TRIGGER mapping_no_truncate BEFORE TRUNCATE ON dxt_sample.material_mapping FOR EACH STATEMENT EXECUTE FUNCTION dxt_sample.immutable();
CREATE TRIGGER link_no_truncate BEFORE TRUNCATE ON dxt_sample.run_assignment_link FOR EACH STATEMENT EXECUTE FUNCTION dxt_sample.immutable();
CREATE TRIGGER legacy_no_truncate BEFORE TRUNCATE ON dxt_sample.legacy_unlinked_assignment FOR EACH STATEMENT EXECUTE FUNCTION dxt_sample.immutable();


-- pid is supplied only by the trusted server, NOT by HTTP body/header or arbitrary SQL clients.
-- No implicit role/responsibility/creator permission. Membership alone never grants access.
CREATE FUNCTION dxt_sample.allowed(pid text, org text, sid text, act text) RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,dxt_sample,public,pg_temp AS $$
 SELECT COALESCE(pid IS NOT NULL AND org IS NOT NULL AND act IS NOT NULL
 AND EXISTS(SELECT 1 FROM public.auth_principal p WHERE p.id=pid AND p.active)
 AND (sid IS NULL OR EXISTS(SELECT 1 FROM dxt_sample.sample s WHERE s.id=sid AND s.owning_org_id=org))
 AND EXISTS(SELECT 1 FROM dxt_sample.access_grant g WHERE g.owning_org_id=org
  AND g.action=act AND g.active AND (g.expires_at IS NULL OR g.expires_at>statement_timestamp())
  AND (g.sample_id IS NULL OR g.sample_id=sid)
  AND (g.principal_id=pid OR EXISTS(SELECT 1 FROM public.auth_membership m
   WHERE m.principal_id=pid AND NOT m.managed AND m.unit_id=g.unit_id))), false)
$$;

CREATE FUNCTION dxt_sample.read_revisions(pid text, sid text) RETURNS SETOF dxt_sample.revision
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,dxt_sample,public,pg_temp AS $$
 SELECT r.* FROM dxt_sample.revision r JOIN dxt_sample.sample s ON s.id=r.sample_id
 WHERE s.id=sid AND dxt_sample.allowed(pid,s.owning_org_id,sid,'READ_SAMPLE')
 ORDER BY r.revision_number
$$;

-- Entire aggregate must first pass existing sampleSchema/sampleRevisionSchema/
-- materialNodeSchema/materialCompositionEdgeSchema/materialPropertyValueSchema in server.
-- SQL guards identity, ordering, immutability, CAS, idempotency and basic payload shape.
CREATE FUNCTION dxt_sample.write_revision(pid text, cmd text, expected_latest integer, doc jsonb)
 RETURNS dxt_sample.revision LANGUAGE plpgsql SECURITY DEFINER
 SET search_path=pg_catalog,dxt_sample,public,pg_temp AS $$
DECLARE s jsonb := doc->'sample'; r jsonb := doc->'revision';
 sid text := s->>'id'; org text := doc->>'owningOrgId'; prior dxt_sample.command_receipt;
 answer dxt_sample.revision; latest integer; creating boolean := expected_latest=0;
 request jsonb := jsonb_build_object('expectedLatest',expected_latest,'document',doc);
BEGIN
 IF pid IS NULL OR cmd IS NULL OR btrim(cmd)='' OR expected_latest IS NULL OR expected_latest<0
  OR sid IS NULL OR org IS NULL OR doc IS NULL THEN
  RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Required Sample command fields are missing'; END IF;
 IF NOT dxt_sample.allowed(pid,org,CASE WHEN creating THEN NULL ELSE sid END,
      CASE WHEN creating THEN 'REGISTER_SAMPLE' ELSE 'REVISE_SAMPLE' END)
    OR NOT dxt_sample.allowed(pid,org,CASE WHEN creating THEN NULL ELSE sid END,'READ_SAMPLE') THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Explicit Sample capability required'; END IF;
 -- Serialize idempotency receipts, then revision allocation. Recheck authorization on every retry.
 PERFORM pg_advisory_xact_lock(hashtextextended(pid||':'||cmd,0));
 SELECT * INTO prior FROM dxt_sample.command_receipt WHERE actor_id=pid AND command_id=cmd;
 IF FOUND THEN
  IF prior.request IS DISTINCT FROM request THEN
   RAISE EXCEPTION USING ERRCODE='23505',MESSAGE='Command already used with different content'; END IF;
  SELECT * INTO answer FROM dxt_sample.revision WHERE id=prior.revision_id; RETURN answer;
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('sample:'||sid,0));
 IF s->>'materialId' IS NOT NULL OR s->>'supplierId' IS NOT NULL THEN
  RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Authoritative material or supplier reference unavailable'; END IF;
 IF (r->>'sampleId') IS DISTINCT FROM sid OR (r->>'revision')::integer IS DISTINCT FROM expected_latest+1
  OR r->>'id' IS NULL OR r->>'registrationSource' IS NULL
  OR r->>'registrationSource' NOT IN ('SUPPLIER_REQUEST','INTERNAL_REQUEST','DIRECT_REGISTRATION')
  OR r->>'status' IS NULL OR r->>'status' NOT IN ('Draft','Active','Retired')
  OR r->>'effectiveAt' IS NULL OR r->>'createdAt' IS NULL THEN
  RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Revision metadata does not match command'; END IF;
 PERFORM (r->>'effectiveAt')::timestamptz, (r->>'createdAt')::timestamptz;
 IF creating THEN
  INSERT INTO dxt_sample.sample VALUES(sid,org,s->>'sampleCode',s->>'name',NULL,NULL,s->>'description',s->>'status',(s->>'createdAt')::timestamptz,pid);
 ELSE
  PERFORM 1 FROM dxt_sample.sample WHERE id=sid AND owning_org_id=org FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Sample unavailable'; END IF;
  -- Identity is immutable; do not silently accept an edit while appending a revision.
  IF NOT EXISTS(SELECT 1 FROM dxt_sample.sample x WHERE x.id=sid
   AND x.sample_code=s->>'sampleCode' AND x.name=s->>'name'
   AND x.description IS NOT DISTINCT FROM s->>'description'
   AND x.status=s->>'status' AND x.created_at=(s->>'createdAt')::timestamptz) THEN
   RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Sample identity cannot change during revision creation'; END IF;
 END IF;
 SELECT COALESCE(max(revision_number),0) INTO latest FROM dxt_sample.revision WHERE sample_id=sid;
 IF latest<>expected_latest THEN RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='Sample changed; reload before creating revision'; END IF;
 INSERT INTO dxt_sample.revision(id,sample_id,revision_number,metadata,composition,properties,created_by)
 VALUES(r->>'id',sid,expected_latest+1,r,doc->'composition',doc->'properties',pid) RETURNING * INTO answer;
 INSERT INTO dxt_sample.command_receipt VALUES(pid,cmd,request,answer.id);
 RETURN answer;
END $$;

-- The linking command is proposed for the SAME transaction as new Run assignment insert.
-- Never callable as retrospective inference/backfill. Application must also honor existing Plan locks.
CREATE FUNCTION dxt_sample.link_new_assignment(pid text, aid uuid, rid text, action text, expected_link_version integer)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,dxt_sample,public,pg_temp AS $$
DECLARE a public.run_assignment; r public.experiment_run; s dxt_sample.sample;
 mid uuid; visible text; prior dxt_sample.run_assignment_link;
BEGIN
 SELECT * INTO a FROM public.run_assignment WHERE run_assignment_id=aid;
 SELECT * INTO r FROM public.experiment_run WHERE run_id=a.run_id;
 SELECT sm.* INTO s FROM dxt_sample.sample sm JOIN dxt_sample.revision sr ON sr.sample_id=sm.id WHERE sr.id=rid;
 IF expected_link_version IS NULL OR expected_link_version<0 OR pid IS NULL OR aid IS NULL OR rid IS NULL OR action IS NULL OR action NOT IN ('CREATE_RUN','EDIT_RUN_PLAN')
  OR a.run_id IS NULL OR a.assignment_kind<>'MATERIAL' OR s.id IS NULL THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Sample assignment unavailable'; END IF;
 IF EXISTS(SELECT 1 FROM dxt_sample.legacy_unlinked_assignment WHERE run_id=a.run_id AND assignment_domain_id=a.assignment_domain_id) THEN
  RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Historical unresolved assignment requires separate provenance review'; END IF;
 -- Historical Run/assignment rows cannot gain a new link. SQL insertion transaction is authoritative.
 IF NOT EXISTS(SELECT 1 FROM public.run_assignment WHERE run_assignment_id=aid AND xmin::text=pg_current_xact_id()::text) THEN
  RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Exact Sample link must be recorded with a new assignment'; END IF;
 IF action='CREATE_RUN' AND NOT EXISTS(SELECT 1 FROM public.experiment_run WHERE run_id=r.run_id AND xmin::text=pg_current_xact_id()::text) THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Existing Run requires Plan editing capability'; END IF;
 visible := public.dxt_study_access_reason(pid,r.study_id,'VIEW_RUN');
 IF visible IS NULL OR visible NOT IN ('RESPONSIBLE_USER','RESPONSIBLE_DEPARTMENT','AREA_SCOPE','MANAGED_ORG_SCOPE','EXPLICIT_GRANT','ADMIN')
  OR NOT EXISTS(SELECT 1 FROM public.study_access_grant g WHERE g.study_id=r.study_id AND g.action=link_new_assignment.action AND g.active
   AND (g.expires_at IS NULL OR g.expires_at>statement_timestamp())
   AND (g.principal_id=pid OR EXISTS(SELECT 1 FROM public.auth_membership m WHERE m.principal_id=pid AND NOT m.managed AND m.unit_id=g.unit_id)))
  OR NOT dxt_sample.allowed(pid,s.owning_org_id,s.id,'READ_SAMPLE') THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Explicit Run capability and Sample read capability required'; END IF;
 -- Existing material usage proves this reference is allowed as material in the selected assignment.
 IF NOT EXISTS(SELECT 1 FROM public.run_material_usage u WHERE u.run_assignment_id=aid AND u.material_revision_id=a.assignment_reference_revision_id)
  OR NOT EXISTS(SELECT 1 FROM public.configuration_package_member p WHERE p.package_version_id=r.configuration_package_version_id
   AND p.member_kind=a.reference_kind AND p.member_revision_id=a.assignment_reference_revision_id) THEN
  RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Selected material reference is not in exact Run configuration'; END IF;
 SELECT id INTO mid FROM dxt_sample.material_mapping WHERE package_version_id=r.configuration_package_version_id
  AND reference_kind=a.reference_kind AND material_reference_id=a.assignment_reference_revision_id AND sample_revision_id=rid;
 IF mid IS NULL THEN
  mid:=gen_random_uuid();
  INSERT INTO dxt_sample.material_mapping VALUES(mid,r.configuration_package_version_id,a.reference_kind,a.assignment_reference_revision_id,rid,pid,clock_timestamp())
  ON CONFLICT(package_version_id,reference_kind,material_reference_id,sample_revision_id) DO NOTHING;
  SELECT id INTO mid FROM dxt_sample.material_mapping WHERE package_version_id=r.configuration_package_version_id
   AND reference_kind=a.reference_kind AND material_reference_id=a.assignment_reference_revision_id AND sample_revision_id=rid;
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('sample-link:'||a.run_id||':'||a.assignment_domain_id,0));
 SELECT * INTO prior FROM dxt_sample.run_assignment_link WHERE run_id=a.run_id AND assignment_domain_id=a.assignment_domain_id ORDER BY link_version DESC LIMIT 1;
 IF COALESCE(prior.link_version,0)<>expected_link_version THEN
  RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='Sample assignment changed; reload before saving'; END IF;
 IF prior.mapping_id=mid THEN RETURN mid; END IF;
 INSERT INTO dxt_sample.run_assignment_link VALUES(gen_random_uuid(),a.run_id,a.assignment_domain_id,expected_link_version+1,aid,mid,pid,clock_timestamp());
 RETURN mid;
END $$;

-- Dedicated function owner must be NOLOGIN/NOSUPERUSER, with narrowly scoped underlying SELECT/INSERT.
-- Server-only service receives EXECUTE on reviewed entry points, never table DML or schema CREATE.
-- Role names / deployment grants are environment-specific and MUST be reviewed before activation.
REVOKE ALL ON ALL TABLES IN SCHEMA dxt_sample FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA dxt_sample FROM PUBLIC;
COMMIT;
