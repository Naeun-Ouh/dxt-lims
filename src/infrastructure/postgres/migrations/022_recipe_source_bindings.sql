BEGIN;
-- Exact Source association reuses immutable configuration revisions and Sample revisions.
CREATE TABLE dxt_sample.recipe_source_descriptor (
 package_version_id text NOT NULL REFERENCES configuration_package_version(package_version_id),
 recipe_kind text NOT NULL DEFAULT 'externalReferences' CHECK(recipe_kind='externalReferences'),
 recipe_revision_id text NOT NULL,
 parameter_kind text NOT NULL DEFAULT 'definitionDescriptors' CHECK(parameter_kind='definitionDescriptors'),
 parameter_revision_id text NOT NULL,
 created_by text NOT NULL REFERENCES auth_principal(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(package_version_id,recipe_revision_id,parameter_revision_id),
 FOREIGN KEY(package_version_id,recipe_kind,recipe_revision_id) REFERENCES configuration_package_member(package_version_id,member_kind,member_revision_id),
 FOREIGN KEY(package_version_id,parameter_kind,parameter_revision_id) REFERENCES configuration_package_member(package_version_id,member_kind,member_revision_id)
);
CREATE TRIGGER immutable_recipe_source_descriptor BEFORE UPDATE OR DELETE ON dxt_sample.recipe_source_descriptor FOR EACH ROW EXECUTE FUNCTION reject_immutable_configuration_change();
CREATE TRIGGER immutable_recipe_source_descriptor_truncate BEFORE TRUNCATE ON dxt_sample.recipe_source_descriptor FOR EACH STATEMENT EXECUTE FUNCTION reject_immutable_configuration_change();
CREATE TABLE dxt_sample.recipe_source_selection (
 run_id uuid NOT NULL REFERENCES experiment_run(run_id),
 binding_id text NOT NULL,
 run_operation_id uuid NOT NULL,
 operation_domain_id text NOT NULL,
 group_domain_id text,
 run_subject_id uuid,
 subject_domain_id text,
 package_version_id text NOT NULL,
 recipe_revision_id text NOT NULL,
 parameter_revision_id text NOT NULL,
 selection_state text NOT NULL CHECK(selection_state IN ('SELECTED','CLEAR')),
 sample_revision_id text REFERENCES dxt_sample.revision(id),
 version integer NOT NULL CHECK(version>0),
 PRIMARY KEY(run_id,binding_id),
 FOREIGN KEY(run_id,run_operation_id) REFERENCES run_operation(run_id,run_operation_id),
 FOREIGN KEY(run_id,run_subject_id) REFERENCES run_subject(run_id,run_subject_id),
 FOREIGN KEY(run_id,run_operation_id,group_domain_id) REFERENCES run_operation_group(run_id,run_operation_id,group_domain_id),
 FOREIGN KEY(package_version_id,recipe_revision_id,parameter_revision_id) REFERENCES dxt_sample.recipe_source_descriptor(package_version_id,recipe_revision_id,parameter_revision_id),
 CHECK(group_domain_id IS NULL OR run_subject_id IS NULL),
 CHECK((run_subject_id IS NULL)=(subject_domain_id IS NULL)),
 CHECK((selection_state='SELECTED' AND sample_revision_id IS NOT NULL) OR (selection_state='CLEAR' AND sample_revision_id IS NULL)),
 UNIQUE NULLS NOT DISTINCT(run_id,run_operation_id,group_domain_id,run_subject_id,recipe_revision_id,parameter_revision_id)
);
-- History stores exact identities independently of mutable Plan children. No cascade erases provenance.
CREATE TABLE dxt_sample.recipe_source_history (
 id uuid PRIMARY KEY,
 run_id uuid NOT NULL REFERENCES experiment_run(run_id),
 binding_id text NOT NULL,
 link_version integer NOT NULL CHECK(link_version>0),
 operation_domain_id text NOT NULL,
 group_domain_id text,
 subject_domain_id text,
 package_version_id text NOT NULL,
 recipe_revision_id text NOT NULL,
 parameter_revision_id text NOT NULL,
 selection_state text NOT NULL CHECK(selection_state IN ('SELECTED','CLEAR','REMOVED')),
 sample_revision_id text REFERENCES dxt_sample.revision(id),
 recorded_by text NOT NULL REFERENCES auth_principal(id),
 recorded_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(run_id,binding_id,link_version),
 FOREIGN KEY(package_version_id,recipe_revision_id,parameter_revision_id) REFERENCES dxt_sample.recipe_source_descriptor(package_version_id,recipe_revision_id,parameter_revision_id),
 CHECK((selection_state='SELECTED' AND sample_revision_id IS NOT NULL) OR (selection_state IN ('CLEAR','REMOVED') AND sample_revision_id IS NULL))
);
CREATE INDEX recipe_source_history_sample ON dxt_sample.recipe_source_history(sample_revision_id,run_id);
CREATE TRIGGER immutable_recipe_source_history BEFORE UPDATE OR DELETE ON dxt_sample.recipe_source_history FOR EACH ROW EXECUTE FUNCTION reject_immutable_configuration_change();
CREATE TRIGGER immutable_recipe_source_history_truncate BEFORE TRUNCATE ON dxt_sample.recipe_source_history FOR EACH STATEMENT EXECUTE FUNCTION reject_immutable_configuration_change();
REVOKE ALL ON dxt_sample.recipe_source_descriptor,dxt_sample.recipe_source_selection,dxt_sample.recipe_source_history FROM PUBLIC;

COMMIT;
