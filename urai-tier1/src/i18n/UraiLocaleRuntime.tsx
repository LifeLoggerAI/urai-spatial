'use client';

import { useEffect, useState } from 'react';
import {
  directionForLocale,
  resolveUraiLocale,
  URAI_DEFAULT_LOCALE,
  URAI_LOCALE_STORAGE_KEY,
  type UraiLocale,
} from './runtime';

function readQueryLocale(): string | null {
  try {
    return new URLSearchParams(window.location.search).get('lang');
  } catch {
    return null;
  }
}

function readStoredLocale(): string | null {
  try {
    return window.localStorage.getItem(URAI_LOCALE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function browserLocales(): string[] {
  if (typeof navigator === 'undefined') return [];
  return navigator.languages?.length ? [...navigator.languages] : [navigator.language];
}

function applyDocumentLocale(locale: UraiLocale) {
  const root = document.documentElement;
  root.lang = locale;
  root.dir = directionForLocale(locale);
  root.dataset.uraiLocale = locale;
  root.dataset.uraiDirection = root.dir;
  try {
    window.localStorage.setItem(URAI_LOCALE_STORAGE_KEY, locale);
  } catch {
    // Storage denial must not prevent localization or change privacy behavior.
  }
}

export default function UraiLocaleRuntime() {
  const [locale, setLocale] = useState<UraiLocale>(URAI_DEFAULT_LOCALE);

  useEffect(() => {
    const resolved = resolveUraiLocale([
      readQueryLocale(),
      readStoredLocale(),
      ...browserLocales(),
    ]);
    setLocale(resolved);
    applyDocumentLocale(resolved);

    const onLocaleRequest = (event: Event) => {
      const requested = (event as CustomEvent<{ locale?: string }>).detail?.locale;
      const next = resolveUraiLocale([requested, resolved]);
      setLocale(next);
      applyDocumentLocale(next);
    };

    window.addEventListener('urai:set-locale', onLocaleRequest);
    return () => window.removeEventListener('urai:set-locale', onLocaleRequest);
  }, []);

  return (
    <span
      hidden
      aria-hidden="true"
      data-urai-locale-runtime="v1"
      data-urai-locale={locale}
      data-urai-direction={directionForLocale(locale)}
    />
  );
}
