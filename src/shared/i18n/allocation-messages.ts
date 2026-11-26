import type {RunPlanningSnapshot} from '@/src/features/run-registration/planning-model';
import {allocationFor} from '@/src/features/run-registration/operation-design';
const labels={
 ko:{SKIP:'계획 Skip',UNASSIGNED:'Group 미할당',LEGACY_EXCLUDED:'N/A',COMMON:'공통 적용',ASSIGNED:'Group 적용'},
 en:{SKIP:'Planned Skip',UNASSIGNED:'Group unassigned',LEGACY_EXCLUDED:'N/A',COMMON:'Common',ASSIGNED:'Group assigned'},
};
export function allocationLabel(locale:'ko'|'en',plan:RunPlanningSnapshot,op:string,subject:string){return labels[locale][allocationFor(plan,op,subject).state];}

const ui = {
  ko: {
    edit: '공정 설계 및 대상 배정 편집',
    applied: '공정 적용',
    legend: '공통 적용 / Group 적용: 계획된 공정 적용 · 계획 Skip: 수행하지 않도록 지정 · Group 미할당: 배정 대기 · 누락: 적용 대상의 조건값 미입력. 관심 공정은 조회만 변경합니다.',
    newSubjects: '새 대상은 일반 공정에 공통 적용되고, Group 공정에서는 미할당으로 추가됩니다. 기존 방식의 공정은 적용 상태를 그대로 유지하므로 직접 확인하세요.',
  },
  en: {
    edit: 'Edit Operation design and Subject allocation',
    applied: 'Operation applied',
    legend: 'Common / Group assigned: planned application · Planned Skip: explicitly excluded from execution · Group unassigned: awaiting assignment · Missing: an applied Subject has no condition value. Manual focus changes the view only.',
    newSubjects: 'New Subjects apply to common Operations and begin Unassigned in grouped Operations. Legacy Operations retain their existing application state; review those explicitly.',
  },
};
export const allocationUi = (locale:'ko'|'en',key:keyof typeof ui.en) => ui[locale][key];
const descriptions = {
  ko: {
    COMMON: '공통 조건을 적용하는 계획입니다. 실제 수행 상태가 아닙니다.',
    ASSIGNED: '선택한 Group에 배정된 계획입니다. 실제 수행 상태가 아닙니다.',
    SKIP: '이 공정은 수행하지 않도록 명시적으로 지정되었습니다. 미할당이나 조건값 누락이 아닙니다.',
    UNASSIGNED: '아직 Group이 배정되지 않았습니다. 계획 Skip이나 조건값 누락이 아닙니다.',
    LEGACY_EXCLUDED: '기존 계획의 미적용 상태이며 사유는 기록되지 않았습니다. Skip으로 해석하지 않습니다.',
  },
  en: {
    COMMON: 'Common conditions apply in this Plan. This is not Actual execution status.',
    ASSIGNED: 'Assigned to the selected Group in this Plan. This is not Actual execution status.',
    SKIP: 'Explicitly planned not to execute this Operation. This is neither Unassigned nor a missing condition value.',
    UNASSIGNED: 'No Group has been assigned yet. This is neither Planned Skip nor a missing condition value.',
    LEGACY_EXCLUDED: 'Excluded by the legacy Plan, with no recorded reason. This is not interpreted as Skip.',
  },
};
export function allocationDescription(locale:'ko'|'en',plan:RunPlanningSnapshot,op:string,subject:string) {
  return `${allocationLabel(locale,plan,op,subject)} · ${descriptions[locale][allocationFor(plan,op,subject).state]}`;
}
