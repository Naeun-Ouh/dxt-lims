'use client';
import { useLocale } from '@/src/shared/i18n/locale';
import { groupText } from '@/src/features/run-registration/group-messages';
const ko: Record<string, string> = {
  'Unassigned Subject: {0}.': '미할당 실험 대상: {0}.',
  'Enter the required execution condition: {0}.':
    '필수 실행 조건이 누락되었습니다: {0}.',
  'Complete the Measurement plan for {0}.': '계측 계획이 누락되었습니다: {0}.',
};
export function RunDraftWarnings({ warnings = [] }: { warnings?: string[] }) {
  const { locale, t } = useLocale();
  if (!warnings.length) return null;
  return (
    <aside className="draft-readiness-warnings" aria-live="polite">
      <strong>{groupText(locale, 'warning')}</strong>
      <ul>
        {[...new Set(warnings)].map((w) => {
          const [key, ...args] = w.split('|');
          let text = locale === 'ko' && ko[key] ? ko[key] : t(key, args);
          if (locale === 'ko' && ko[key])
            args.forEach((arg, index) => {
              text = text.replaceAll(`{${index}}`, arg);
            });
          return <li key={w}>{text}</li>;
        })}
      </ul>
    </aside>
  );
}
