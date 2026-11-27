import type { Locale } from './messages';
const labels = {
  raiseRevision: ['Create Revision', 'Revision 올리기'],
  copiedFrom: ['Clone source revision', '복제 원본 Revision'],
  newRevision: ['New revision', '신규 Revision'],
  sampleId: ['Sample ID', '샘플 ID'],
  optionalReason: ['Change reason (optional)', '변경 사유 (선택 사항)'],
  original: ['View original composition and properties', '원본 조성·물성 보기'],
  edited: ['New revision information', '신규 Revision 정보'],
  numbering: [
    'The new number follows the latest revision, even when copying an older revision. Historical Run links remain unchanged.',
    '과거 Revision을 복제해도 신규 번호는 최신 번호 다음으로 생성됩니다. 과거 실험 차수의 연결은 유지됩니다.',
  ],
  changeSource: [
    'Changing the clone source replaces the unsaved revision information. Continue?',
    '복제 원본을 변경하면 입력 중인 신규 Revision 정보가 교체됩니다. 계속할까요?',
  ],
  unknownOrigin: ['Clone source was not recorded', '복제 원본 기록 없음'],
  registered: ['Initial registration', '최초 등록'],
  copied: ['Copied from', '복제 원본'],
} as const;
export type SampleRevisionMessage = keyof typeof labels;
export const sampleRevisionText = (
  locale: Locale,
  key: SampleRevisionMessage,
) => labels[key][locale === 'ko' ? 1 : 0];
