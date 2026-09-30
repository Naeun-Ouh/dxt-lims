BEGIN;

-- A separate concurrency token: execution never updates experiment_run/Plan.
CREATE TABLE execution_state (
  run_id uuid PRIMARY KEY REFERENCES experiment_run(run_id),
  aggregate_version integer NOT NULL CHECK (aggregate_version >= 0)
);
CREATE TABLE execution_event (
  execution_event_id uuid PRIMARY KEY,
  event_domain_id text NOT NULL UNIQUE,
  run_id uuid NOT NULL REFERENCES execution_state(run_id),
  run_subject_id uuid NOT NULL,
  run_operation_id uuid NOT NULL,
  planned_execution_item_id text,
  observed_operation text NOT NULL,
  observed_recipe text NOT NULL,
  equipment text NOT NULL,
  started_at text NOT NULL,
  ended_at text,
  execution_status text NOT NULL CHECK (execution_status IN ('OBSERVED', 'COMPLETED', 'INTERRUPTED')),
  source_system text NOT NULL,
  source_record_reference text NOT NULL,
  retrieved_at text NOT NULL,
  identity_context jsonb,
  identity_context_present boolean NOT NULL,
  FOREIGN KEY (run_id, run_subject_id) REFERENCES run_subject(run_id, run_subject_id),
  FOREIGN KEY (run_id, run_operation_id) REFERENCES run_operation(run_id, run_operation_id),
  FOREIGN KEY (run_subject_id, run_operation_id) REFERENCES run_subject_operation(run_subject_id, run_operation_id),
  UNIQUE (run_id, run_subject_id, run_operation_id, execution_event_id)
);
CREATE TABLE execution_observed_value (
  execution_event_id uuid NOT NULL REFERENCES execution_event(execution_event_id),
  ordinal integer NOT NULL CHECK (ordinal >= 0),
  definition_revision_id text NOT NULL,
  definition_kind text GENERATED ALWAYS AS ('definitionDescriptors') STORED,
  value_text text NOT NULL,
  PRIMARY KEY (execution_event_id, ordinal),
  UNIQUE (execution_event_id, definition_revision_id),
  FOREIGN KEY (definition_kind, definition_revision_id) REFERENCES configuration_revision(revision_kind, revision_id)
);
-- Re-authoring replaces only the current pointer, retaining old evidence identities.
CREATE TABLE execution_current (
  run_id uuid NOT NULL,
  run_subject_id uuid NOT NULL,
  run_operation_id uuid NOT NULL,
  execution_event_id uuid NOT NULL,
  ordinal integer NOT NULL CHECK (ordinal >= 0),
  PRIMARY KEY (run_id, run_subject_id, run_operation_id),
  UNIQUE (run_id, ordinal),
  FOREIGN KEY (run_id, run_subject_id, run_operation_id, execution_event_id)
    REFERENCES execution_event(run_id, run_subject_id, run_operation_id, execution_event_id)
);
CREATE TABLE execution_command_receipt (
  run_id uuid NOT NULL REFERENCES execution_state(run_id),
  command_id text NOT NULL,
  request_hash text NOT NULL,
  result_version integer NOT NULL CHECK (result_version > 0),
  PRIMARY KEY (run_id, command_id)
);
CREATE TABLE execution_command_result (
  run_id uuid NOT NULL,
  command_id text NOT NULL,
  ordinal integer NOT NULL,
  execution_event_id uuid NOT NULL REFERENCES execution_event(execution_event_id),
  PRIMARY KEY (run_id, command_id, ordinal),
  FOREIGN KEY (run_id, command_id) REFERENCES execution_command_receipt(run_id, command_id)
);
CREATE INDEX execution_event_run_status ON execution_event(run_id, execution_status);
CREATE INDEX execution_event_subject_operation ON execution_event(run_subject_id, run_operation_id);
CREATE FUNCTION protect_execution_evidence() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Persisted execution evidence and receipts are immutable'; END;
$$;
CREATE TRIGGER execution_event_immutable BEFORE UPDATE OR DELETE ON execution_event FOR EACH ROW EXECUTE FUNCTION protect_execution_evidence();
CREATE TRIGGER execution_value_immutable BEFORE UPDATE OR DELETE ON execution_observed_value FOR EACH ROW EXECUTE FUNCTION protect_execution_evidence();
CREATE TRIGGER execution_receipt_immutable BEFORE UPDATE OR DELETE ON execution_command_receipt FOR EACH ROW EXECUTE FUNCTION protect_execution_evidence();
CREATE TRIGGER execution_result_immutable BEFORE UPDATE OR DELETE ON execution_command_result FOR EACH ROW EXECUTE FUNCTION protect_execution_evidence();
COMMIT;
