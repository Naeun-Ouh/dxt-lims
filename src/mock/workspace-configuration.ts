import type {
  ApplicableReferences,
  WorkspaceOperation,
} from '@/src/features/run-registration/workspace-model';
import { definitions } from './reference';
import type { ConfigurationRegistrySource } from '@/src/domain/reference';

type OperationSeed = [
  string,
  number,
  string,
  string,
  'PROCESS' | 'MEASUREMENT',
  string,
  string,
  string,
  string,
  number,
];
const operation = (
  seed: OperationSeed,
  areaDefinitionRevisionId: string,
): WorkspaceOperation => {
  const [
    id,
    sequence,
    name,
    shortName,
    role,
    area,
    equipment,
    module,
    recipe,
    inheritedCount,
  ] = seed;
  const configured = {
    'photo-coat': ['operation-photo-coat-v1', 'equipment-coat-02-r1', null],
    'photo-exposure': [
      'operation-photo-exposure-v1',
      'equipment-exp-03-r1',
      'module-exposure-r1',
    ],
    'photo-cdsem': [
      'measurement-operation-cdsem-v1',
      'equipment-cdsem-04-r1',
      'module-cdsem-r1',
    ],
    'cmp-process': [
      'operation-m2-cu-cmp-v1',
      'equipment-cmp-01-r1',
      'module-platen-2-r1',
    ],
    'cmp-thk-pre': [
      'measurement-operation-cmp-metro-v1',
      'equipment-thk-02-r1',
      'module-thk-r1',
    ],
    'cmp-thk-post': [
      'measurement-operation-cmp-metro-v1',
      'equipment-thk-02-r1',
      'module-thk-r1',
    ],
    'material-mix': ['operation-material-mix-v1', 'equipment-material-manual-r1', null],
    'material-coat': ['operation-material-coat-v1', 'equipment-material-manual-r1', null],
    'material-cure': ['operation-material-cure-v1', 'equipment-material-manual-r1', null],
    'material-test': ['measurement-operation-material-test-v1', 'equipment-material-manual-r1', null],
  }[id] ?? [`operation-context-${id}-r1`, `equipment-context-${id}-r1`, null];
  return {
    id,
    sequence,
    name,
    shortName,
    role,
    area,
    equipment,
    module,
    recipe,
    inheritedCount,
    operationDefinitionRevisionId: configured[0]!,
    areaDefinitionRevisionId,
    equipmentReferenceId: configured[1]!,
    moduleReferenceId: configured[2],
    focus: [
      'photo-coat',
      'photo-exposure',
      'photo-cdsem',
      'cmp-thk-pre',
      'cmp-process',
      'cmp-thk-post',
    ].includes(id),
    applicationPoints:
      id === 'photo-exposure'
        ? ['PR → Wafer Surface', 'Reticle → Optical Position']
        : id === 'cmp-process'
          ? ['Slurry → Slurry Line', 'Pad → Platen', 'Disk → Conditioner']
          : [],
  };
};
const photo = (
  [
    [
      'clean',
      10,
      'CLEAN',
      'CLEAN',
      'PROCESS',
      'PHOTO',
      'WET-01',
      'Clean Module',
      'CLN-R02',
      32,
    ],
    [
      'photo-coat',
      20,
      'COAT',
      'COAT',
      'PROCESS',
      'PHOTO',
      'COAT-02',
      'Coater Bowl 1',
      'COAT-R14',
      44,
    ],
    [
      'soft-bake',
      30,
      'SOFT BAKE',
      'BAKE',
      'PROCESS',
      'PHOTO',
      'BAKE-04',
      'Hot Plate 2',
      'SB-R03',
      26,
    ],
    [
      'photo-exposure',
      40,
      'EXPOSURE',
      'EXPOSE',
      'PROCESS',
      'PHOTO',
      'EXP-03',
      'Exposure Module',
      'EXP-R01',
      48,
    ],
    [
      'peb',
      50,
      'PEB',
      'PEB',
      'PROCESS',
      'PHOTO',
      'BAKE-04',
      'Hot Plate 3',
      'PEB-R02',
      21,
    ],
    [
      'develop',
      60,
      'DEVELOP',
      'DEV',
      'PROCESS',
      'PHOTO',
      'DEV-02',
      'Developer Module',
      'DEV-R06',
      39,
    ],
    [
      'photo-cdsem',
      70,
      'CD-SEM',
      'CDSEM',
      'MEASUREMENT',
      'METROLOGY',
      'CDSEM-04',
      'Measurement Chamber',
      'MEAS-R01',
      18,
    ],
    [
      'photo-etch',
      80,
      'ETCH',
      'ETCH',
      'PROCESS',
      'ETCH',
      'Context equipment',
      'Manufacturing context',
      'Context recipe',
      0,
    ],
    [
      'photo-clean-after',
      90,
      'CLEAN',
      'CLEAN',
      'PROCESS',
      'PHOTO',
      'Context equipment',
      'Manufacturing context',
      'Context recipe',
      0,
    ],
  ] as OperationSeed[]
).map((seed) => operation(seed, 'area-photo-v1'));
const cmp = (
  [
    [
      'cmp-clean-before',
      0,
      'CLEAN',
      'CLEAN',
      'PROCESS',
      'CMP',
      'Context equipment',
      'Manufacturing context',
      'Context recipe',
      0,
    ],
    [
      'cmp-thk-pre',
      10,
      'THK PRE',
      'THK PRE',
      'MEASUREMENT',
      'METROLOGY',
      'THK-02',
      'Metrology Stage',
      'THK-M01',
      14,
    ],
    [
      'cmp-process',
      20,
      'M2 CU CMP',
      'CMP',
      'PROCESS',
      'CMP',
      'CMP-01',
      'Platen 2',
      'CU-R07',
      52,
    ],
    [
      'cmp-thk-post',
      30,
      'THK POST',
      'THK POST',
      'MEASUREMENT',
      'METROLOGY',
      'THK-02',
      'Metrology Stage',
      'THK-M01',
      14,
    ],
    [
      'cmp-clean-after',
      40,
      'CLEAN',
      'CLEAN',
      'PROCESS',
      'CMP',
      'Context equipment',
      'Manufacturing context',
      'Context recipe',
      0,
    ],
  ] as OperationSeed[]
).map((seed) => operation(seed, 'area-cmp-v1'));
const material = (
  [
    ['material-mix', 10, 'MIX', 'MIX', 'PROCESS', 'MATERIAL R&D', 'Manual Bench', 'Manual', '—', 0],
    ['material-coat', 20, 'COAT', 'COAT', 'PROCESS', 'MATERIAL R&D', 'Coating Bench', 'Manual', '—', 0],
    ['material-cure', 30, 'CURE', 'CURE', 'PROCESS', 'MATERIAL R&D', 'Cure Oven', 'Manual', '—', 0],
    ['material-test', 40, 'TEST', 'TEST', 'MEASUREMENT', 'MATERIAL R&D', 'Test Stand', 'Manual', '—', 0],
  ] as OperationSeed[]
).map((seed) => operation(seed, 'area-material-rd-v1'));

const operationFixturesByPackageVersionId: Record<
  string,
  WorkspaceOperation[]
> = {
  'config-package-photo-v1': photo,
  'config-package-photo-v2': photo,
  'config-package-cmp-v1': cmp,
  'config-package-material-rd-v1': material,
};
export function workspaceOperationsForPackage(
  configurationPackageVersionId: string,
) {
  const result =
    operationFixturesByPackageVersionId[configurationPackageVersionId];
  if (!result)
    throw new Error(
      `Unresolved pinned Workspace package fixture: ${configurationPackageVersionId}`,
    );
  return result;
}
const unique = (values: string[]) => [...new Set(values)];
const equipmentLabel = (referenceId: string) =>
  referenceId
    .replace(/^equipment-/, '')
    .replace(/-r\d+$/, '')
    .toUpperCase();
export function referenceProjectionForOperation(
  operation: WorkspaceOperation,
  configurationPackageVersionId: string,
  source: ConfigurationRegistrySource,
): ApplicableReferences {
  const configurationRegistry =
    source.getConfigurationRegistry();
  const packageVersion = configurationRegistry.packages.find(
    (item) => item.id === configurationPackageVersionId,
  );
  if (!packageVersion)
    throw new Error(
      `Unresolved pinned Workspace package fixture: ${configurationPackageVersionId}`,
    );
  const capabilities = configurationRegistry.equipmentCapabilityProfiles.filter(
    (item) =>
      packageVersion.equipmentCapabilityProfileVersionIds.includes(item.id) &&
      item.operationDefinitionRevisionIds.includes(
        operation.operationDefinitionRevisionId,
      ),
  );
  const rules = configurationRegistry.applicabilityRuleSets
    .filter((item) =>
      packageVersion.applicabilityRuleSetVersionIds.includes(item.id),
    )
    .flatMap((item) => item.rules)
    .filter(
      (item) =>
        item.operationDefinitionRevisionIds.includes(
          operation.operationDefinitionRevisionId,
        ) &&
        (!item.areaDefinitionRevisionIds.length ||
          item.areaDefinitionRevisionIds.includes(
            operation.areaDefinitionRevisionId,
          )),
    );
  const descriptor = (revisionId: string) =>
    configurationRegistry.definitionDescriptors.find(
      (item) => item.revisionId === revisionId,
    );
  const labels = (kind: (typeof rules)[number]['assignmentKind']) =>
    unique(
      rules
        .filter((item) => item.assignmentKind === kind)
        .flatMap((item) =>
          item.contextualOptions.length
            ? item.contextualOptions.map((option) => option.label)
            : [
                descriptor(item.definitionRevisionId)?.label ??
                  item.defaultValue,
              ],
        ),
    );
  const measurementParameters = definitions.parameters
    .filter(
      (item) =>
        item.measurementOperationDefinitionId ===
        operation.operationDefinitionRevisionId,
    )
    .filter((item) => item.semanticRole === 'MEASUREMENT')
    .map((item) => item.name);
  return {
    equipment: capabilities.length
      ? capabilities.map((item) => equipmentLabel(item.equipmentReferenceId))
      : [operation.equipment],
    recipes: labels('RECIPE').length ? labels('RECIPE') : [operation.recipe],
    parameters: unique([
      ...rules
        .filter((item) => item.assignmentKind === 'CONDITION')
        .map(
          (item) =>
            descriptor(item.definitionRevisionId)?.label ?? item.defaultValue,
        )
        .sort(),
      ...measurementParameters,
    ]),
    materials: labels('MATERIAL'),
    resources: labels('RESOURCE'),
  };
}
