BEGIN;
-- The basis describes provenance, never a new researcher judgment vocabulary.
-- Existing rows retain CRITERIA_BACKED without editing their immutable payload.
ALTER TABLE decision ADD COLUMN judgment_basis text NOT NULL DEFAULT 'CRITERIA_BACKED';
ALTER TABLE decision ALTER COLUMN context_id DROP NOT NULL;
ALTER TABLE decision ADD CONSTRAINT decision_basis_context CHECK (
 (judgment_basis='CRITERIA_BACKED' AND context_id IS NOT NULL) OR
 (judgment_basis='RUN_ONLY' AND context_id IS NULL)
);
-- This separate guard deliberately leaves Evaluation's mandatory exact context
-- guard untouched. Authorization and interpretation CAS are still authoritative.
CREATE FUNCTION assert_run_decision_authoring(p_run uuid,p_context uuid,p_expected bigint,p_actor text,p_action text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE sid uuid; current_context uuid; current_sequence bigint;
BEGIN
 SELECT study_id INTO STRICT sid FROM experiment_run WHERE run_id=p_run FOR UPDATE;
 IF p_action IS NULL OR p_action NOT IN ('AUTHOR_DECISION','AUTHOR_NEXT_ACTION')
 OR dxt_explicit_scientific_access_reason(p_actor,sid,p_action) IS DISTINCT FROM 'EXPLICIT_GRANT' THEN
  RAISE EXCEPTION 'Scientific authoring requires explicit capability' USING ERRCODE='42501';
 END IF;
 SELECT interpretation_context_id,interpretation_sequence INTO current_context,current_sequence
 FROM run_reasoning_resolution WHERE run_id=p_run;
 IF NOT FOUND OR p_expected IS NULL OR current_context IS DISTINCT FROM p_context OR current_sequence IS DISTINCT FROM p_expected THEN
  RAISE EXCEPTION 'Interpretation changed; reread before authoring' USING ERRCODE='40001';
 END IF;
END $$;
-- A context-free decision cannot acquire fictitious Evaluation/Target references.
CREATE FUNCTION check_decision_reference_basis() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE d decision;
BEGIN
 SELECT * INTO STRICT d FROM decision WHERE id=NEW.decision_id;
 IF d.context_id IS NULL THEN
  RAISE EXCEPTION 'Run-only judgment cannot contain criteria evidence' USING ERRCODE='23514';
 END IF;
 IF TG_TABLE_NAME='decision_evaluation_ref' THEN
  IF NOT EXISTS(SELECT 1 FROM engineer_evaluation e WHERE e.id=NEW.evaluation_id AND e.run_id=d.run_id AND e.context_id=d.context_id) THEN
   RAISE EXCEPTION 'Evaluation does not belong to exact decision basis' USING ERRCODE='23514';
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER check_decision_evaluation_basis BEFORE INSERT ON decision_evaluation_ref FOR EACH ROW EXECUTE FUNCTION check_decision_reference_basis();
CREATE TRIGGER check_decision_result_basis BEFORE INSERT ON decision_result_ref FOR EACH ROW EXECUTE FUNCTION check_decision_reference_basis();
REVOKE ALL ON FUNCTION assert_run_decision_authoring(uuid,uuid,bigint,text,text),check_decision_reference_basis() FROM PUBLIC;
COMMIT;
