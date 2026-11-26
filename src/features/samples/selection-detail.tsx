'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { SampleRevisionChoice } from '@/src/application/sample-lifecycle';
import { sampleRequest } from '@/src/infrastructure/http/sample-client';
import { useLocale } from '@/src/shared/i18n/locale';
import { sampleText } from '@/src/shared/i18n/sample-messages';
export function SampleSelectionDetail({
  revisionId,
  denied,
}: {
  revisionId?: string | null;
  denied?: boolean;
}) {
  const { locale } = useLocale();
  const [value, setValue] = useState<SampleRevisionChoice | null>(null),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    setValue(null);
    setFailed(false);
    if (revisionId && !denied)
      void sampleRequest<SampleRevisionChoice>({
        operation: 'selection',
        revisionId,
      })
        .then((v) => {
          if (active) setValue(v);
        })
        .catch(() => {
          if (active) setFailed(true);
        });
    return () => {
      active = false;
    };
  }, [revisionId, denied]);
  if (denied || failed) return <span>{sampleText(locale, 'denied')}</span>;
  if (!revisionId) return <span>{sampleText(locale, 'unlinked')}</span>;
  if (!value) return <span>{sampleText(locale, 'loading')}</span>;
  return (
    <Link
      href={`/samples/${encodeURIComponent(value.sampleId)}/revisions/${value.revision}`}
    >
      {value.sampleCode} · {sampleText(locale, 'revision')} {value.revision}
    </Link>
  );
}
