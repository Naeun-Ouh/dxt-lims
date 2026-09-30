'use client';
import { useLocale } from '@/src/shared/i18n/locale';
import Link from 'next/link';
export default function NotFound() {
  const {t}=useLocale();
  return (
    <main style={{ padding: 60 }}>
      <h1>{t("Experiment not found")}</h1>
      <p>{t("This run is not part of the current workspace.")}</p>
      <Link href="/">{t("Return to Experiments \u2192")}</Link>
    </main>
  );
}
