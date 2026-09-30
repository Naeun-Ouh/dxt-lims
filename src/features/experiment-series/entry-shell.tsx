'use client';
/* oxlint-disable next/no-img-element -- Exact local Figma SVG assets. */
import Link from 'next/link';
import { Workspace } from '@/src/shared/ui/workspace';
import { useLocale } from '@/src/shared/i18n/locale';

export function EntryIcon({ name }: { name: string }) {
  return <img src={`/figma/entry/${name}.svg`} alt="" />;
}

export function StudyIcon({ name }: { name: string }) {
  return <img src={`/figma/study/${name}.svg`} alt="" />;
}

export function EntryShell({
  children,
  study,
  current,
  standard = false,
}: {
  children: React.ReactNode;
  study?: { name: string; slug: string };
  current?: string;
  standard?: boolean;
}) {
  const { t } = useLocale();
  return (
    <Workspace
      page="Registration"
      entryShell
      standardEntry={standard}
      returnHref={study ? `/series/${study.slug}` : '/'}
      entryBreadcrumbs={
        <>
          {study && (
            <>
              <span className="entry-crumb-separator">›</span>
              <Link href={`/series/${study.slug}`}>{study.name}</Link>
            </>
          )}
          {current && (
            <>
              <span className="entry-crumb-separator">›</span>
              <span>{t(current)}</span>
            </>
          )}
        </>
      }
    >
      {children}
    </Workspace>
  );
}

export function EntryHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  const { t } = useLocale();
  return (
    <header className="entry-heading">
      <div>
        <span className="entry-eyebrow">{t(eyebrow)}</span>
        <h1>{t(title)}</h1>
        <p>{t(description)}</p>
      </div>
      {children}
    </header>
  );
}
