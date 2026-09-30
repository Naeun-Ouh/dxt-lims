'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { defaultLocale, localePreferenceKey, translate, translateMessage, type Locale } from './messages';

type LocaleContext = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string | null | undefined, values?: readonly (string | number | boolean | null | undefined)[]) => string;
  message: (value: string | null | undefined) => string;
};
const Context = createContext<LocaleContext>({
  locale: defaultLocale,
  setLocale: () => {},
  t: (key, values) => values ? translate(defaultLocale, key ?? '', values) : translateMessage(defaultLocale, key),
  message: value => translateMessage(defaultLocale, value),
});

const preferenceEvent = 'dxt:ui-locale';
let memoryLocale: Locale = defaultLocale;
function readPreference(): Locale {
  try {
    const saved = localStorage.getItem(localePreferenceKey);
    if (saved === 'en' || saved === 'ko') return saved;
  } catch { /* Private browsing can disallow local storage. */ }
  return memoryLocale;
}
function subscribePreference(listener: () => void) {
  const storage = (event: StorageEvent) => { if (event.key === localePreferenceKey || event.key === null) listener(); };
  window.addEventListener('storage', storage);
  window.addEventListener(preferenceEvent, listener);
  return () => { window.removeEventListener('storage', storage); window.removeEventListener(preferenceEvent, listener); };
}
const noSubscription = () => () => {};
export function LocaleProvider({ children, initialLocale = defaultLocale, persist = true }: {
  children: ReactNode; initialLocale?: Locale; persist?: boolean;
}) {
  const [sessionLocale, updateSessionLocale] = useState<Locale>(initialLocale);
  const locale = useSyncExternalStore(persist ? subscribePreference : noSubscription,
    persist ? readPreference : () => sessionLocale, () => initialLocale);
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  const setLocale = useCallback((next: Locale) => {
    if (!persist) { updateSessionLocale(next); return; }
    memoryLocale = next;
    try { localStorage.setItem(localePreferenceKey, next); } catch { /* Keep the in-memory choice. */ }
    window.dispatchEvent(new Event(preferenceEvent));
  }, [persist]);
  const value = useMemo(() => ({ locale, setLocale,
    t: (key: string | null | undefined, values?: readonly (string | number | boolean | null | undefined)[]) => values ? translate(locale, key ?? '', values) : translateMessage(locale, key),
    message: (text: string | null | undefined) => translateMessage(locale, text),
  }), [locale, setLocale]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useLocale = () => useContext(Context);

export function LocaleSwitch() {
  const {locale,setLocale,t} = useLocale();
  return <fieldset className="dxt-locale-switch" aria-label={t('Interface language')}>
    {(['ko','en'] as const).map(value => <button type="button" key={value} lang={value} aria-pressed={locale === value} onClick={() => setLocale(value)}>{value.toUpperCase()}</button>)}
  </fieldset>;
}
