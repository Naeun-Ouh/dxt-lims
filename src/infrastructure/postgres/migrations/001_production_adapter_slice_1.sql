BEGIN;

CREATE TABLE configuration_package (
  package_id text PRIMARY KEY
);

CREATE TABLE configuration_package_version (
  package_version_id text PRIMARY KEY,
  package_id text NOT NULL REFERENCES configuration_package(package_id),
  version integer NOT NULL CHECK (version > 0),
  scope_kind text NOT NULL,
  scope_owner_id text,
  status text NOT NULL CHECK (status IN ('DRAFT', 'ACTIVE', 'INACTIVE')),
  payload jsonb NOT NULL,
  UNIQUE (package_id, version),
  UNIQUE (package_id, package_version_id)
);

-- Phase 2.1: activation is per stable package lineage AND scope.
CREATE TABLE configuration_activation (
  activation_id uuid PRIMARY KEY,
  scope_type text NOT NULL CHECK (scope_type IN ('GLOBAL','AREA','TEAM','USER')),
  scope_id text NOT NULL CHECK ((scope_type = 'GLOBAL' AND scope_id = '') OR (scope_type <> 'GLOBAL' AND length(scope_id) > 0)),
  package_id text NOT NULL REFERENCES configuration_package(package_id),
  package_version_id text NOT NULL,
  active_from timestamptz NOT NULL DEFAULT clock_timestamp(),
  active_to timestamptz,
  aggregate_version bigint NOT NULL DEFAULT 1 CHECK (aggregate_version > 0),
  FOREIGN KEY (package_id, package_version_id)
    REFERENCES configuration_package_version(package_id, package_version_id),
  CHECK (active_to IS NULL OR active_to >= active_from)
);
CREATE UNIQUE INDEX configuration_one_active_package_scope
  ON configuration_activation(scope_type, scope_id, package_id)
  WHERE active_to IS NULL;

CREATE TABLE configuration_revision (
  revision_id text NOT NULL,
  revision_kind text NOT NULL,
  payload jsonb NOT NULL,
  PRIMARY KEY (revision_kind, revision_id)
);

CREATE TABLE configuration_package_member (
  package_version_id text NOT NULL REFERENCES configuration_package_version(package_version_id),
  member_kind text NOT NULL,
  member_revision_id text NOT NULL,
  PRIMARY KEY (package_version_id, member_kind, member_revision_id),
  FOREIGN KEY (member_kind, member_revision_id)
    REFERENCES configuration_revision(revision_kind, revision_id)
);

CREATE TABLE study (
  study_id uuid PRIMARY KEY,
  series_slug text NOT NULL UNIQUE,
  series_domain_id text NOT NULL UNIQUE,
  display_name text NOT NULL,
  experiment_type text NOT NULL,
  intent text NOT NULL,
  workspace_context_label text,
  manufacturing_context jsonb,
  next_run_number integer NOT NULL CHECK (next_run_number > 0),
  aggregate_version bigint NOT NULL DEFAULT 1 CHECK (aggregate_version > 0)
);

CREATE TABLE study_subject_default (
  study_id uuid NOT NULL REFERENCES study(study_id),
  ordinal integer NOT NULL,
  subject_domain_id text NOT NULL,
  subject_kind text NOT NULL,
  display_label text NOT NULL,
  PRIMARY KEY (study_id, ordinal),
  UNIQUE (study_id, subject_domain_id)
);

CREATE TABLE study_setup_version (
  setup_version_id uuid PRIMARY KEY,
  setup_domain_id text NOT NULL UNIQUE,
  study_id uuid NOT NULL REFERENCES study(study_id),
  revision integer NOT NULL CHECK (revision > 0),
  configuration_package_version_id text NOT NULL REFERENCES configuration_package_version(package_version_id),
  experiment_type_profile_version_id text NOT NULL,
  subject_type_revision_id text NOT NULL,
  area text NOT NULL,
  updated_at timestamptz NOT NULL,
  aggregate_version bigint NOT NULL DEFAULT 1 CHECK (aggregate_version > 0),
  UNIQUE (study_id, revision)
);

ALTER TABLE study ADD COLUMN current_setup_version_id uuid REFERENCES study_setup_version(setup_version_id);

CREATE TABLE study_setup_operation (
  setup_operation_id uuid PRIMARY KEY,
  operation_domain_id text NOT NULL,
  setup_version_id uuid NOT NULL REFERENCES study_setup_version(setup_version_id) ON DELETE CASCADE,
  sequence integer NOT NULL CHECK (sequence > 0),
  label text NOT NULL,
  operation_definition_revision_id text NOT NULL,
  role text NOT NULL CHECK (role IN ('PROCESS', 'MEASUREMENT')),
  measurement_point text,
  operation_context jsonb NOT NULL,
  UNIQUE (setup_version_id, sequence),
  UNIQUE (setup_version_id, operation_domain_id)
);

CREATE TABLE study_setup_assignment (
  setup_assignment_id uuid PRIMARY KEY,
  assignment_domain_id text NOT NULL,
  setup_operation_id uuid NOT NULL REFERENCES study_setup_operation(setup_operation_id) ON DELETE CASCADE,
  definition_revision_id text NOT NULL,
  label text NOT NULL,
  assignment_kind text NOT NULL CHECK (assignment_kind IN ('RECIPE', 'CONDITION', 'MATERIAL', 'RESOURCE')),
  assignment_reference_revision_id text NOT NULL,
  value_text text NOT NULL,
  intent_role text NOT NULL CHECK (intent_role IN ('FIXED', 'VARIED')),
  editor_key text NOT NULL,
  unit_symbol text NOT NULL,
  grain text NOT NULL CHECK (grain = 'SUBJECT'),
  options jsonb NOT NULL,
  applicability_id text NOT NULL,
  UNIQUE (setup_operation_id, assignment_domain_id)
);

CREATE TABLE study_setup_measurement_plan (
  setup_measurement_id uuid PRIMARY KEY,
  measurement_domain_id text NOT NULL,
  setup_operation_id uuid NOT NULL REFERENCES study_setup_operation(setup_operation_id) ON DELETE CASCADE,
  measurement_operation_definition_id text NOT NULL,
  operation_label text NOT NULL,
  parameter_definition_ids jsonb NOT NULL,
  parameter_labels jsonb NOT NULL,
  measurement_point text NOT NULL,
  UNIQUE (setup_operation_id, measurement_domain_id)
);

CREATE TABLE experiment_run (
  run_id uuid PRIMARY KEY,
  run_domain_id text NOT NULL UNIQUE,
  study_id uuid NOT NULL REFERENCES study(study_id),
  run_number integer NOT NULL CHECK (run_number > 0),
  configuration_package_version_id text NOT NULL REFERENCES configuration_package_version(package_version_id),
  experiment_type_profile_version_id text NOT NULL,
  subject_type_revision_id text NOT NULL,
  display_name text NOT NULL,
  study_name text NOT NULL,
  experiment_type text NOT NULL,
  area text NOT NULL,
  workspace_context_label text,
  created_at timestamptz NOT NULL,
  intent text NOT NULL,
  provenance_kind text NOT NULL,
  provenance_label text NOT NULL,
  provenance_source_id text,
  candidate_subjects jsonb,
  manufacturing_context jsonb,
  delta jsonb NOT NULL,
  aggregate_version bigint NOT NULL DEFAULT 1 CHECK (aggregate_version > 0),
  UNIQUE (study_id, run_number)
);

CREATE TABLE subject (
  subject_id uuid PRIMARY KEY,
  subject_domain_id text NOT NULL,
  subject_type_revision_id text NOT NULL,
  subject_kind text NOT NULL CHECK (subject_kind IN ('WAFER', 'SPECIMEN')),
  business_identifier text NOT NULL,
  display_label text NOT NULL,
  UNIQUE (subject_type_revision_id, subject_domain_id)
);

CREATE TABLE run_subject (
  run_subject_id uuid PRIMARY KEY,
  run_id uuid NOT NULL REFERENCES experiment_run(run_id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subject(subject_id),
  ordinal integer NOT NULL CHECK (ordinal > 0),
  display_label text NOT NULL,
  UNIQUE (run_id, run_subject_id),
  UNIQUE (run_id, subject_id),
  UNIQUE (run_id, ordinal)
);

CREATE TABLE run_operation (
  run_operation_id uuid PRIMARY KEY,
  run_id uuid NOT NULL REFERENCES experiment_run(run_id) ON DELETE CASCADE,
  operation_domain_id text NOT NULL,
  sequence integer NOT NULL CHECK (sequence > 0),
  label text NOT NULL,
  operation_definition_revision_id text NOT NULL,
  role text NOT NULL CHECK (role IN ('PROCESS', 'MEASUREMENT')),
  measurement_point text,
  operation_context jsonb NOT NULL,
  UNIQUE (run_id, run_operation_id),
  UNIQUE (run_id, operation_domain_id),
  UNIQUE (run_id, sequence)
);

CREATE TABLE run_subject_operation (
  run_id uuid NOT NULL REFERENCES experiment_run(run_id),
  run_subject_id uuid NOT NULL REFERENCES run_subject(run_subject_id) ON DELETE CASCADE,
  run_operation_id uuid NOT NULL REFERENCES run_operation(run_operation_id) ON DELETE CASCADE,
  FOREIGN KEY (run_id, run_subject_id) REFERENCES run_subject(run_id, run_subject_id),
  FOREIGN KEY (run_id, run_operation_id) REFERENCES run_operation(run_id, run_operation_id),
  PRIMARY KEY (run_subject_id, run_operation_id)
);

CREATE TABLE run_assignment (
  run_assignment_id uuid PRIMARY KEY,
  run_id uuid NOT NULL REFERENCES experiment_run(run_id) ON DELETE CASCADE,
  assignment_domain_id text NOT NULL,
  run_operation_id uuid REFERENCES run_operation(run_operation_id),
  run_subject_id uuid REFERENCES run_subject(run_subject_id),
  position_domain_id text,
  assignment_kind text NOT NULL CHECK (assignment_kind IN ('RECIPE', 'CONDITION', 'MATERIAL', 'RESOURCE')),
  label text NOT NULL,
  value_text text NOT NULL,
  assignment_reference_revision_id text NOT NULL,
  definition_revision_id text NOT NULL,
  definition_kind text GENERATED ALWAYS AS ('definitionDescriptors'::text) STORED,
  reference_kind text NOT NULL,
  grain_revision_id text NOT NULL,
  grain_kind text GENERATED ALWAYS AS ('grains'::text) STORED,
  unit_definition_revision_id text,
  applicability_rule_id text NOT NULL,
  value_type text NOT NULL CHECK (value_type IN ('NUMBER','BOOLEAN','TEXT','REFERENCE')),
  value_number numeric,
  value_boolean boolean,
  CHECK ((value_type = 'NUMBER' AND value_number IS NOT NULL AND value_boolean IS NULL)
    OR (value_type = 'BOOLEAN' AND value_boolean IS NOT NULL AND value_number IS NULL)
    OR (value_type IN ('TEXT','REFERENCE') AND value_number IS NULL AND value_boolean IS NULL)),
  FOREIGN KEY (definition_kind, definition_revision_id) REFERENCES configuration_revision(revision_kind, revision_id),
  FOREIGN KEY (reference_kind, assignment_reference_revision_id) REFERENCES configuration_revision(revision_kind, revision_id),
  FOREIGN KEY (grain_kind, grain_revision_id) REFERENCES configuration_revision(revision_kind, revision_id),
  intent_role text NOT NULL CHECK (intent_role IN ('FIXED', 'VARIED')),
  provenance text NOT NULL,
  FOREIGN KEY (run_id, run_subject_id) REFERENCES run_subject(run_id, run_subject_id),
  FOREIGN KEY (run_id, run_operation_id) REFERENCES run_operation(run_id, run_operation_id),
  UNIQUE (run_id, assignment_domain_id)
);

CREATE TABLE run_condition_assignment (
  run_assignment_id uuid PRIMARY KEY REFERENCES run_assignment(run_assignment_id) ON DELETE CASCADE,
  condition_revision_id text NOT NULL
);
CREATE TABLE run_recipe_assignment (
  run_assignment_id uuid PRIMARY KEY REFERENCES run_assignment(run_assignment_id) ON DELETE CASCADE,
  recipe_revision_id text NOT NULL
);
CREATE TABLE run_material_usage (
  run_assignment_id uuid PRIMARY KEY REFERENCES run_assignment(run_assignment_id) ON DELETE CASCADE,
  material_revision_id text NOT NULL
);
CREATE TABLE run_resource_usage (
  run_assignment_id uuid PRIMARY KEY REFERENCES run_assignment(run_assignment_id) ON DELETE CASCADE,
  resource_revision_id text NOT NULL
);

CREATE TABLE run_measurement_plan (
  measurement_plan_id uuid PRIMARY KEY,
  run_id uuid NOT NULL REFERENCES experiment_run(run_id) ON DELETE CASCADE,
  measurement_domain_id text NOT NULL,
  run_operation_id uuid NOT NULL REFERENCES run_operation(run_operation_id),
  measurement_operation_definition_id text NOT NULL,
  operation_label text NOT NULL,
  measurement_point text NOT NULL,
  FOREIGN KEY (run_id, run_operation_id) REFERENCES run_operation(run_id, run_operation_id),
  UNIQUE (run_id, measurement_domain_id)
);

CREATE TABLE run_measurement_plan_parameter (
  measurement_plan_id uuid NOT NULL REFERENCES run_measurement_plan(measurement_plan_id) ON DELETE CASCADE,
  ordinal integer NOT NULL CHECK (ordinal > 0),
  parameter_definition_id text NOT NULL,
  parameter_label text NOT NULL,
  PRIMARY KEY (measurement_plan_id, ordinal)
);

CREATE TABLE idempotency_record (
  idempotency_record_id uuid PRIMARY KEY,
  command_scope text NOT NULL,
  idempotency_key text NOT NULL,
  request_hash text NOT NULL,
  status text NOT NULL CHECK (status IN ('PENDING', 'SUCCEEDED', 'FAILED')),
  result_run_id uuid REFERENCES experiment_run(run_id),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (command_scope, idempotency_key)
);

CREATE INDEX experiment_run_study_number_idx ON experiment_run(study_id, run_number DESC);
CREATE INDEX run_subject_run_ordinal_idx ON run_subject(run_id, ordinal);
CREATE INDEX run_operation_run_sequence_idx ON run_operation(run_id, sequence);
CREATE INDEX run_assignment_operation_subject_idx ON run_assignment(run_operation_id, run_subject_id, assignment_kind);
CREATE INDEX idempotency_status_created_idx ON idempotency_record(status, created_at);

CREATE FUNCTION reject_immutable_configuration_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Configuration revisions and package membership are immutable';
END $$;
CREATE TRIGGER configuration_revision_immutable BEFORE UPDATE OR DELETE ON configuration_revision
  FOR EACH ROW EXECUTE FUNCTION reject_immutable_configuration_change();
CREATE TRIGGER configuration_membership_immutable BEFORE UPDATE OR DELETE ON configuration_package_member
  FOR EACH ROW EXECUTE FUNCTION reject_immutable_configuration_change();
CREATE TRIGGER configuration_package_payload_immutable BEFORE UPDATE OF payload, package_id, version, package_version_id ON configuration_package_version
  FOR EACH ROW EXECUTE FUNCTION reject_immutable_configuration_change();

CREATE TRIGGER configuration_package_delete_immutable BEFORE DELETE ON configuration_package_version
  FOR EACH ROW EXECUTE FUNCTION reject_immutable_configuration_change();
CREATE FUNCTION guard_package_membership_insert() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM 1 FROM configuration_package_version WHERE package_version_id = NEW.package_version_id AND status = 'DRAFT' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Published package membership is immutable'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER configuration_package_member_sealed BEFORE INSERT ON configuration_package_member
  FOR EACH ROW EXECUTE FUNCTION guard_package_membership_insert();

CREATE FUNCTION guard_published_package_status() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status <> 'DRAFT' AND NEW.status = 'DRAFT' THEN
    RAISE EXCEPTION 'Published packages cannot return to draft';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER configuration_no_unpublish BEFORE UPDATE OF status ON configuration_package_version
  FOR EACH ROW EXECUTE FUNCTION guard_published_package_status();

COMMIT;
