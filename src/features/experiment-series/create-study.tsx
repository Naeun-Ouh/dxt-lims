'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/src/shared/i18n/locale';
import { EntryHeading, EntryIcon, EntryShell } from './entry-shell';

/** Local form only. No Study creation command exists in the frozen repository contract. */
export function CreateStudy() {
  const { t } = useLocale();
  const [targetIds, setTargetIds] = useState([0]);
  const unavailable =
    'Study creation is not available in the current repository. This form is not saved.';
  const unavailableSelect = (label: string) => (
    <label className="entry-field">
      {t(label)}
      <select disabled>
        <option value="">{t('Not configured')}</option>
      </select>
    </label>
  );
  return (
    <EntryShell current="New Study">
      <main className="entry-page study-create-final">
        <EntryHeading
          eyebrow="NEW STUDY"
          title="Create Study"
          description="Define the experimental objective, targets, and setup."
        >
          <div className="entry-actions">
            <Link className="entry-button" href="/studies">
              {t('Cancel')}
            </Link>
            <button
              className="entry-button primary"
              disabled
              aria-describedby="study-create-unavailable"
            >
              {t('Create Study')}
            </button>
          </div>
        </EntryHeading>
        <form
          className="entry-study-form"
          onSubmit={(event) => event.preventDefault()}
        >
          <section>
            <h2>{t('Identity')}</h2>
            <div className="entry-form-columns">
              <div>
                <label className="entry-field">
                  {t('Study Title')}
                  <input name="title" placeholder={t('Enter a Study title')} />
                </label>
                <label className="entry-field">
                  {t('Study ID')}
                  <input disabled placeholder={t('Assigned when created')} />
                </label>
              </div>
              <div>
                {unavailableSelect('Domain')}
                {unavailableSelect('Area')}
              </div>
            </div>
            <label className="entry-field">
              {t('Objective')}
              <textarea
                name="objective"
                placeholder={t('What does this Study aim to achieve?')}
              />
            </label>
          </section>
          <div className="entry-form-rule">
            <EntryIcon name="eb5f4" />
          </div>
          <section>
            <h2>{t('Targets')}</h2>
            <table className="entry-target-table">
              <thead>
                <tr>
                  <th>{t('Metric')}</th>
                  <th>{t('Target')}</th>
                  <th>{t('Unit')}</th>
                </tr>
              </thead>
              <tbody>
                {targetIds.map((id, index) => (
                  <tr key={id}>
                    <td>
                      <input
                        aria-label={t('Metric {0}', [index + 1])}
                        placeholder={t('Metric')}
                      />
                    </td>
                    <td>
                      <input
                        aria-label={t('Target {0}', [index + 1])}
                        placeholder={t('Target')}
                      />
                    </td>
                    <td>
                      <input
                        aria-label={t('Unit {0}', [index + 1])}
                        placeholder={t('Unit')}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              type="button"
              className="entry-text-button"
              onClick={() => setTargetIds((ids) => [...ids, ids.length])}
            >
              + {t('Add Target')}
            </button>
          </section>
          <div className="entry-form-rule">
            <EntryIcon name="eb5f4" />
          </div>
          <section>
            <h2>{t('Ownership')}</h2>
            <div className="entry-form-columns">
              {unavailableSelect('Owner')}
              {unavailableSelect('Team')}
            </div>
          </section>
          <div className="entry-form-rule">
            <EntryIcon name="eb5f4" />
          </div>
          <section>
            <h2>{t('Experiment Setup')}</h2>
            <p>
              {t(
                'Configure Operation + Item defaults after creating the Study. These defaults are inherited by every new Run.',
              )}
            </p>
            <div className="entry-reference-field">
              {unavailableSelect('Reference Kit')}
            </div>
          </section>
          <output className="entry-unavailable" id="study-create-unavailable">
            {t(unavailable)}
          </output>
        </form>
      </main>
    </EntryShell>
  );
}
