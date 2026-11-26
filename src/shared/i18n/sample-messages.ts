import type { Locale } from './messages';
const labels = {
  CURRENT: ['Current Plan selection', '현재 계획 선택'],
  HISTORICAL: ['Historical selection', '과거 선택 이력'],
  samples: ['Samples', '샘플'],
  create: ['Register Sample', '샘플 등록'],
  revise: ['Create Revision', '개정 생성'],
  save: ['Save Sample', '샘플 저장'],
  saveRevision: ['Save Revision', '개정 저장'],
  cancel: ['Cancel', '취소'],
  search: ['Search', '검색'],
  input: ['Input', '입력값'],
  code: ['Sample code', '샘플 코드'],
  name: ['Name', '이름'],
  org: ['Owning organization', '소유 조직'],
  description: ['Description', '설명'],
  revision: ['Revision', '개정'],
  latest: ['Latest revision', '최신 개정'],
  effective: ['Effective date', '적용일'],
  source: ['Registration source', '등록 경로'],
  request: ['Request number', '요청 번호'],
  development: ['Development item number', '개발 항목 번호'],
  composition: ['Composition', '조성'],
  nodes: ['Composition nodes', '조성 노드'],
  edges: ['Composition links', '조성 연결'],
  properties: ['Properties', '물성'],
  add: ['Add', '추가'],
  remove: ['Remove', '제거'],
  parent: ['Parent node', '상위 노드'],
  child: ['Child node', '하위 노드'],
  ratio: ['Ratio', '비율'],
  unit: ['Unit', '단위'],
  value: ['Value', '값'],
  type: ['Type', '유형'],
  reference: ['Exact reference', '정확한 참조'],
  definition: ['Property definition', '물성 정의'],
  node: ['Node', '노드'],
  label: ['Label', '표시 이름'],
  status: ['Status', '상태'],
  history: ['Revision history', '개정 이력'],
  usage: ['Exact revision Plan usage history', '정확한 개정 계획 사용 이력'],
  planOnly: [
    'Plan usage is not Actual consumption. Historical revisions remain unchanged.',
    '계획 사용은 실제 소비를 뜻하지 않습니다. 과거 개정은 변경되지 않습니다.',
  ],
  empty: ['No accessible Samples.', '조회 가능한 샘플이 없습니다.'],
  loading: ['Loading…', '불러오는 중…'],
  readOnly: [
    'Read only: explicit revision permission required.',
    '읽기 전용: 개정 작성 권한이 필요합니다.',
  ],
  noRegister: [
    'Sample registration requires an explicit organization-scoped permission.',
    '샘플 등록에는 조직 범위의 명시적 권한이 필요합니다.',
  ],
  selectRevision: [
    'Registered Sample Revision (optional)',
    '등록 샘플 개정 (선택 사항)',
  ],
  unlinked: ['No registered Sample Revision selected', '등록 샘플 개정 미선택'],
  lookup: ['Find Sample Revision', '샘플 개정 조회'],
  clear: ['Clear Sample selection', '샘플 선택 해제'],
  denied: [
    'Selected Sample revision is unavailable. Clear the selection or request access.',
    '선택한 샘플 개정을 조회할 수 없습니다. 선택을 해제하거나 권한을 요청하세요.',
  ],
  error: [
    'Could not complete the action. Check your input and try again.',
    '작업을 완료하지 못했습니다. 입력값을 확인한 후 다시 시도해 주세요.',
  ],
  conflict: [
    'Sample changed or the code is already used. Reload and check your input.',
    '샘플이 변경되었거나 코드가 이미 사용 중입니다. 새로고침 후 입력값을 확인하세요.',
  ],
  invalid: [
    'Check the marked fields and composition links. Your input has been retained.',
    '표시된 입력값과 조성 연결을 확인하세요. 입력 내용은 유지됩니다.',
  ],
  forbidden: [
    'Explicit Sample permission is required. Contact your administrator.',
    '명시적 샘플 권한이 필요합니다. 관리자에게 문의하세요.',
  ],
  missing: [
    'Sample unavailable or access denied.',
    '샘플이 없거나 조회 권한이 없습니다.',
  ],
  previous: ['Previous', '이전'],
  next: ['Next', '다음'],
  saved: [
    'Saved. Exact revision reloaded.',
    '저장되었습니다. 정확한 개정을 다시 불러왔습니다.',
  ],
  identity: ['Sample identity', '샘플 식별 정보'],
  snapshot: ['Immutable revision snapshot', '변경 불가 개정 스냅샷'],
  root: ['Revision root', '개정 루트'],
  author: ['Source', '출처'],
  nullable: [
    'Supplier and material identity links remain unset until verified references are available.',
    '검증 가능한 참조가 준비될 때까지 공급사·재료 식별 연결은 미설정으로 유지됩니다.',
  ],
  selected: ['Selected', '선택됨'],
  DIRECT_REGISTRATION: ['Direct registration', '직접 등록'],
  INTERNAL_REQUEST: ['Internal request', '내부 요청'],
  SUPPLIER_REQUEST: ['Supplier request', '공급사 요청'],
  RAW_MATERIAL: ['Raw material', '원재료'],
  INTERMEDIATE: ['Intermediate', '중간재'],
  SAMPLE_REVISION: ['Sample revision', '샘플 개정'],
  NUMBER: ['Number', '숫자'],
  TEXT: ['Text', '문자'],
  BOOLEAN: ['Boolean', '참/거짓'],
  IMAGE: ['Image reference', '이미지 참조'],
  DIRECT_ENTRY: ['Direct entry', '직접 입력'],
  SUPPLIER: ['Supplier', '공급사'],
  INTERNAL_MEASUREMENT: ['Internal measurement', '내부 계측'],
  CALCULATED: ['Calculated', '계산'],
  Draft: ['Draft', '초안'],
  Active: ['Active', '활성'],
  Retired: ['Retired', '퇴역'],
  SELECTED: ['Selected', '선택됨'],
  CLEARED: ['Cleared', '해제됨'],
  REMOVED: ['Removed', '제거됨'],
  close: ['Close', '닫기'],
  apply: ['Select revision', '개정 선택'],
  readDetail: ['View exact revision', '정확한 개정 보기'],
  graphHint: [
    'Connect every node to the revision root. References must be verified; snapshots never change earlier revisions.',
    '모든 노드를 개정 루트에 연결하세요. 참조는 검증 가능해야 하며 이전 개정은 변경되지 않습니다.',
  ],
} satisfies Record<string, readonly [string, string]>;
export type SampleMessage = keyof typeof labels;
export function sampleText(locale: Locale, key: SampleMessage) {
  return labels[key][locale === 'ko' ? 1 : 0];
}

/** Turn server field locations into researcher-facing labels, never raw paths. */
export function sampleValidationLabel(locale: Locale, path: string): string {
  const field: Record<string, SampleMessage> = {
    owningOrgId: 'org', sampleCode: 'code', name: 'name', description: 'description',
    effectiveAt: 'effective', registrationSource: 'source', requestNumber: 'request',
    developmentItemNumber: 'development', label: 'label', nodeType: 'type',
    referenceId: 'reference', parentNodeId: 'parent', childNodeId: 'child',
    ratio: 'ratio', unit: 'unit', value: 'value', valueType: 'type',
    propertyDefinitionId: 'definition', materialNodeId: 'node',
  };
  const parts = path.split('.');
  const key = field[parts.at(-1) ?? ''] ?? 'input';
  const collection = parts.findIndex(p => p === 'nodes' || p === 'edges' || p === 'properties');
  if (collection >= 0 && /^\d+$/.test(parts[collection + 1] ?? '')) {
    const group = parts[collection] as 'nodes' | 'edges' | 'properties';
    return `${sampleText(locale, group)} ${Number(parts[collection + 1]) + 1} · ${sampleText(locale, key)}`;
  }
  return sampleText(locale, key);
}
