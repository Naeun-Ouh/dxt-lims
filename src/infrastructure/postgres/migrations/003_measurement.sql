BEGIN;
-- Frozen reference-catalog payloads were not part of the Slice 1 configuration hydration.
-- Explicit provisioning binds these existing exact revisions to a package, never to latest.
CREATE TABLE measurement_reference (
 package_version_id text NOT NULL REFERENCES configuration_package_version(package_version_id),
 kind text NOT NULL,
 revision_id text NOT NULL,
 payload jsonb NOT NULL,
 PRIMARY KEY(package_version_id,kind,revision_id)
);
CREATE TABLE measurement_state (
 run_id uuid PRIMARY KEY REFERENCES experiment_run(run_id),
 aggregate_version integer NOT NULL CHECK(aggregate_version > 0)
);
CREATE TABLE measurement_execution (
 id uuid PRIMARY KEY, domain_id text UNIQUE NOT NULL,
 run_id uuid NOT NULL REFERENCES experiment_run(run_id),
 package_version_id text NOT NULL REFERENCES configuration_package_version(package_version_id),
 operation_revision_id text NOT NULL,
 operation_kind text GENERATED ALWAYS AS ('measurementOperations') STORED,
 FOREIGN KEY(package_version_id,operation_kind,operation_revision_id) REFERENCES measurement_reference(package_version_id,kind,revision_id),
 payload jsonb NOT NULL, content_hash text NOT NULL,
 UNIQUE(run_id,id)
);
CREATE TABLE measurement_execution_subject (
 execution_id uuid NOT NULL REFERENCES measurement_execution(id), run_id uuid NOT NULL,
 run_subject_id uuid NOT NULL,
 PRIMARY KEY(execution_id,run_subject_id),
 FOREIGN KEY(run_id,execution_id) REFERENCES measurement_execution(run_id,id),
 FOREIGN KEY(run_id,run_subject_id) REFERENCES run_subject(run_id,run_subject_id)
);
CREATE TABLE measurement_dataset (
 id uuid PRIMARY KEY, domain_id text UNIQUE NOT NULL,
 run_id uuid NOT NULL REFERENCES experiment_run(run_id),
 execution_id uuid NOT NULL,
 actual_event_id uuid REFERENCES execution_event(execution_event_id),
 package_version_id text NOT NULL REFERENCES configuration_package_version(package_version_id),
 operation_revision_id text NOT NULL,
 operation_kind text GENERATED ALWAYS AS ('measurementOperations') STORED,
 FOREIGN KEY(package_version_id,operation_kind,operation_revision_id) REFERENCES measurement_reference(package_version_id,kind,revision_id),
 origin text NOT NULL CHECK(origin IN ('SOURCE','DERIVED')),
 payload jsonb NOT NULL, content_hash text NOT NULL,
 UNIQUE(run_id,id),
 FOREIGN KEY(run_id,execution_id) REFERENCES measurement_execution(run_id,id)
);
CREATE TABLE measurement_site (
 id uuid PRIMARY KEY, run_subject_id uuid NOT NULL REFERENCES run_subject(run_subject_id),
 site_identity text NOT NULL, UNIQUE(run_subject_id,site_identity), UNIQUE(run_subject_id,id)
);
CREATE TABLE measurement_value (
 id uuid PRIMARY KEY, domain_id text UNIQUE NOT NULL,
 run_id uuid NOT NULL, dataset_id uuid NOT NULL,
 run_subject_id uuid NOT NULL,
 package_version_id text NOT NULL,
 parameter_id text NOT NULL, unit_id text,
 parameter_kind text GENERATED ALWAYS AS ('parameters') STORED,
 unit_kind text GENERATED ALWAYS AS ('units') STORED,
 FOREIGN KEY(package_version_id,parameter_kind,parameter_id) REFERENCES measurement_reference(package_version_id,kind,revision_id),
 FOREIGN KEY(package_version_id,unit_kind,unit_id) REFERENCES measurement_reference(package_version_id,kind,revision_id),
 grain text NOT NULL CHECK(grain IN ('SUBJECT','SITE')),
 site_id uuid,
 value_type text NOT NULL CHECK(value_type IN ('NUMBER','TEXT','BOOLEAN','SELECT')),
 number_value double precision, text_value text, boolean_value boolean,
 metadata jsonb NOT NULL, content_hash text NOT NULL,
 FOREIGN KEY(run_id,dataset_id) REFERENCES measurement_dataset(run_id,id),
 FOREIGN KEY(run_id,run_subject_id) REFERENCES run_subject(run_id,run_subject_id),
 FOREIGN KEY(run_subject_id,site_id) REFERENCES measurement_site(run_subject_id,id),
 CHECK((grain='SUBJECT' AND site_id IS NULL) OR (grain='SITE' AND site_id IS NOT NULL)),
 CHECK((value_type='NUMBER' AND number_value IS NOT NULL AND text_value IS NULL AND boolean_value IS NULL)
 OR (value_type IN ('TEXT','SELECT') AND text_value IS NOT NULL AND number_value IS NULL AND boolean_value IS NULL)
 OR (value_type='BOOLEAN' AND boolean_value IS NOT NULL AND number_value IS NULL AND text_value IS NULL))
);
CREATE TABLE measurement_coordinate_value (
 value_id uuid NOT NULL REFERENCES measurement_value(id), ordinal integer NOT NULL,
 package_version_id text NOT NULL,
 definition_id text NOT NULL, coordinate_value double precision NOT NULL,
 definition_kind text GENERATED ALWAYS AS ('coordinateDefinitions') STORED,
 FOREIGN KEY(package_version_id,definition_kind,definition_id) REFERENCES measurement_reference(package_version_id,kind,revision_id),
 PRIMARY KEY(value_id,definition_id), UNIQUE(value_id,ordinal)
);
CREATE TABLE measurement_value_lineage (
 value_id uuid NOT NULL REFERENCES measurement_value(id), source_value_id uuid NOT NULL REFERENCES measurement_value(id), ordinal integer NOT NULL,
 PRIMARY KEY(value_id,source_value_id), UNIQUE(value_id,ordinal), CHECK(value_id<>source_value_id)
);
CREATE TABLE measurement_summary (
 id uuid PRIMARY KEY, domain_id text UNIQUE NOT NULL,
 dataset_id uuid NOT NULL REFERENCES measurement_dataset(id), run_subject_id uuid NOT NULL REFERENCES run_subject(run_subject_id),
 parameter_id text NOT NULL, payload jsonb NOT NULL, content_hash text NOT NULL
);
CREATE TABLE measurement_summary_source (
 summary_id uuid NOT NULL REFERENCES measurement_summary(id), value_id uuid NOT NULL REFERENCES measurement_value(id), ordinal integer NOT NULL,
 PRIMARY KEY(summary_id,value_id), UNIQUE(summary_id,ordinal)
);
CREATE TABLE measurement_validity_decision (
 id uuid PRIMARY KEY, domain_id text UNIQUE NOT NULL, value_id uuid NOT NULL REFERENCES measurement_value(id),
 state text NOT NULL CHECK(state IN ('INCLUDED','EXCLUDED')), decided_at timestamptz NOT NULL,
 payload jsonb NOT NULL, content_hash text NOT NULL,
 insertion_order bigint GENERATED ALWAYS AS IDENTITY
);
CREATE TABLE measurement_command_receipt (
 run_id uuid NOT NULL REFERENCES measurement_state(run_id), command_id text NOT NULL,
 request_hash text NOT NULL, result_version integer NOT NULL, result_ids jsonb NOT NULL,
 PRIMARY KEY(run_id,command_id)
);
CREATE INDEX measurement_dataset_run ON measurement_dataset(run_id);
CREATE INDEX measurement_value_dataset_parameter_subject ON measurement_value(dataset_id,parameter_id,run_subject_id);
CREATE INDEX measurement_value_run ON measurement_value(run_id);
CREATE INDEX measurement_value_subject_parameter ON measurement_value(run_subject_id,parameter_id);
CREATE INDEX measurement_value_parameter ON measurement_value(parameter_id);
CREATE INDEX measurement_value_site ON measurement_value(site_id) WHERE site_id IS NOT NULL;
CREATE INDEX measurement_coordinate_definition ON measurement_coordinate_value(definition_id,value_id);
CREATE INDEX measurement_validity_latest ON measurement_validity_decision(value_id,decided_at DESC,insertion_order);
CREATE FUNCTION protect_measurement_observation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Measurement observations, references and decisions are immutable'; END;
$$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['measurement_reference','measurement_execution','measurement_execution_subject','measurement_dataset','measurement_site','measurement_value','measurement_coordinate_value','measurement_value_lineage','measurement_summary','measurement_summary_source','measurement_validity_decision','measurement_command_receipt'] LOOP
 EXECUTE format('CREATE TRIGGER immutable_measurement BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION protect_measurement_observation()',t);
 END LOOP;
END; $$;
COMMIT;
