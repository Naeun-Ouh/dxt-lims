'use client';
import { useLocale } from './locale';

/** Display boundary for labels rendered by server components. */
export function LocalizedText({ children }: { children: string }) {
  return <>{useLocale().t(children)}</>;
}
