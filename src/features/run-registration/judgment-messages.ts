import type { Locale } from '@/src/shared/i18n/messages';
const messages = {
  independent: { en: 'Record a Run Conclusion independently. Evaluation Criteria, individual Evaluations and a reason are optional.', ko: '실험 차수 결론은 독립적으로 기록합니다. 평가 기준, 개별 결과 평가 및 판단 근거는 선택 사항입니다.' },
  optionalReason: { en: 'Reason (optional)', ko: '판단 근거 (선택 사항)' },
} as const;
export const judgmentText = (locale: Locale, key: keyof typeof messages) => messages[key][locale];
