import { createHash, randomUUID } from 'node:crypto';
import { ApplicationError } from '@/src/application/repository-ports';
import {
  studyCreateSchema,
  type StudyCreateInput,
  type StudyCreationContext,
  type StudyCreationOptions,
  type StudyIdentity,
  type StudyCreationRepository,
} from '@/src/application/study-creation';
import { configurationEditorKeys } from '@/src/application/configuration-authoring';
import { validateConfigurationPackageVersion } from '@/src/domain/reference';
import type { SqlSession } from './sql-database';
import { readConfigurationAuthoring } from './postgres-configuration-authoring';
import { PostgresAuthorization, resolvePrincipal } from './authorization';

/** Called only inside authorizedOperation's locked policy/write transaction. */
export class PostgresStudyCreation implements StudyCreationRepository {
  constructor(
    private readonly sql: SqlSession,
    private readonly principalId: string,
  ) {}

  private async departments() {
    return (
      await this.sql.query<{ department_id: string }>(
        `SELECT g.department_id
      FROM study_creation_grant g JOIN auth_principal p ON p.id=g.principal_id
      JOIN auth_org_unit o ON o.id=g.department_id
      WHERE g.principal_id=$1 AND p.active AND g.active AND o.kind='DEPARTMENT'
      AND (g.expires_at IS NULL OR g.expires_at>statement_timestamp()) ORDER BY g.department_id`,
        [this.principalId],
      )
    ).rows.map((row) => row.department_id);
  }

  private async contexts(): Promise<StudyCreationContext[]> {
    // Historical Run dependency access does not grant unrelated configuration discovery.
    const pins = (
      await this.sql.query<{ id: string }>(
        `SELECT package_version_id id FROM configuration_package_version
      WHERE dxt_configuration_allowed($1,scope_kind,COALESCE(scope_owner_id,''),'VIEW_CONFIGURATION')`,
        [this.principalId],
      )
    ).rows.map((row) => row.id);
    // Validate server-side using the authoritative catalog; return only contexts
    // inside independently readable exact manifests, never this internal snapshot.
    const { registry, catalog } = await readConfigurationAuthoring(this.sql);
    const result: StudyCreationContext[] = [];
    for (const pkg of registry.packages.filter(
      (p) => pins.includes(p.id) && p.status === 'ACTIVE',
    )) {
      try {
        validateConfigurationPackageVersion(
          pkg,
          registry,
          catalog,
          configurationEditorKeys,
        );
      } catch {
        continue;
      }
      // Use exact profile relationships; no fallback to a fixture or latest version.
      for (const profile of registry.experimentTypeProfiles.filter((p) =>
        pkg.experimentTypeProfileVersionIds.includes(p.id),
      )) {
        const experiment = catalog.experimentTypes.find(
          (e) => e.id === profile.experimentTypeDefinitionRevisionId,
        );
        if (!experiment) continue;
        for (const areaProfile of registry.departmentAreaProfiles.filter(
          (p) =>
            pkg.departmentAreaProfileVersionIds.includes(p.id) &&
            profile.departmentAreaProfileVersionIds.includes(p.id),
        )) {
          for (const subject of registry.subjectTypes.filter(
            (s) =>
              pkg.subjectTypeRevisionIds.includes(s.id) &&
              profile.subjectTypeRevisionIds.includes(s.id) &&
              areaProfile.subjectTypeRevisionIds.includes(s.id),
          )) {
            for (const areaId of areaProfile.areaDefinitionRevisionIds) {
              const area = catalog.areas.find((a) => a.id === areaId);
              const profileAreaIds = registry.departmentAreaProfiles
                .filter(
                  (p) =>
                    pkg.departmentAreaProfileVersionIds.includes(p.id) &&
                    profile.departmentAreaProfileVersionIds.includes(p.id),
                )
                .flatMap((p) => p.areaDefinitionRevisionIds);
              const unambiguous =
                area &&
                catalog.areas.filter(
                  (a) => profileAreaIds.includes(a.id) && a.code === area.code,
                ).length === 1;
              if (area && unambiguous)
                result.push({
                  packageVersionId: pkg.id,
                  experimentTypeProfileVersionId: profile.id,
                  subjectTypeRevisionId: subject.id,
                  areaDefinitionRevisionId: area.id,
                  experimentType: experiment.code,
                  area: area.code,
                  label: `${pkg.id} · ${profile.code} · ${area.code} · ${subject.label}`,
                });
            }
          }
        }
      }
    }
    return result;
  }

  async options(): Promise<StudyCreationOptions> {
    const departments = await this.departments();
    return {
      departments,
      contexts: departments.length ? await this.contexts() : [],
    };
  }

  async get(slug: string): Promise<StudyIdentity> {
    const row = (
      await this.sql.query<{ study_id: string }>(
        'SELECT study_id FROM study WHERE series_slug=$1',
        [slug],
      )
    ).rows[0];
    if (!row)
      throw new ApplicationError(
        'NOT_FOUND',
        'Resource unavailable or access denied.',
      );
    await new PostgresAuthorization(this.sql).require(
      await resolvePrincipal(this.sql, this.principalId),
      'VIEW_STUDY',
      row.study_id,
    );
    const saved = (
      await this.sql.query(
        `SELECT s.study_id id,s.series_domain_id "seriesId",s.series_slug slug,s.display_name name,s.intent,
      a.responsible_department_id "departmentId",a.responsible_user_id "responsibleUserId",a.visibility,
      s.experiment_type "experimentType",v.area,v.revision "setupRevision",
      v.configuration_package_version_id "packageVersionId",v.experiment_type_profile_version_id "experimentTypeProfileVersionId",
      v.subject_type_revision_id "subjectTypeRevisionId"
      FROM study s JOIN study_access a USING(study_id) JOIN study_setup_version v ON v.setup_version_id=s.current_setup_version_id
      WHERE s.study_id=$1`,
        [row.study_id],
      )
    ).rows[0];
    if (!saved)
      throw new ApplicationError(
        'PERSISTENCE',
        'Study read-back did not match. Retry the same request.',
      );
    const identity = saved as Omit<StudyIdentity, 'areaDefinitionRevisionId'>;
    const { registry, catalog } = await readConfigurationAuthoring(this.sql);
    const pkg = registry.packages.find(
      (p) => p.id === identity.packageVersionId,
    );
    const profile = registry.experimentTypeProfiles.find(
      (p) =>
        p.id === identity.experimentTypeProfileVersionId &&
        pkg?.experimentTypeProfileVersionIds.includes(p.id),
    );
    const areaIds = registry.departmentAreaProfiles
      .filter(
        (p) =>
          pkg?.departmentAreaProfileVersionIds.includes(p.id) &&
          profile?.departmentAreaProfileVersionIds.includes(p.id),
      )
      .flatMap((p) => p.areaDefinitionRevisionIds);
    const areas = catalog.areas.filter(
      (a) => areaIds.includes(a.id) && a.code === identity.area,
    );
    const area = areas[0];
    if (areas.length !== 1)
      throw new ApplicationError(
        'PERSISTENCE',
        'Selected configuration is unavailable or invalid.',
      );
    return { ...identity, areaDefinitionRevisionId: area.id };
  }

  async create(
    raw: StudyCreateInput,
    commandId: string,
  ): Promise<StudyIdentity> {
    const input = studyCreateSchema.parse(raw);
    if (!commandId || commandId.length > 200)
      throw new ApplicationError(
        'VALIDATION',
        'Creation request changed. Start a new request.',
      );
    if (!(await this.departments()).includes(input.departmentId))
      throw new ApplicationError(
        'FORBIDDEN',
        'Study creation is not permitted for this department.',
      );
    const context = (await this.contexts()).find(
      (c) =>
        c.packageVersionId === input.packageVersionId &&
        c.experimentTypeProfileVersionId ===
          input.experimentTypeProfileVersionId &&
        c.subjectTypeRevisionId === input.subjectTypeRevisionId &&
        c.areaDefinitionRevisionId === input.areaDefinitionRevisionId,
    );
    if (!context)
      throw new ApplicationError(
        'FORBIDDEN',
        'Selected configuration is unavailable or invalid.',
      );
    const receiptId = `study-create:${createHash('sha256')
      .update(JSON.stringify([this.principalId, commandId]))
      .digest('hex')}`;
    const requestHash = createHash('sha256')
      .update(JSON.stringify(input))
      .digest('hex');
    const receipt = (
      await this.sql.query<{ request_hash: string; series_slug: string }>(
        `SELECT r.request_hash,s.series_slug FROM study_setup_command_receipt r JOIN study s USING(study_id) WHERE r.command_id=$1`,
        [receiptId],
      )
    ).rows[0];
    if (receipt) {
      if (receipt.request_hash !== requestHash)
        throw new ApplicationError(
          'CONFLICT',
          'Creation request changed. Start a new request.',
        );
      return this.get(receipt.series_slug);
    }
    const key = createHash('sha256').update(receiptId).digest('hex');
    const id = `${key.slice(0, 8)}-${key.slice(8, 12)}-4${key.slice(13, 16)}-8${key.slice(17, 20)}-${key.slice(20, 32)}`;
    const setupId = randomUUID(),
      seriesId = `study-${id}`;
    const inserted = await this.sql.query(
      `INSERT INTO study(study_id,series_slug,series_domain_id,display_name,experiment_type,intent,next_run_number)
      VALUES($1,$2,$3,$4,$5,$6,1) ON CONFLICT DO NOTHING RETURNING study_id`,
      [
        id,
        input.slug,
        seriesId,
        input.name,
        context.experimentType,
        input.intent,
      ],
    );
    if (!inserted.rows.length)
      throw new ApplicationError(
        'CONFLICT',
        'Study ID is unavailable. Choose another ID.',
      );
    await this.sql.query(
      `INSERT INTO study_setup_version(setup_version_id,setup_domain_id,study_id,revision,configuration_package_version_id,experiment_type_profile_version_id,subject_type_revision_id,area,updated_at)
      VALUES($1,$2,$3,1,$4,$5,$6,$7,clock_timestamp())`,
      [
        setupId,
        `${seriesId}-default-r1`,
        id,
        input.packageVersionId,
        input.experimentTypeProfileVersionId,
        input.subjectTypeRevisionId,
        context.area,
      ],
    );
    await this.sql.query(
      'UPDATE study SET current_setup_version_id=$2 WHERE study_id=$1',
      [id, setupId],
    );
    await this.sql.query(
      'INSERT INTO study_access(study_id,responsible_user_id,responsible_department_id) VALUES($1,$2,$3)',
      [id, this.principalId, input.departmentId],
    );
    await this.sql.query(
      'INSERT INTO study_setup_command_receipt(study_id,command_id,request_hash,setup_version_id) VALUES($1,$2,$3,$4)',
      [id, receiptId, requestHash, setupId],
    );
    return this.get(input.slug);
  }
}
