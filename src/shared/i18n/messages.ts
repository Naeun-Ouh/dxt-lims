import ko from './ko.json';
import en from './en.json';

export type Locale = 'en' | 'ko';
export const localePreferenceKey = 'dxt.ui.locale.v1';
export const defaultLocale: Locale = 'ko';
export const supportedLocales = ['ko', 'en'] as const;
const korean: Readonly<Record<string, string>> = ko;
const english: Readonly<Record<string, string>> = en;
export const translatedKeyCount = Object.keys(ko).length;

// Keys are the canonical source messages. Only explicitly supplied UI labels are
// translated. Experiment payloads, identifiers and interpolation values are opaque.
export function translate(locale: Locale, key: string, values: readonly (string | number | boolean | null | undefined)[] = []): string {
  const message = (locale === 'ko' ? korean[key] : english[key]) ?? key;
  return message.replace(/\{(\d+)\}/g, (token, index: string) => Number(index) < values.length ? String(values[Number(index)] ?? '') : token);
}

// Translate registered parameterized validation messages at the display boundary.
// Unrecognized server diagnostics remain verbatim; never rewrite an Error or a command.
const patterns = Object.keys(ko).filter(key => /\{\d+\}/.test(key)).map(key => ({
  key,
  pattern: new RegExp('^' + key.split(/\{\d+\}/).map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('(.+?)') + '$'),
}));
export function translateMessage(locale: Locale, message: string | null | undefined): string {
  if (!message) return '';
  if (korean[message] || english[message]) return translate(locale, message);
  for (const {key, pattern} of patterns) {
    const match = pattern.exec(message);
    if (match) return translate(locale, key, match.slice(1));
  }
  return message;
}
