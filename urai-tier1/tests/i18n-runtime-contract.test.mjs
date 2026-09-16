import assert from 'node:assert/strict';
import test from 'node:test';
import {
  URAI_LAUNCH_LOCALES,
  URAI_LOCALE_META,
  directionForLocale,
  normalizeUraiLocale,
  resolveUraiLocale,
  formatDate,
  formatList,
  formatNumber,
} from '../src/i18n/runtime.ts';

test('governed launch set contains exactly 20 unique locales', () => {
  assert.equal(URAI_LAUNCH_LOCALES.length, 20);
  assert.equal(new Set(URAI_LAUNCH_LOCALES).size, 20);
  assert.deepEqual(URAI_LAUNCH_LOCALES, [
    'en', 'zh-Hans', 'hi', 'es', 'fr', 'ar', 'bn', 'pt-BR', 'ru', 'ur',
    'id', 'de', 'ja', 'sw', 'tr', 'vi', 'fil', 'ko', 'it', 'fa',
  ]);
});

test('RTL is fail-closed to Arabic, Urdu and Persian', () => {
  for (const locale of URAI_LAUNCH_LOCALES) {
    const expected = ['ar', 'ur', 'fa'].includes(locale) ? 'rtl' : 'ltr';
    assert.equal(directionForLocale(locale), expected, locale);
    assert.equal(URAI_LOCALE_META[locale].direction, expected, locale);
  }
});

test('locale aliases normalize into governed launch identifiers', () => {
  assert.equal(normalizeUraiLocale('zh-CN'), 'zh-Hans');
  assert.equal(normalizeUraiLocale('pt'), 'pt-BR');
  assert.equal(normalizeUraiLocale('tl-PH'), 'fil');
  assert.equal(normalizeUraiLocale('fa-IR'), 'fa');
  assert.equal(normalizeUraiLocale('en-US'), 'en');
  assert.equal(normalizeUraiLocale('xx-YY'), null);
});

test('resolution chooses first valid candidate and falls back to English', () => {
  assert.equal(resolveUraiLocale(['bogus', 'ar-SA', 'es']), 'ar');
  assert.equal(resolveUraiLocale([null, undefined, '']), 'en');
});

test('Intl formatting executes for every governed locale', () => {
  for (const locale of URAI_LAUNCH_LOCALES) {
    assert.ok(formatNumber(locale, 12345.67).length > 0, locale);
    assert.ok(formatDate(locale, new Date('2026-09-15T12:00:00Z'), { dateStyle: 'medium', timeZone: 'UTC' }).length > 0, locale);
    assert.ok(formatList(locale, ['Home', 'Life Map', 'Replay'], { style: 'long', type: 'conjunction' }).length > 0, locale);
  }
});
