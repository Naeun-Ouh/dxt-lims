BEGIN;
-- Creation authority exists before a Study. Existing resource-bound grants stay unchanged.
CREATE TABLE study_creation_grant (
  id text PRIMARY KEY,
  principal_id text NOT NULL REFERENCES auth_principal(id),
  department_id text NOT NULL REFERENCES auth_org_unit(id),
  granted_by text NOT NULL REFERENCES auth_principal(id),
  active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
-- Stronger than effective uniqueness: an expired active row must be renewed or
-- deactivated before another active grant is inserted. No clock-dependent index.
CREATE UNIQUE INDEX study_creation_one_active_grant
  ON study_creation_grant(principal_id, department_id) WHERE active;
-- No live principals receive authority automatically.
COMMIT;
