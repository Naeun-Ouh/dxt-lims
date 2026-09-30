BEGIN;
CREATE TABLE reasoning_context (
 id uuid PRIMARY KEY, study_id uuid NOT NULL REFERENCES study(study_id),
 package_version_id text NOT NULL REFERENCES configuration_package_version(package_version_id),
 payload jsonb NOT NULL, UNIQUE(study_id,package_version_id)
);
CREATE TABLE evaluation_state (run_id uuid PRIMARY KEY REFERENCES experiment_run(run_id), version integer NOT NULL CHECK(version>0));
CREATE TABLE engineer_evaluation (
 id uuid PRIMARY KEY, domain_id text UNIQUE NOT NULL, run_id uuid NOT NULL REFERENCES experiment_run(run_id),
 run_subject_id uuid NOT NULL, context_id uuid NOT NULL REFERENCES reasoning_context(id),
 target_id text NOT NULL, summary_id uuid NOT NULL REFERENCES measurement_summary(id),
 payload jsonb NOT NULL, content_hash text NOT NULL, UNIQUE(run_id,id),
 FOREIGN KEY(run_id,run_subject_id) REFERENCES run_subject(run_id,run_subject_id)
);
CREATE TABLE evaluation_current (
 run_id uuid NOT NULL REFERENCES experiment_run(run_id), evaluation_id uuid NOT NULL,
 ordinal integer NOT NULL, PRIMARY KEY(run_id,evaluation_id),
 FOREIGN KEY(run_id,evaluation_id) REFERENCES engineer_evaluation(run_id,id)
);
CREATE TABLE decision_state (run_id uuid PRIMARY KEY REFERENCES experiment_run(run_id), version integer NOT NULL CHECK(version>0), decision_id uuid);
CREATE TABLE decision (
 id uuid PRIMARY KEY, domain_id text UNIQUE NOT NULL, run_id uuid NOT NULL REFERENCES experiment_run(run_id),
 context_id uuid NOT NULL REFERENCES reasoning_context(id), payload jsonb NOT NULL,
 preview jsonb, content_hash text NOT NULL, UNIQUE(run_id,id)
);
ALTER TABLE decision_state ADD FOREIGN KEY(run_id,decision_id) REFERENCES decision(run_id,id);
CREATE TABLE next_action (
 id uuid PRIMARY KEY, decision_id uuid UNIQUE NOT NULL REFERENCES decision(id),
 type_revision_id text NOT NULL, payload jsonb NOT NULL
);
CREATE TABLE decision_evaluation_ref (decision_id uuid NOT NULL REFERENCES decision(id),evaluation_id uuid NOT NULL REFERENCES engineer_evaluation(id),ordinal integer NOT NULL,PRIMARY KEY(decision_id,evaluation_id));
CREATE TABLE decision_result_ref (decision_id uuid NOT NULL REFERENCES decision(id),summary_id uuid NOT NULL REFERENCES measurement_summary(id),target_id text NOT NULL, status text NOT NULL,ordinal integer NOT NULL,PRIMARY KEY(decision_id,summary_id,target_id));
CREATE TABLE reasoning_command_receipt (
 run_id uuid NOT NULL REFERENCES experiment_run(run_id), kind text NOT NULL CHECK(kind IN ('evaluation','decision')),
 command_id text NOT NULL, request_hash text NOT NULL, result_version integer NOT NULL, result_ids jsonb NOT NULL,
 PRIMARY KEY(run_id,kind,command_id)
);
CREATE INDEX engineer_evaluation_run_subject ON engineer_evaluation(run_id,run_subject_id);
CREATE INDEX engineer_evaluation_target_summary ON engineer_evaluation(target_id,summary_id);
CREATE INDEX decision_run ON decision(run_id);
CREATE INDEX decision_evaluation_source ON decision_evaluation_ref(evaluation_id);
CREATE FUNCTION reject_reasoning_evidence_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Scientific reasoning identity is immutable; save a new authoring identity'; END $$;
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['reasoning_context','engineer_evaluation','decision','next_action','decision_evaluation_ref','decision_result_ref','reasoning_command_receipt'] LOOP EXECUTE format('CREATE TRIGGER immutable_reasoning BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION reject_reasoning_evidence_mutation()',t); END LOOP; END $$;
COMMIT;
