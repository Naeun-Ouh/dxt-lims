import type { Locale } from '@/src/shared/i18n/messages';
const labels = {
  evidenceLocked: ['Execution, Measurement or judgment evidence has been recorded. The original Plan is protected.', '실행·계측 또는 판단 기록이 있어 원래 계획을 보호합니다.'],
  sourceUnavailable: [
    'Complete valid Operation and condition selections to edit Recipe Source materials.',
    'Recipe Source 소재를 편집하려면 공정과 조건의 유효하지 않은 선택을 먼저 수정하세요.',
  ],
  title: ['Operation design', '공정 설계'],
  common: ['Operation common', '공정 공통'],
  grouped: ['Split design', 'Split 설계'],
  addBase: ['Add Base', 'Base 추가'],
  addSplit: ['Add Split Group', 'Split Group 추가'],
  group: ['Group', 'Group'],
  rename: ['Group name', 'Group 이름'],
  duplicate: ['Duplicate conditions', '조건 복제'],
  delete: ['Delete Group', 'Group 삭제'],
  deleteWarning: [
    'Delete this Group? Its Subjects become Unassigned and its scoped conditions are removed. Subject overrides are retained.',
    'Group을 삭제할까요? 소속 대상은 미할당으로 바뀌며 Group 조건은 제거됩니다. 대상별 예외 조건은 유지됩니다.',
  ],
  commonAction: [
    'Use common Operation for all Subjects',
    '모든 대상에 일반 공정 적용',
  ],
  commonWarning: [
    'Switch all Subjects to common Operation? Group conditions are removed; Subject overrides are retained.',
    '모든 대상을 일반 공정으로 전환할까요? Group 조건은 제거되며 대상별 예외 조건은 유지됩니다.',
  ],
  COMMON: ['Common', '공통 적용'],
  ASSIGNED: ['Assigned', 'Group 배정'],
  SKIP: ['Skip', '계획 Skip'],
  UNASSIGNED: ['Unassigned', '미할당'],
  LEGACY_EXCLUDED: [
    'Legacy excluded (reason not recorded)',
    '기존 미적용 (사유 미기록)',
  ],
  warning: [
    'Unassigned and Missing are warnings. They do not prevent Run creation or saving. Skip never creates an Actual event.',
    '미할당과 누락은 경고이며 차수 생성·저장을 차단하지 않습니다. 계획 Skip은 실제 수행 기록을 생성하지 않습니다.',
  ],
  commonHelp: [
    'Operation common values are separate from Base. Groups do not inherit Base values.',
    '공정 공통 조건은 Base와 별개이며 다른 Group은 Base 값을 상속하지 않습니다.',
  ],
  inherit: ['Inherit', '상속'],
  explicit: ['Explicit value', '명시값'],
  source: ['Effective value source', '유효값 원천'],
  override: ['Subject override (exception)', '대상별 예외 조건'],
  clear: ['Clear override', '예외 조건 해제'],
  effective: ['Effective value', '최종 유효값'],
  missing: ['Missing (warning)', '누락 (경고)'],
  invalid: ['Invalid', '유효하지 않음'],
  conditions: ['Conditions / Recipe', '조건 / Recipe'],
  edit: ['Edit detail', '상세 편집'],
  focus: ['Manual focus', '관심 공정'],
  focusOnly: ['Focused Operations only', '관심 공정만 보기'],
  focusHelp: [
    'Focus changes this view only. It never changes Group, Skip, Plan or Actual data.',
    '관심 공정은 조회에만 적용됩니다. Group, Skip, 계획 및 실제 데이터는 변경하지 않습니다.',
  ],
  search: ['Find Operation', '공정 검색'],
  previous: ['Previous page', '이전 페이지'],
  next: ['Next page', '다음 페이지'],
  noOperations: ['No matching Operations', '표시할 공정이 없습니다'],
  expand: ['Expand Operation', '공정 펼치기'],
  collapse: ['Collapse Operation', '공정 접기'],
  selectedScope: ['Editing scope', '편집 범위'],
  allocation: ['Subject allocation', '실험 대상 배정'],
  retained: [
    'Subject overrides are retained when reassigned or skipped. Clear them explicitly when no longer needed.',
    '재배정·Skip 시 대상별 예외값을 유지합니다. 필요 없으면 명시적으로 해제하세요.',
  ],
  scopeRequired: [
    'Choose an Operation or Group to edit conditions.',
    '공정 또는 Group을 선택해 조건을 편집하세요.',
  ],
  legacy: [
    'Legacy plan interpretation is preserved.',
    '기존 계획 해석을 유지합니다.',
  ],
  unsaved: [
    'Operation design changes are not saved yet.',
    '공정 설계 변경사항이 아직 저장되지 않았습니다.',
  ],
} as const;
export const groupText = (locale: Locale, key: keyof typeof labels) =>
  labels[key][locale === 'ko' ? 1 : 0];
