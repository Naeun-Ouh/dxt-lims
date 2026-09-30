import type { Metadata } from 'next';
import './globals.css';
import { LocaleProvider } from '@/src/shared/i18n/locale';
import { DxtApplicationProvider } from '@/src/application/dxt-application-provider';
export const metadata: Metadata = {
  title: 'DXT LIMS · Experiment workspace',
  icons: { icon: '/favicon.svg' },
  description:
    'A configuration-driven semiconductor R&D experiment intelligence platform.',
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body><LocaleProvider><DxtApplicationProvider adapter={process.env.DXT_REPOSITORY === 'postgres' ? 'postgres' : 'browser'}>{children}</DxtApplicationProvider></LocaleProvider></body>
    </html>
  );
}
