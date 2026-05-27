// i18n — intentionally a tiny synchronous lookup, not a library.
//
// We ship English-only at 1.0. The scaffolding exists so that
// contributor translations can land as additional JSON files without
// touching the call sites, but the runtime cost today is one object
// lookup per string. No formatjs, no negotiation, no pluralization
// (English doesn't need it; languages that do can land that work
// alongside their first translation).
//
// Adding a string:
//   1. Add the key to src/i18n/en.json with a sensible namespace
//      prefix ("settings.foo.bar", "palette.heading", etc.).
//   2. Replace the hard-coded string in the component with
//      t('settings.foo.bar').
//   3. Done.
//
// Adding a language (future contributor):
//   1. Copy en.json to <lang>.json, translate values.
//   2. Add it to the LOCALES map below.
//   3. Wire a locale-picker UI (TBD — pre-1.0 we just default to en).
//
// Interpolation: t() accepts a second arg of named values. Placeholders
// in the source string are {name}; missing names fall back to the raw
// placeholder so a contributor-written translation that forgets a
// variable degrades visibly rather than silently.

import en from './en.json';

export type Locale = 'en';

const LOCALES: Record<Locale, Record<string, string>> = {
  en,
};

let currentLocale: Locale = 'en';

/** Look up a translated string. Returns the key itself on miss so
 *  forgetting to register a key is visible during development. */
export function t(key: string, values?: Record<string, string | number>): string {
  const raw = LOCALES[currentLocale][key] ?? LOCALES.en[key] ?? key;
  if (!values) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, name: string) => {
    const v = values[name];
    return v !== undefined ? String(v) : `{${name}}`;
  });
}

/** Switch the active locale. No event emission today — components
 *  read t() inline at render time and React's normal re-render path
 *  handles propagation. If a locale picker is added pre-1.0 it
 *  should bump a Zustand store value that components subscribe to,
 *  so flipping the locale re-renders the tree. */
export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}
