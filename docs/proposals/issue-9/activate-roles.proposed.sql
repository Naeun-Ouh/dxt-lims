-- REVIEW TEMPLATE: roles are deployment-owned, no credentials and no LOGIN created here.
-- Only a trusted server login may be granted dxt_sample_service after architecture review.
-- Never grant it to browser/end-user/ad-hoc query roles. No caller-supplied actor authenticates itself.
BEGIN;
CREATE ROLE dxt_sample_function_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
CREATE ROLE dxt_sample_service NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
GRANT USAGE ON SCHEMA dxt_sample,public TO dxt_sample_function_owner;
GRANT SELECT ON public.auth_principal, public.auth_org_unit, public.auth_membership,
 public.study_access, public.study_access_grant, public.study_module_access,
 public.run_assignment, public.experiment_run, public.run_material_usage,
 public.configuration_package_member TO dxt_sample_function_owner;
GRANT SELECT ON ALL TABLES IN SCHEMA dxt_sample TO dxt_sample_function_owner;
GRANT INSERT ON dxt_sample.sample,dxt_sample.revision,dxt_sample.command_receipt,
 dxt_sample.material_mapping,dxt_sample.run_assignment_link TO dxt_sample_function_owner;
-- SELECT FOR UPDATE requires UPDATE; immutable trigger still rejects actual UPDATE.
GRANT UPDATE ON dxt_sample.sample TO dxt_sample_function_owner;
GRANT EXECUTE ON FUNCTION public.dxt_study_access_reason(text,uuid,text),
 public.dxt_study_access_reason_v2(text,uuid,text),
 public.dxt_study_access_reason_v1(text,uuid,text) TO dxt_sample_function_owner;
-- Function owner needs schema CREATE only while ownership is transferred, then it is revoked.
GRANT CREATE ON SCHEMA dxt_sample TO dxt_sample_function_owner;
ALTER FUNCTION dxt_sample.allowed(text,text,text,text) OWNER TO dxt_sample_function_owner;
ALTER FUNCTION dxt_sample.read_revisions(text,text) OWNER TO dxt_sample_function_owner;
ALTER FUNCTION dxt_sample.write_revision(text,text,integer,jsonb) OWNER TO dxt_sample_function_owner;
ALTER FUNCTION dxt_sample.link_new_assignment(text,uuid,text,text,integer) OWNER TO dxt_sample_function_owner;
REVOKE CREATE ON SCHEMA dxt_sample FROM dxt_sample_function_owner;
GRANT USAGE ON SCHEMA dxt_sample TO dxt_sample_service;
GRANT EXECUTE ON FUNCTION dxt_sample.read_revisions(text,text),
 dxt_sample.write_revision(text,text,integer,jsonb),
 dxt_sample.link_new_assignment(text,uuid,text,text,integer) TO dxt_sample_service;
COMMIT;
