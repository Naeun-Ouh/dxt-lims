BEGIN;
-- UI planning context is separate from the authoritative full relational snapshot.
ALTER TABLE experiment_run ADD COLUMN planning_context jsonb NOT NULL DEFAULT '{"ranges":[],"manualFocus":[]}';
COMMIT;
