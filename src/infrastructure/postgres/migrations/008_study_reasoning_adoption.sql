BEGIN;
CREATE TABLE study_reasoning_adoption (
 study_id uuid NOT NULL REFERENCES study(study_id),
 command_id text NOT NULL,
 context_id uuid NOT NULL REFERENCES reasoning_context(id),
 source_context_id uuid NOT NULL REFERENCES reasoning_context(id),
 request_hash text NOT NULL,
 confirmed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(study_id,command_id)
);
CREATE TRIGGER immutable_study_reasoning_adoption BEFORE UPDATE OR DELETE ON study_reasoning_adoption
 FOR EACH ROW EXECUTE FUNCTION reject_reasoning_evidence_mutation();
COMMIT;
