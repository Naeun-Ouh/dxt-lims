-- REVIEW CANDIDATE ONLY. Not registered in the application migration set.
-- Apply only after architecture approval AND coordinated repository rollout.
BEGIN;
LOCK TABLE reasoning_context, experiment_run IN SHARE ROW EXCLUSIVE MODE;

-- Keep UUIDs and every existing FK. PostgreSQL tracks the renamed table by OID.
ALTER TABLE reasoning_context RENAME TO reasoning_criteria_revision;
CREATE TABLE reasoning_criteria_definition (
 id uuid PRIMARY KEY,
 study_id uuid NOT NULL REFERENCES study(study_id),
 package_version_id text NOT NULL REFERENCES configuration_package_version(package_version_id),
 UNIQUE(id,study_id,package_version_id)
);
INSERT INTO reasoning_criteria_definition SELECT id,study_id,package_version_id FROM reasoning_criteria_revision;
-- This controlled metadata backfill does not change scientific payloads or IDs.
ALTER TABLE reasoning_criteria_revision DISABLE TRIGGER immutable_reasoning;
ALTER TABLE reasoning_criteria_revision ADD COLUMN definition_id uuid;
ALTER TABLE reasoning_criteria_revision ADD COLUMN revision integer NOT NULL DEFAULT 1 CHECK(revision>0);
ALTER TABLE reasoning_criteria_revision ADD COLUMN principal_id text REFERENCES auth_principal(id);
ALTER TABLE reasoning_criteria_revision ADD COLUMN recorded_at timestamptz;
UPDATE reasoning_criteria_revision SET definition_id=id;
ALTER TABLE reasoning_criteria_revision ALTER COLUMN definition_id SET NOT NULL;
ALTER TABLE reasoning_criteria_revision ADD FOREIGN KEY(definition_id,study_id,package_version_id)
 REFERENCES reasoning_criteria_definition(id,study_id,package_version_id);
ALTER TABLE reasoning_criteria_revision ADD UNIQUE(definition_id,revision);
ALTER TABLE reasoning_criteria_revision ADD UNIQUE(id,study_id,package_version_id);
ALTER TABLE reasoning_criteria_revision DROP CONSTRAINT reasoning_context_study_id_package_version_id_key;
ALTER TABLE reasoning_criteria_revision ENABLE TRIGGER immutable_reasoning;

-- Explicit legacy selection: old consumers still see exactly their original row.
CREATE TABLE study_legacy_reasoning_selection (
 study_id uuid NOT NULL REFERENCES study(study_id),
 package_version_id text NOT NULL REFERENCES configuration_package_version(package_version_id),
 context_id uuid NOT NULL UNIQUE REFERENCES reasoning_criteria_revision(id),
 PRIMARY KEY(study_id,package_version_id),
 FOREIGN KEY(context_id,study_id,package_version_id) REFERENCES reasoning_criteria_revision(id,study_id,package_version_id)
);
INSERT INTO study_legacy_reasoning_selection SELECT study_id,package_version_id,id FROM reasoning_criteria_revision;
CREATE VIEW reasoning_context AS
 SELECT r.id,r.study_id,r.package_version_id,r.payload FROM reasoning_criteria_revision r
 JOIN study_legacy_reasoning_selection s ON s.context_id=r.id;
CREATE FUNCTION insert_legacy_reasoning_context() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 INSERT INTO reasoning_criteria_definition VALUES(NEW.id,NEW.study_id,NEW.package_version_id);
 INSERT INTO reasoning_criteria_revision(id,study_id,package_version_id,payload,definition_id)
 VALUES(NEW.id,NEW.study_id,NEW.package_version_id,NEW.payload,NEW.id);
 INSERT INTO study_legacy_reasoning_selection VALUES(NEW.study_id,NEW.package_version_id,NEW.id);
 RETURN NEW;
END $$;
CREATE TRIGGER insert_legacy_reasoning_context INSTEAD OF INSERT ON reasoning_context
 FOR EACH ROW EXECUTE FUNCTION insert_legacy_reasoning_context();
CREATE TRIGGER immutable_legacy_reasoning_context INSTEAD OF UPDATE OR DELETE ON reasoning_context
 FOR EACH ROW EXECUTE FUNCTION reject_reasoning_evidence_mutation();

-- Server repository entry point, after exact-reference/payload validation.
-- UUID is the idempotent immutable revision identity; never overwrite its payload.
CREATE FUNCTION create_reasoning_criteria_revision(p_id uuid,p_definition uuid,p_study uuid,p_package text,
 p_expected integer,p_actor text,p_payload jsonb) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE previous reasoning_criteria_revision; current_revision integer;
BEGIN
 IF p_id IS NULL OR p_definition IS NULL OR p_study IS NULL OR p_package IS NULL OR p_expected IS NULL OR p_expected<0 OR p_actor IS NULL OR p_payload IS NULL THEN
   RAISE EXCEPTION 'Complete explicit criteria revision input is required' USING ERRCODE='22004';
 END IF;
 IF dxt_study_access_reason(p_actor,p_study,'MANAGE_REASONING_CONTEXT') IS DISTINCT FROM 'EXPLICIT_GRANT' THEN
   RAISE EXCEPTION 'Criteria authoring requires explicit capability' USING ERRCODE='42501';
 END IF;
 INSERT INTO reasoning_criteria_definition VALUES(p_definition,p_study,p_package) ON CONFLICT(id) DO NOTHING;
 PERFORM 1 FROM reasoning_criteria_definition WHERE id=p_definition AND study_id=p_study AND package_version_id=p_package FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Criteria definition scope mismatch' USING ERRCODE='23514'; END IF;
 SELECT * INTO previous FROM reasoning_criteria_revision WHERE id=p_id;
 IF FOUND THEN
   IF previous.definition_id<>p_definition OR previous.payload<>p_payload OR previous.principal_id IS DISTINCT FROM p_actor OR previous.revision<>p_expected+1 THEN
     RAISE EXCEPTION 'Criteria revision identity reused' USING ERRCODE='23505';
   END IF;
   RETURN previous.id;
 END IF;
 SELECT COALESCE(max(revision),0) INTO current_revision FROM reasoning_criteria_revision WHERE definition_id=p_definition;
 IF current_revision<>p_expected THEN RAISE EXCEPTION 'Criteria revision changed' USING ERRCODE='40001'; END IF;
 INSERT INTO reasoning_criteria_revision(id,study_id,package_version_id,payload,definition_id,revision,principal_id,recorded_at)
 VALUES(p_id,p_study,p_package,p_payload,p_definition,p_expected+1,p_actor,clock_timestamp());
 RETURN p_id;
END $$;

CREATE TABLE run_reasoning_origin (
 run_id uuid PRIMARY KEY REFERENCES experiment_run(run_id),
 state text NOT NULL CHECK(state IN ('UNKNOWN_LEGACY','ABSENT','SELECTED')),
 context_id uuid REFERENCES reasoning_criteria_revision(id),
 principal_id text REFERENCES auth_principal(id),
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 evidence text NOT NULL CHECK(length(btrim(evidence))>0),
 CHECK((state='SELECTED' AND context_id IS NOT NULL) OR
       (state IN ('ABSENT','UNKNOWN_LEGACY') AND context_id IS NULL)),
 CHECK(state='UNKNOWN_LEGACY' OR principal_id IS NOT NULL)
);
-- Deliberately no inference from Study criteria, timestamps, fixtures, or Evaluations.
INSERT INTO run_reasoning_origin(run_id,state,evidence)
 SELECT run_id,'UNKNOWN_LEGACY','Migration: creation-time criteria selection was not recorded' FROM experiment_run;

CREATE TABLE run_reasoning_interpretation_adoption (
 id uuid PRIMARY KEY,
 run_id uuid NOT NULL REFERENCES experiment_run(run_id),
 context_id uuid NOT NULL REFERENCES reasoning_criteria_revision(id),
 sequence bigint NOT NULL CHECK(sequence>0),
 expected_sequence bigint NOT NULL CHECK(expected_sequence>=0),
 principal_id text NOT NULL REFERENCES auth_principal(id),
 command_id text NOT NULL CHECK(length(btrim(command_id))>0),
 request_hash text NOT NULL CHECK(length(btrim(request_hash))>0),
 rationale text NOT NULL CHECK(length(btrim(rationale))>0),
 confirmed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK(sequence=expected_sequence+1),
 UNIQUE(run_id,sequence), UNIQUE(run_id,command_id)
);

CREATE FUNCTION check_run_reasoning_binding() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE sid uuid; pin text; current_sequence bigint; access_reason text;
BEGIN
 SELECT study_id,configuration_package_version_id INTO STRICT sid,pin
 FROM experiment_run WHERE run_id=NEW.run_id FOR UPDATE;
 IF TG_TABLE_NAME='run_reasoning_origin' THEN
   IF NEW.state='UNKNOWN_LEGACY' THEN RAISE EXCEPTION 'UNKNOWN_LEGACY is migration-only'; END IF;
 END IF;
 access_reason:=dxt_study_access_reason(NEW.principal_id,sid,
   CASE WHEN TG_TABLE_NAME='run_reasoning_origin' THEN 'CREATE_RUN' ELSE 'MANAGE_REASONING_CONTEXT' END);
 IF access_reason IS NULL OR access_reason NOT IN ('RESPONSIBLE_USER','RESPONSIBLE_DEPARTMENT','AREA_SCOPE','MANAGED_ORG_SCOPE','EXPLICIT_GRANT','ADMIN') THEN
   RAISE EXCEPTION 'Reasoning action denied' USING ERRCODE='42501';
 END IF;
 IF NEW.context_id IS NOT NULL THEN
   IF NOT EXISTS(SELECT 1 FROM reasoning_criteria_revision WHERE id=NEW.context_id AND study_id=sid AND package_version_id=pin) THEN
     RAISE EXCEPTION 'Criteria do not match exact Run Study/package' USING ERRCODE='23514';
   END IF;
   IF dxt_study_access_reason(NEW.principal_id,sid,'MANAGE_REASONING_CONTEXT') IS DISTINCT FROM 'EXPLICIT_GRANT' THEN
     RAISE EXCEPTION 'Criteria selection requires explicit capability' USING ERRCODE='42501';
   END IF;
 END IF;
 IF TG_TABLE_NAME='run_reasoning_interpretation_adoption' THEN
   SELECT COALESCE(max(sequence),0) INTO current_sequence FROM run_reasoning_interpretation_adoption WHERE run_id=NEW.run_id;
   IF current_sequence<>NEW.expected_sequence THEN
     RAISE EXCEPTION 'Interpretation selection changed; reread before choosing' USING ERRCODE='40001';
   END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER check_run_reasoning_origin BEFORE INSERT ON run_reasoning_origin
 FOR EACH ROW EXECUTE FUNCTION check_run_reasoning_binding();
CREATE TRIGGER check_run_reasoning_adoption BEFORE INSERT ON run_reasoning_interpretation_adoption
 FOR EACH ROW EXECUTE FUNCTION check_run_reasoning_binding();

-- The caller passes the server-resolved Principal, NEVER a browser-provided actor.
-- Same command is replayed before checking stale sequence; mismatched retry conflicts.
CREATE FUNCTION append_run_reasoning_adoption(p_id uuid,p_run uuid,p_context uuid,p_expected bigint,
 p_actor text,p_command text,p_hash text,p_rationale text) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE previous run_reasoning_interpretation_adoption; sid uuid;
BEGIN
 IF p_id IS NULL OR p_run IS NULL OR p_context IS NULL OR p_expected IS NULL OR p_expected<0 OR p_actor IS NULL OR p_command IS NULL OR p_hash IS NULL OR p_rationale IS NULL THEN
   RAISE EXCEPTION 'Complete explicit interpretation input is required' USING ERRCODE='22004';
 END IF;
 SELECT study_id INTO STRICT sid FROM experiment_run WHERE run_id=p_run FOR UPDATE;
 IF dxt_study_access_reason(p_actor,sid,'MANAGE_REASONING_CONTEXT') IS DISTINCT FROM 'EXPLICIT_GRANT' THEN
   RAISE EXCEPTION 'Criteria selection requires explicit capability' USING ERRCODE='42501';
 END IF;
 SELECT * INTO previous FROM run_reasoning_interpretation_adoption WHERE run_id=p_run AND command_id=p_command;
 IF FOUND THEN
   IF previous.context_id<>p_context OR previous.principal_id<>p_actor OR previous.request_hash<>p_hash
     OR previous.expected_sequence<>p_expected OR previous.rationale<>p_rationale THEN
     RAISE EXCEPTION 'Adoption command identity reused with different input' USING ERRCODE='23505';
   END IF;
   RETURN previous.id;
 END IF;
 INSERT INTO run_reasoning_interpretation_adoption(id,run_id,context_id,sequence,expected_sequence,principal_id,command_id,request_hash,rationale)
 VALUES(p_id,p_run,p_context,p_expected+1,p_expected,p_actor,p_command,p_hash,p_rationale);
 RETURN p_id;
END $$;

-- Prevent a newly committed Run without a creation-time answer. Existing legacy Runs
-- were backfilled above. This forces coordinated application deployment after approval.
CREATE FUNCTION require_run_reasoning_origin() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM run_reasoning_origin WHERE run_id=NEW.run_id) THEN
   RAISE EXCEPTION 'Run creation must record reasoning origin atomically' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER require_run_reasoning_origin AFTER INSERT ON experiment_run
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION require_run_reasoning_origin();

DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY[
 'reasoning_criteria_definition','study_legacy_reasoning_selection','run_reasoning_origin','run_reasoning_interpretation_adoption']
 LOOP EXECUTE format('CREATE TRIGGER immutable_reasoning BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION reject_reasoning_evidence_mutation()',t); END LOOP; END $$;
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY[
 'reasoning_criteria_revision','reasoning_criteria_definition','study_legacy_reasoning_selection','run_reasoning_origin','run_reasoning_interpretation_adoption']
 LOOP EXECUTE format('CREATE TRIGGER immutable_reasoning_truncate BEFORE TRUNCATE ON %I FOR EACH STATEMENT EXECUTE FUNCTION reject_reasoning_evidence_mutation()',t); END LOOP; END $$;

CREATE VIEW run_reasoning_resolution AS
 SELECT o.run_id,o.state AS origin_state,o.context_id AS creation_context_id,
 COALESCE(a.context_id,CASE WHEN o.state='SELECTED' THEN o.context_id END) AS interpretation_context_id,
 COALESCE(a.sequence,0) AS interpretation_sequence
 FROM run_reasoning_origin o LEFT JOIN LATERAL (
   SELECT context_id,sequence FROM run_reasoning_interpretation_adoption WHERE run_id=o.run_id ORDER BY sequence DESC LIMIT 1
 ) a ON true;
COMMIT;
