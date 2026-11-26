BEGIN;
CREATE TABLE study_initial_reasoning_receipt (
 study_id uuid NOT NULL REFERENCES study(study_id),
 command_id text NOT NULL,
 context_id uuid NOT NULL UNIQUE REFERENCES reasoning_context(id),
 request_hash text NOT NULL,
 principal_id text NOT NULL REFERENCES auth_principal(id),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(study_id,command_id),
 UNIQUE(study_id)
);
CREATE TRIGGER immutable_study_initial_reasoning_receipt BEFORE UPDATE OR DELETE ON study_initial_reasoning_receipt
 FOR EACH ROW EXECUTE FUNCTION reject_reasoning_evidence_mutation();
COMMIT;
