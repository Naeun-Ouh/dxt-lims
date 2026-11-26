-- Approved D01-D03. Existing membership remains historically applied; absent rows stay absent.
BEGIN;
ALTER TABLE run_operation ADD COLUMN design_mode text CHECK(design_mode IN ('COMMON','GROUPED'));
CREATE TABLE run_operation_group (
 run_id uuid NOT NULL,
 run_operation_id uuid NOT NULL,
 group_domain_id text NOT NULL CHECK(length(btrim(group_domain_id))>0),
 kind text NOT NULL CHECK(kind IN ('BASE','SPLIT')),
 name text NOT NULL CHECK(length(btrim(name))>0),
 ordinal integer NOT NULL CHECK(ordinal>0),
 PRIMARY KEY(run_id,group_domain_id),
 UNIQUE(run_id,run_operation_id,group_domain_id),
 FOREIGN KEY(run_id,run_operation_id) REFERENCES run_operation(run_id,run_operation_id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX operation_single_base ON run_operation_group(run_operation_id) WHERE kind='BASE';
ALTER TABLE run_subject_operation ADD COLUMN plan_state text NOT NULL DEFAULT 'COMMON'
 CHECK(plan_state IN ('COMMON','ASSIGNED','SKIP','UNASSIGNED'));
ALTER TABLE run_subject_operation ADD COLUMN group_domain_id text;
ALTER TABLE run_subject_operation ADD CONSTRAINT allocation_group_shape
 CHECK((plan_state='ASSIGNED')=(group_domain_id IS NOT NULL));
ALTER TABLE run_subject_operation ADD CONSTRAINT allocation_same_operation_group
 FOREIGN KEY(run_id,run_operation_id,group_domain_id) REFERENCES run_operation_group(run_id,run_operation_id,group_domain_id);
ALTER TABLE run_assignment ADD COLUMN group_domain_id text;
ALTER TABLE run_assignment ADD CONSTRAINT assignment_group_scope
 CHECK(group_domain_id IS NULL OR (run_subject_id IS NULL AND run_operation_id IS NOT NULL AND position_domain_id IS NULL));
ALTER TABLE run_assignment ADD CONSTRAINT assignment_same_operation_group
 FOREIGN KEY(run_id,run_operation_id,group_domain_id) REFERENCES run_operation_group(run_id,run_operation_id,group_domain_id);
CREATE INDEX assignment_group_scope_idx ON run_assignment(run_id,run_operation_id,group_domain_id);
-- Do not store a second participation table. All consumers project COMMON/ASSIGNED from this relation.
CREATE FUNCTION check_operation_design_allocation() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE mode text;
BEGIN
 SELECT design_mode INTO mode FROM run_operation WHERE run_operation_id=NEW.run_operation_id;
 IF (mode IS NULL AND NEW.plan_state<>'COMMON') OR
    (mode='COMMON' AND NEW.plan_state NOT IN ('COMMON','SKIP')) OR
    (mode='GROUPED' AND NEW.plan_state='COMMON') THEN
   RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Allocation does not match Operation design';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER operation_allocation_shape BEFORE INSERT OR UPDATE ON run_subject_operation FOR EACH ROW EXECUTE FUNCTION check_operation_design_allocation();
COMMIT;
