'use client';
import type { AuthoritativeRunPreview } from '@/src/application/run-creation';
import { useLocale } from '@/src/shared/i18n/locale';

/** Source interpretation changes are disclosed before any durable Create. */
export function ConditionCopyNotice({ preview }: { preview: AuthoritativeRunPreview }) {
  const { t } = useLocale();
  const changes = preview.sourceChanges ?? [];
  if (!preview.legacySourceAmbiguous && !changes.length) return null;
  return <aside aria-label={t('Copied condition values')}>
    <h3>{t('Copied condition values')}</h3>
    <p>{t('The source Run is unchanged. In this new Run, Subject-specific values and roles take priority; blank overrides use the common condition value.')}</p>
    {changes.length ? <div className="dxt-grid-scroll"><table className="dxt-grid">
      <caption>{t('Effective values changed by copying. Review the final draft values below before creating.')}</caption>
      <thead><tr>{['Operation', 'Subject', 'Condition', 'Source Run', 'Copied value'].map(key => <th key={key}>{t(key)}</th>)}</tr></thead>
      <tbody>{changes.map((change, index) => <tr key={index}>
        <th scope="row">{change.operation}</th><td>{change.subject}</td><td>{change.condition}</td>
        <td>{change.before ?? t('Missing')} · {change.beforeRole ? t(change.beforeRole === 'VARIED' ? 'Intentionally Varied' : 'Fixed') : '—'}</td>
        <td>{change.after ?? t('Missing')} · {change.afterRole ? t(change.afterRole === 'VARIED' ? 'Intentionally Varied' : 'Fixed') : '—'}</td>
      </tr>)}</tbody>
    </table></div> : <p>{t('Overlapping scopes exist in the source. No effective value or role changes were found when copying.')}</p>}
  </aside>;
}
