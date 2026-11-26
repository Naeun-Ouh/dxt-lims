-- REVIEW ONLY. Run after 016 in the same controlled deployment transaction.
-- Precondition: dxt_reasoning_server is an audited NOLOGIN, NOSUPERUSER,
-- NOCREATEDB, NOCREATEROLE, NOINHERIT, NOBYPASSRLS group owned by the deployer.
-- Only the trusted backend login may SET ROLE to this group. No browser/public
-- login may be a member; server credentials must never reach the browser.
-- The protected migration owner owns SECURITY DEFINER functions. The backend
-- must not own those functions/tables or have membership in the owner role.
REVOKE CREATE ON SCHEMA public FROM PUBLIC, dxt_reasoning_server;
GRANT USAGE ON SCHEMA public TO dxt_reasoning_server;
REVOKE ALL ON reasoning_criteria_definition,reasoning_criteria_revision,
 study_legacy_reasoning_selection,reasoning_context,run_reasoning_origin,
 run_reasoning_interpretation_adoption FROM dxt_reasoning_server;
GRANT EXECUTE ON FUNCTION dxt_explicit_scientific_access_reason(text,uuid,text),
 create_reasoning_criteria_revision(uuid,uuid,uuid,text,integer,text,jsonb),
 append_run_reasoning_adoption(uuid,uuid,uuid,bigint,text,text,text,text),
 record_run_reasoning_origin(uuid,text,uuid,text,text),
 assert_run_reasoning_authoring(uuid,uuid,bigint,text,text)
 TO dxt_reasoning_server;
-- Protected reads still go through server resource authorization; granting raw
-- table SELECT to an end-user role would expose criteria beyond its Study scope.
-- Do not grant other table/function/schema privileges by wildcard.
