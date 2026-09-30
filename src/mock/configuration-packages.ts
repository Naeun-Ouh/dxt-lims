import {
  unitSymbol,
  immutableConfigurationPackageVersion,
  InMemoryConfigurationRepository,
  validateConfigurationPackageVersion,
  type ApplicabilityRule,
  type ConfigurationDefinitionDescriptor,
  type ConfigurationPackageVersion,
  type ConfigurationRegistry,
} from '@/src/domain/reference';
import { definitions } from './reference';

const scope = { kind: 'AREA' as const, ownerId: 'semiconductor-rd' };
const materialScope = { kind: 'AREA' as const, ownerId: 'material-rd' };
const versioned = (
  id: string,
  code: string,
  status: 'ACTIVE' | 'INACTIVE' = 'ACTIVE',
) => ({
  id,
  code,
  version: Number(id.match(/v(\d+)$/)?.[1] ?? 1),
  scope,
  status,
});
const subjectGrainId = 'grain-subject-r1';
const waferSubjectId = 'subject-wafer-r1';
const specimenSubjectId = 'subject-specimen-r1';
const editorKey = (valueType: string) =>
  valueType === 'NUMBER' || valueType === 'BOOLEAN' || valueType === 'SELECT'
    ? valueType
    : valueType.endsWith('_REFERENCE') || valueType === 'SAMPLE_REVISION'
      ? 'REFERENCE'
      : 'TEXT';
const conditionIds = [
  'condition-recipe-v1',
  'condition-focus-v1',
  'condition-reticle-v1',
  'condition-material-v1',
  'condition-energy-v1',
  'condition-pressure-v1',
  'condition-slurry-v1',
  'condition-disk-v1',
  'condition-platen-v1',
  'condition-flow-v1',
];
const materialConditionIds = [
  'condition-mixing-speed-v1',
  'condition-coating-thickness-v1',
  'condition-cure-temperature-v1',
  'condition-cure-time-v1',
];
const descriptorForCondition = (
  id: string,
): ConfigurationDefinitionDescriptor => {
  const item = definitions.conditions.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`Missing configuration definition: ${id}`);
  const packageLabel: Record<string, string> = {
    'condition-platen-v1': 'RPM',
    'condition-flow-v1': 'Slurry Flow',
  };
  return {
    revisionId: item.id,
    label: packageLabel[item.id] ?? item.name,
    editorKey: editorKey(item.valueType),
    unitDefinitionRevisionId: item.unitDefinitionId,
    unit: unitSymbol(definitions, item.unitDefinitionId),
    intrinsicAllowedGrainRevisionIds: item.allowedScopes.includes('WAFER')
      ? [subjectGrainId]
      : [],
    intrinsicOptions: item.options.map((option) => ({
      value: option.code,
      label: option.label,
    })),
  };
};

const rule = (
  id: string,
  operationDefinitionRevisionId: string,
  areaDefinitionRevisionId: string,
  equipmentReferenceId: string | string[],
  definitionRevisionId: string,
  assignmentKind: ApplicabilityRule['assignmentKind'],
  assignmentReferenceRevisionId: string,
  defaultValue: string,
  defaultRole: ApplicabilityRule['defaultRole'],
  contextualOptions: ApplicabilityRule['contextualOptions'] = [],
  validationProfileVersionId: string | null = null,
): ApplicabilityRule => ({
  id,
  definitionRevisionId,
  operationDefinitionRevisionIds: [operationDefinitionRevisionId],
  areaDefinitionRevisionIds: [areaDefinitionRevisionId],
  subjectTypeRevisionIds: [waferSubjectId],
  grainDefinitionRevisionIds: [subjectGrainId],
  equipmentReferenceIds: Array.isArray(equipmentReferenceId)
    ? equipmentReferenceId
    : [equipmentReferenceId],
  moduleReferenceIds: [],
  experimentTypeProfileVersionIds: [
    areaDefinitionRevisionId === 'area-photo-v1'
      ? 'experiment-profile-photo-v1'
      : 'experiment-profile-cmp-v1',
  ],
  assignmentKind,
  assignmentReferenceRevisionId,
  defaultValue,
  defaultGrainRevisionId: subjectGrainId,
  defaultRole,
  contextualOptions,
  validationProfileVersionId,
});

const photoRulesV1: ApplicabilityRule[] = [
  rule(
    'photo-recipe-r1',
    'operation-photo-exposure-v1',
    'area-photo-v1',
    ['equipment-exp-01-r1', 'equipment-exp-02-r1', 'equipment-exp-03-r1'],
    'condition-recipe-v1',
    'RECIPE',
    'recipe-exp-r01-r1',
    'EXP-R01',
    'FIXED',
    [
      { value: 'EXP-R01', label: 'EXP-R01', referenceId: 'recipe-exp-r01-r1' },
      { value: 'EXP-R02', label: 'EXP-R02', referenceId: 'recipe-exp-r02-r1' },
    ],
  ),
  rule(
    'photo-focus-r1',
    'operation-photo-exposure-v1',
    'area-photo-v1',
    ['equipment-exp-01-r1', 'equipment-exp-02-r1', 'equipment-exp-03-r1'],
    'condition-focus-v1',
    'CONDITION',
    'condition-focus-v1',
    '0',
    'FIXED',
    [],
    'validation-length-um-v1',
  ),
  rule(
    'photo-reticle-r1',
    'operation-photo-exposure-v1',
    'area-photo-v1',
    ['equipment-exp-01-r1', 'equipment-exp-02-r1', 'equipment-exp-03-r1'],
    'condition-reticle-v1',
    'RESOURCE',
    'resource-reticle-01-v1',
    'RET-01',
    'FIXED',
    [
      {
        value: 'RET-01',
        label: 'RET-01',
        referenceId: 'resource-reticle-01-v1',
      },
    ],
  ),
  rule(
    'photo-material-r1',
    'operation-photo-exposure-v1',
    'area-photo-v1',
    ['equipment-exp-01-r1', 'equipment-exp-02-r1', 'equipment-exp-03-r1'],
    'condition-material-v1',
    'MATERIAL',
    'sample-D035-r2',
    'D035 Rev.2',
    'FIXED',
    [
      {
        value: 'D035 Rev.2',
        label: 'D035 Rev.2',
        referenceId: 'sample-D035-r2',
      },
    ],
  ),
  rule(
    'photo-energy-r1',
    'operation-photo-exposure-v1',
    'area-photo-v1',
    ['equipment-exp-01-r1', 'equipment-exp-02-r1', 'equipment-exp-03-r1'],
    'condition-energy-v1',
    'CONDITION',
    'condition-energy-v1',
    '35',
    'VARIED',
    [],
    'validation-energy-v1',
  ),
];
const photoRulesV2 = photoRulesV1.map((item) =>
  item.definitionRevisionId === 'condition-energy-v1'
    ? {
        ...item,
        id: 'photo-energy-r2',
        defaultValue: '40',
        defaultRole: 'FIXED' as const,
      }
    : { ...item, id: `${item.id}-package-v2` },
);
const cmpRules: ApplicabilityRule[] = [
  rule(
    'cmp-recipe-r1',
    'operation-m2-cu-cmp-v1',
    'area-cmp-v1',
    ['equipment-cmp-01-r1', 'equipment-cmp-02-r1'],
    'condition-recipe-v1',
    'RECIPE',
    'recipe-cu-r07-r1',
    'CU-R07',
    'FIXED',
    [{ value: 'CU-R07', label: 'CU-R07', referenceId: 'recipe-cu-r07-r1' }],
  ),
  rule(
    'cmp-pressure-r1',
    'operation-m2-cu-cmp-v1',
    'area-cmp-v1',
    ['equipment-cmp-01-r1', 'equipment-cmp-02-r1'],
    'condition-pressure-v1',
    'CONDITION',
    'condition-pressure-v1',
    '3.0 psi',
    'VARIED',
    [],
    'validation-pressure-v1',
  ),
  rule(
    'cmp-slurry-r1',
    'operation-m2-cu-cmp-v1',
    'area-cmp-v1',
    ['equipment-cmp-01-r1', 'equipment-cmp-02-r1'],
    'condition-slurry-v1',
    'RESOURCE',
    'resource-slurry-a-v1',
    'A',
    'VARIED',
    [
      { value: 'A', label: 'Slurry A', referenceId: 'resource-slurry-a-v1' },
      { value: 'B', label: 'Slurry B', referenceId: 'resource-slurry-b-v1' },
    ],
  ),
  rule(
    'cmp-disk-r1',
    'operation-m2-cu-cmp-v1',
    'area-cmp-v1',
    ['equipment-cmp-01-r1', 'equipment-cmp-02-r1'],
    'condition-disk-v1',
    'RESOURCE',
    'resource-disk-d1-v1',
    'D1',
    'FIXED',
    [{ value: 'D1', label: 'Disk D1', referenceId: 'resource-disk-d1-v1' }],
  ),
  rule(
    'cmp-pad-r1',
    'operation-m2-cu-cmp-v1',
    'area-cmp-v1',
    ['equipment-cmp-01-r1', 'equipment-cmp-02-r1'],
    'resource-pad-ic1000-r1',
    'RESOURCE',
    'resource-pad-a-v1',
    'A',
    'VARIED',
    [
      { value: 'A', label: 'Pad A', referenceId: 'resource-pad-a-v1' },
      { value: 'B', label: 'Pad B', referenceId: 'resource-pad-b-v1' },
      { value: 'C', label: 'Pad C', referenceId: 'resource-pad-c-v1' },
      { value: 'D', label: 'Pad D', referenceId: 'resource-pad-d-v1' },
    ],
  ),
  rule(
    'cmp-material-r1',
    'operation-m2-cu-cmp-v1',
    'area-cmp-v1',
    ['equipment-cmp-01-r1', 'equipment-cmp-02-r1'],
    'condition-material-v1',
    'MATERIAL',
    'sample-D035-r2',
    'D035 Rev.2',
    'FIXED',
    [
      {
        value: 'D035 Rev.2',
        label: 'D035 Rev.2',
        referenceId: 'sample-D035-r2',
      },
    ],
  ),
  rule(
    'cmp-rpm-r1',
    'operation-m2-cu-cmp-v1',
    'area-cmp-v1',
    ['equipment-cmp-01-r1', 'equipment-cmp-02-r1'],
    'condition-platen-v1',
    'CONDITION',
    'condition-platen-v1',
    '90',
    'FIXED',
    [],
    'validation-rpm-v1',
  ),
  rule(
    'cmp-flow-r1',
    'operation-m2-cu-cmp-v1',
    'area-cmp-v1',
    ['equipment-cmp-01-r1', 'equipment-cmp-02-r1'],
    'condition-flow-v1',
    'CONDITION',
    'condition-flow-v1',
    '200',
    'FIXED',
    [],
    'validation-flow-v1',
  ),
];

const materialRule = (
  id: string,
  operationDefinitionRevisionId: string,
  definitionRevisionId: string,
  assignmentKind: ApplicabilityRule['assignmentKind'],
  assignmentReferenceRevisionId: string,
  defaultValue: string,
  defaultRole: ApplicabilityRule['defaultRole'] = 'FIXED',
  validationProfileVersionId: string | null = null,
  contextualOptions: ApplicabilityRule['contextualOptions'] = [],
): ApplicabilityRule => ({
  id,
  definitionRevisionId,
  operationDefinitionRevisionIds: [operationDefinitionRevisionId],
  areaDefinitionRevisionIds: ['area-material-rd-v1'],
  subjectTypeRevisionIds: [specimenSubjectId],
  grainDefinitionRevisionIds: [subjectGrainId],
  equipmentReferenceIds: ['equipment-material-manual-r1'],
  moduleReferenceIds: [],
  experimentTypeProfileVersionIds: ['experiment-profile-material-rd-v1'],
  assignmentKind,
  assignmentReferenceRevisionId,
  defaultValue,
  defaultGrainRevisionId: subjectGrainId,
  defaultRole,
  contextualOptions,
  validationProfileVersionId,
});

const materialRules: ApplicabilityRule[] = [
  materialRule(
    'material-formulation-r1', 'operation-material-mix-v1',
    'material-formulation-usage-v1', 'MATERIAL', 'formulation-f-base-01-r1',
    'F-BASE-01', 'FIXED', null,
    [
      { value: 'F-BASE-01', label: 'F-BASE-01', referenceId: 'formulation-f-base-01-r1' },
      { value: 'F-BASE-01', label: 'F-BASE-01', referenceId: 'formulation-f-base-01-r2' },
    ],
  ),
  materialRule(
    'material-mixing-speed-r1', 'operation-material-mix-v1',
    'condition-mixing-speed-v1', 'CONDITION', 'condition-mixing-speed-v1',
    '500', 'FIXED', 'validation-material-rpm-v1',
  ),
  materialRule(
    'material-coating-thickness-r1', 'operation-material-coat-v1',
    'condition-coating-thickness-v1', 'CONDITION', 'condition-coating-thickness-v1',
    '20', 'FIXED', 'validation-material-um-v1',
  ),
  materialRule(
    'material-cure-temperature-r1', 'operation-material-cure-v1',
    'condition-cure-temperature-v1', 'CONDITION', 'condition-cure-temperature-v1',
    '120', 'VARIED', 'validation-material-celsius-v1',
  ),
  materialRule(
    'material-cure-time-r1', 'operation-material-cure-v1',
    'condition-cure-time-v1', 'CONDITION', 'condition-cure-time-v1',
    '30', 'FIXED', 'validation-material-min-v1',
  ),
];

const nextActionIds = definitions.nextActionTypes.map((item) => item.id);
const photoDefinitionIds = [
  'type-process-v1',
  'area-photo-v1',
  'operation-photo-coat-v1',
  'operation-photo-exposure-v1',
  'measurement-operation-cdsem-v1',
  'parameter-bcd-v1',
  'parameter-3sig-v1',
  ...conditionIds.filter((id) =>
    ['recipe', 'focus', 'reticle', 'material', 'energy'].some((part) =>
      id.includes(part),
    ),
  ),
];
const cmpDefinitionIds = [
  'type-process-v1',
  'area-cmp-v1',
  'operation-m2-cu-cmp-v1',
  'measurement-operation-cmp-metro-v1',
  'parameter-thickness-result-v1',
  'resource-pad-ic1000-r1',
  ...conditionIds.filter(
    (id) => !['focus', 'reticle', 'energy'].some((part) => id.includes(part)),
  ),
];
const materialDefinitionIds = [
  'type-material-v1',
  'area-material-rd-v1',
  'operation-material-mix-v1',
  'operation-material-coat-v1',
  'operation-material-cure-v1',
  'measurement-operation-material-test-v1',
  'parameter-peel-force-v1',
  'parameter-specimen-viscosity-v1',
  'metric-peel-force-v1',
  'metric-specimen-viscosity-v1',
  'material-formulation-usage-v1',
  ...materialConditionIds,
];
const packageVersion = (
  id: string,
  packageId: string,
  version: number,
  status: ConfigurationPackageVersion['status'],
  areaProfile: string,
  experimentProfile: string,
  definitionsForPackage: string[],
  capabilities: string[],
  rules: string,
  validations: string[],
  projection: string,
): ConfigurationPackageVersion =>
  immutableConfigurationPackageVersion({
    id,
    packageId,
    version,
    scope,
    status,
    subjectTypeRevisionIds: [waferSubjectId],
    departmentAreaProfileVersionIds: [areaProfile],
    experimentTypeProfileVersionIds: [experimentProfile],
    definitionRevisionIds: definitionsForPackage,
    equipmentCapabilityProfileVersionIds: capabilities,
    applicabilityRuleSetVersionIds: [rules],
    validationProfileVersionIds: validations,
    projectionProfileVersionIds: [projection],
    nextActionTypeRevisionIds: nextActionIds,
  });

const externalIds = [
  'equipment-exp-01-r1',
  'equipment-exp-02-r1',
  'equipment-exp-03-r1',
  'equipment-cmp-01-r1',
  'equipment-cmp-02-r1',
  'module-exposure-r1',
  'module-platen-2-r1',
  'recipe-exp-r01-r1',
  'recipe-exp-r02-r1',
  'recipe-cu-r07-r1',
  'resource-reticle-01-v1',
  'sample-D035-r2',
  'resource-slurry-a-v1',
  'resource-slurry-b-v1',
  'resource-disk-d1-v1',
  'resource-pad-a-v1',
  'resource-pad-b-v1',
  'resource-pad-c-v1',
  'resource-pad-d-v1',
];
export const registeredConfigurationEditorKeys = [
  'NUMBER',
  'TEXT',
  'BOOLEAN',
  'SELECT',
  'REFERENCE',
] as const;

export const configurationRegistry: ConfigurationRegistry = {
  packages: [
    packageVersion(
      'config-package-photo-v1',
      'config-package-photo',
      1,
      'INACTIVE',
      'area-profile-photo-v1',
      'experiment-profile-photo-v1',
      photoDefinitionIds,
      ['capability-exp-01-v1', 'capability-exp-02-v1', 'capability-exp-03-v1'],
      'rules-photo-v1',
      ['validation-energy-v1', 'validation-length-um-v1'],
      'projection-engineering-grid-photo-v1',
    ),
    packageVersion(
      'config-package-photo-v2',
      'config-package-photo',
      2,
      'ACTIVE',
      'area-profile-photo-v1',
      'experiment-profile-photo-v1',
      photoDefinitionIds,
      ['capability-exp-01-v1', 'capability-exp-02-v1', 'capability-exp-03-v1'],
      'rules-photo-v2',
      ['validation-energy-v1', 'validation-length-um-v1'],
      'projection-engineering-grid-photo-v1',
    ),
    packageVersion(
      'config-package-cmp-v1',
      'config-package-cmp',
      1,
      'ACTIVE',
      'area-profile-cmp-v1',
      'experiment-profile-cmp-v1',
      cmpDefinitionIds,
      ['capability-cmp-01-v1', 'capability-cmp-02-v1'],
      'rules-cmp-v1',
      ['validation-pressure-v1', 'validation-rpm-v1', 'validation-flow-v1'],
      'projection-engineering-grid-cmp-v1',
    ),
    immutableConfigurationPackageVersion({
      id: 'config-package-material-rd-v1',
      packageId: 'config-package-material-rd',
      version: 1,
      scope: materialScope,
      status: 'ACTIVE',
      subjectTypeRevisionIds: [specimenSubjectId],
      departmentAreaProfileVersionIds: ['area-profile-material-rd-v1'],
      experimentTypeProfileVersionIds: ['experiment-profile-material-rd-v1'],
      definitionRevisionIds: materialDefinitionIds,
      equipmentCapabilityProfileVersionIds: ['capability-material-manual-v1'],
      applicabilityRuleSetVersionIds: ['rules-material-rd-v1'],
      validationProfileVersionIds: [
        'validation-material-rpm-v1', 'validation-material-um-v1',
        'validation-material-celsius-v1', 'validation-material-min-v1',
      ],
      projectionProfileVersionIds: ['projection-engineering-grid-material-rd-v1'],
      nextActionTypeRevisionIds: [],
    }),
  ],
  grains: [
    { ...versioned(subjectGrainId, 'SUBJECT'), label: 'Subject', kind: 'BOTH' },
    {
      ...versioned('grain-site-r1', 'SITE'),
      label: 'Site',
      kind: 'OBSERVATION',
    },
  ],
  subjectTypes: [
    {
      ...versioned(waferSubjectId, 'WAFER'),
      label: 'Wafer',
      assignmentGrainRevisionIds: [subjectGrainId],
      observationGrainRevisionIds: [subjectGrainId, 'grain-site-r1'],
    },
    {
      ...versioned(specimenSubjectId, 'SPECIMEN'),
      scope: materialScope,
      label: 'Specimen',
      assignmentGrainRevisionIds: [subjectGrainId],
      observationGrainRevisionIds: [subjectGrainId],
    },
  ],
  departmentAreaProfiles: [
    {
      ...versioned('area-profile-photo-v1', 'PHOTO_PROFILE'),
      areaDefinitionRevisionIds: ['area-photo-v1'],
      subjectTypeRevisionIds: [waferSubjectId],
      operationDefinitionRevisionIds: [
        'operation-photo-coat-v1',
        'operation-photo-exposure-v1',
        'measurement-operation-cdsem-v1',
      ],
    },
    {
      ...versioned('area-profile-cmp-v1', 'CMP_PROFILE'),
      areaDefinitionRevisionIds: ['area-cmp-v1'],
      subjectTypeRevisionIds: [waferSubjectId],
      operationDefinitionRevisionIds: [
        'operation-m2-cu-cmp-v1',
        'measurement-operation-cmp-metro-v1',
      ],
    },
    {
      ...versioned('area-profile-material-rd-v1', 'MATERIAL_RND_PROFILE'),
      scope: materialScope,
      areaDefinitionRevisionIds: ['area-material-rd-v1'],
      subjectTypeRevisionIds: [specimenSubjectId],
      operationDefinitionRevisionIds: [
        'operation-material-mix-v1', 'operation-material-coat-v1',
        'operation-material-cure-v1', 'measurement-operation-material-test-v1',
      ],
    },
  ],
  experimentTypeProfiles: [
    {
      ...versioned('experiment-profile-photo-v1', 'PHOTO_PROCESS_EXPERIMENT'),
      experimentTypeDefinitionRevisionId: 'type-process-v1',
      departmentAreaProfileVersionIds: ['area-profile-photo-v1'],
      subjectTypeRevisionIds: [waferSubjectId],
    },
    {
      ...versioned('experiment-profile-cmp-v1', 'CMP_PROCESS_EXPERIMENT'),
      experimentTypeDefinitionRevisionId: 'type-process-v1',
      departmentAreaProfileVersionIds: ['area-profile-cmp-v1'],
      subjectTypeRevisionIds: [waferSubjectId],
    },
    {
      ...versioned('experiment-profile-material-rd-v1', 'MATERIAL_EXPERIMENT'),
      scope: materialScope,
      experimentTypeDefinitionRevisionId: 'type-material-v1',
      departmentAreaProfileVersionIds: ['area-profile-material-rd-v1'],
      subjectTypeRevisionIds: [specimenSubjectId],
    },
  ],
  equipmentCapabilityProfiles: [
    {
      ...versioned('capability-exp-01-v1', 'EXP_01'),
      equipmentReferenceId: 'equipment-exp-01-r1',
      moduleReferenceIds: ['module-exposure-r1'],
      operationDefinitionRevisionIds: ['operation-photo-exposure-v1'],
      recipeReferenceRevisionIds: ['recipe-exp-r01-r1', 'recipe-exp-r02-r1'],
      definitionRevisionIds: photoRulesV1.map(
        (item) => item.definitionRevisionId,
      ),
    },
    {
      ...versioned('capability-exp-02-v1', 'EXP_02'),
      equipmentReferenceId: 'equipment-exp-02-r1',
      moduleReferenceIds: ['module-exposure-r1'],
      operationDefinitionRevisionIds: ['operation-photo-exposure-v1'],
      recipeReferenceRevisionIds: ['recipe-exp-r01-r1', 'recipe-exp-r02-r1'],
      definitionRevisionIds: photoRulesV1.map(
        (item) => item.definitionRevisionId,
      ),
    },
    {
      ...versioned('capability-exp-03-v1', 'EXP_03'),
      equipmentReferenceId: 'equipment-exp-03-r1',
      moduleReferenceIds: ['module-exposure-r1'],
      operationDefinitionRevisionIds: ['operation-photo-exposure-v1'],
      recipeReferenceRevisionIds: ['recipe-exp-r01-r1', 'recipe-exp-r02-r1'],
      definitionRevisionIds: photoRulesV1.map(
        (item) => item.definitionRevisionId,
      ),
    },
    {
      ...versioned('capability-cmp-01-v1', 'CMP_01'),
      equipmentReferenceId: 'equipment-cmp-01-r1',
      moduleReferenceIds: ['module-platen-2-r1'],
      operationDefinitionRevisionIds: ['operation-m2-cu-cmp-v1'],
      recipeReferenceRevisionIds: ['recipe-cu-r07-r1'],
      definitionRevisionIds: cmpRules.map((item) => item.definitionRevisionId),
    },
    {
      ...versioned('capability-cmp-02-v1', 'CMP_02'),
      equipmentReferenceId: 'equipment-cmp-02-r1',
      moduleReferenceIds: ['module-platen-2-r1'],
      operationDefinitionRevisionIds: ['operation-m2-cu-cmp-v1'],
      recipeReferenceRevisionIds: ['recipe-cu-r07-r1'],
      definitionRevisionIds: cmpRules.map((item) => item.definitionRevisionId),
    },
    {
      ...versioned('capability-material-manual-v1', 'MATERIAL_MANUAL'),
      scope: materialScope,
      equipmentReferenceId: 'equipment-material-manual-r1',
      moduleReferenceIds: [],
      operationDefinitionRevisionIds: [
        'operation-material-mix-v1', 'operation-material-coat-v1',
        'operation-material-cure-v1', 'measurement-operation-material-test-v1',
      ],
      recipeReferenceRevisionIds: [],
      definitionRevisionIds: materialRules.map((item) => item.definitionRevisionId),
    },
  ],
  applicabilityRuleSets: [
    {
      ...versioned('rules-photo-v1', 'PHOTO_RULES', 'INACTIVE'),
      rules: photoRulesV1,
    },
    { ...versioned('rules-photo-v2', 'PHOTO_RULES'), rules: photoRulesV2 },
    { ...versioned('rules-cmp-v1', 'CMP_RULES'), rules: cmpRules },
    {
      ...versioned('rules-material-rd-v1', 'MATERIAL_RND_RULES'),
      scope: materialScope,
      rules: materialRules,
    },
  ],
  validationProfiles: [
    {
      ...versioned('validation-number-unitless-v1', 'NUMBER_UNITLESS'),
      editorKey: 'NUMBER',
      unitDefinitionRevisionId: null,
      required: true,
    },
    {
      ...versioned('validation-energy-v1', 'EXPOSURE_DOSE'),
      editorKey: 'NUMBER',
      unitDefinitionRevisionId: 'unit-mj-cm2',
      required: true,
    },
    {
      ...versioned('validation-length-um-v1', 'LENGTH_UM'),
      editorKey: 'NUMBER',
      unitDefinitionRevisionId: 'unit-um',
      required: true,
    },
    {
      ...versioned('validation-pressure-v1', 'PRESSURE'),
      editorKey: 'NUMBER',
      unitDefinitionRevisionId: 'unit-psi',
      required: true,
    },
    {
      ...versioned('validation-rpm-v1', 'RPM'),
      editorKey: 'NUMBER',
      unitDefinitionRevisionId: 'unit-rpm',
      required: true,
    },
    {
      ...versioned('validation-flow-v1', 'FLOW'),
      editorKey: 'NUMBER',
      unitDefinitionRevisionId: 'unit-ml-min',
      required: true,
    },
    ...([
      ['validation-material-rpm-v1', 'MATERIAL_RPM', 'unit-rpm'],
      ['validation-material-um-v1', 'MATERIAL_LENGTH', 'unit-um'],
      ['validation-material-celsius-v1', 'MATERIAL_TEMPERATURE', 'unit-celsius'],
      ['validation-material-min-v1', 'MATERIAL_TIME', 'unit-min'],
    ] as const).map(([id, code, unitDefinitionRevisionId]) => ({
      ...versioned(id, code), scope: materialScope, editorKey: 'NUMBER',
      unitDefinitionRevisionId, required: true,
    })),
  ],
  projectionProfiles: [
    {
      ...versioned(
        'projection-engineering-grid-photo-v1',
        'ENGINEERING_GRID_PHOTO',
      ),
      workspaceProjectionKey: 'ENGINEERING_GRID',
      editorKeys: [...registeredConfigurationEditorKeys],
    },
    {
      ...versioned('projection-engineering-grid-material-rd-v1', 'ENGINEERING_GRID_MATERIAL_RND'),
      scope: materialScope,
      workspaceProjectionKey: 'ENGINEERING_GRID',
      editorKeys: [...registeredConfigurationEditorKeys],
    },
    {
      ...versioned(
        'projection-engineering-grid-cmp-v1',
        'ENGINEERING_GRID_CMP',
      ),
      workspaceProjectionKey: 'ENGINEERING_GRID',
      editorKeys: [...registeredConfigurationEditorKeys],
    },
  ],
  definitionDescriptors: [
    ...conditionIds.map(descriptorForCondition),
    ...materialConditionIds.map(descriptorForCondition),
    {
      revisionId: 'material-formulation-usage-v1', label: 'Formulation',
      editorKey: 'REFERENCE', unitDefinitionRevisionId: null, unit: '',
      intrinsicAllowedGrainRevisionIds: [subjectGrainId],
      intrinsicOptions: [
        { value: 'F-BASE-01', label: 'F-BASE-01', referenceId: 'formulation-f-base-01-r1' },
        { value: 'F-BASE-01', label: 'F-BASE-01', referenceId: 'formulation-f-base-01-r2' },
      ],
    },
    {
      revisionId: 'resource-pad-ic1000-r1',
      label: 'Pad',
      editorKey: 'REFERENCE',
      unitDefinitionRevisionId: null,
      unit: '',
      intrinsicAllowedGrainRevisionIds: [subjectGrainId],
      intrinsicOptions: [],
    },
  ],
  externalReferences: [
    ...externalIds.map((id) => ({ id, scope })),
    ...[
      'equipment-material-manual-r1', 'material-formulation-usage-v1',
      'formulation-f-base-01-r1', 'formulation-f-base-01-r2', 'raw-material-a-r1',
      'raw-material-b-r1', 'raw-material-additive-c-r1',
    ].map((id) => ({ id, scope: materialScope })),
  ],
};

export const configurationRepository = new InMemoryConfigurationRepository(
  configurationRegistry,
);

export function validateConfigurationFixtures() {
  return configurationRegistry.packages.map((item) =>
    validateConfigurationPackageVersion(
      item,
      configurationRegistry,
      definitions,
      registeredConfigurationEditorKeys,
    ),
  );
}
