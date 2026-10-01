# DXT minimal persistent Study creation — Issue #8

## Scope and approval

Implements G04 from [Issue #8](https://github.com/Naeun-Ouh/dxt-lims/issues/8), under the [approved schema/policy boundary](https://github.com/Naeun-Ouh/dxt-lims/issues/8#issuecomment-5933284270). G05 Sample creation remains a separate task under the [Issue #7 product decision](https://github.com/Naeun-Ouh/dxt-lims/issues/7#issuecomment-5932941892).

The existing preview-only Study form now creates a persisted identity and an **empty** initial Setup. Supported input is title, unique Study ID/slug, objective, authorized responsible Department, and an exact package/profile/Subject-type/Area context. Unsupported owner/team/status/target controls are removed from this form rather than silently ignored. No scientific defaults are copied.

## Authoritative boundary

- `StudyCreationRepository` exposes options, create, and exact identity read-back through the existing HTTP/authorized PostgreSQL composition.
- `study.creation.options` exposes only explicitly granted Departments and independently readable, ACTIVE, valid exact configuration contexts. Contexts must satisfy the existing package validator and exact profile relationships. Ambiguous Area revisions sharing a code are excluded because the existing Setup stores the Area code.
- `study.create` rechecks the trusted active principal, active/unexpired explicit creation grant, DEPARTMENT organization type, and readable exact configuration. Client-supplied ownership/visibility fields are rejected.
- One transaction inserts Study, initial empty Setup revision 1, current Setup pointer, creator/Department access context, and the command receipt. The existing RESPONSIBLE_DEPARTMENT default applies. No Subjects, Operations, targets, measurements, or Runs are created.
- Actor-bound command receipts support identical retries; changed payloads and occupied slugs conflict without exposing another Study. Creation transactions acquire the policy lock before their repeatable-read snapshot, preventing concurrent creators from deadlocking while inserting access rows.
- The command returns authoritative identity; the UI independently reads it again and compares every requested field before navigating to `/series/{slug}`. Failed or mismatched read-back is not success. The form retains its command ID for unchanged retries during that page session.
- The new dynamic detail route loads persisted identity/context and fails closed. Existing three fixture-backed routes remain unchanged and their slugs are reserved for creation.

## Migration and authorization

`014_study_creation_grant.sql` adds only the approved table: id, principal_id, department_id, granted_by, active, expires_at, created_at. Principal, Department identity, and granting principal have foreign keys to the existing identities. A partial unique index permits one active row per principal + Department. An expired active row must be renewed or deactivated before inserting another active row; expiration never authorizes creation.

The normal migration runner includes 014. **No live grants are provisioned.** Operators must apply the migration and explicitly provision approved grants through their controlled database process. There is no grant-management UI. Independent configuration read access is still required.

The new grant confers no configuration/Sample governance, unrelated Study/Run access, department-wide editing, or implicit leadership/ADMIN scientific authority. Existing resource authorization functions are unchanged. Revocation blocks future creation, including a later create-command retry; it does not alter an already-created Study's existing access relationship or exact stored pin.

No broader authorization-model change was required. The policy transaction lock now includes the new grant table; creation uses a stronger lock mode to serialize creation safely at pilot scale.

## Validation

- Full repository test runner: 316 tests (including the new Study creation contract and client read-back/KO/EN tests).
- Native PostgreSQL 18: full production-adapter contract, including simultaneous Study creation requests.
- TypeScript, changed-file lint, production client/server build, and `git diff --check`.
- Grant tests: valid, absent, inactive, expired, wrong Department, non-DEPARTMENT, inactive/unknown principal, and ADMIN without a creation grant.
- Configuration tests: independently unreadable, invalid package, and mismatched exact package/profile/Subject/Area references.
- Persistence tests: matching read-back, duplicate slug, identical retry, changed retry, concurrent retry, injected mid-write rollback, empty Setup, no scientific defaults, scoped discovery, and retained access after creation-grant revocation.
- Existing Study and authorization contracts continue to run; an unrelated Study and configuration activation remain denied to the test creator.
- Browser verification used a separate PostgreSQL cluster and test principals: KO creation, persisted detail/reload, EN discovery, duplicate-ID errors in KO/EN, and disabled creation for a principal with no grant. These were software verification records, not scientific observations or Human UAT acceptance. The existing live UAT database and grants were not changed.

## Human UAT and remaining limits

Entry route: `/studies/new`; resulting route: `/series/{entered-study-id}`; list: `/studies`.

After applying migration 014 and explicitly granting an approved test principal Department-scoped creation plus independent configuration read access:

1. Enter a unique ID, title, and objective; select the authorized Department and exact context.
2. Create, inspect the returned identity/context, reload, and verify list discovery.
3. Try the occupied ID and verify the conflict stays on the form without another Study.
4. Verify KO/EN labels, then a principal without the grant; creation must be unavailable and direct API requests rejected.
5. Revoke the creation grant and confirm future creation is blocked while existing Study access follows its original policy.

The new Study has an empty Setup by design. This PR does **not** add generic Subject/Operation setup authoring or make a newly created empty Study ready to create Runs. Its detail page states that limitation instead of linking to fixture-based Run creation. Existing Studies and their workflows remain intact. G05, approval workflow, grant UI, organization changes, and broader Study metadata are outside this PR. Human acceptance remains pending.
