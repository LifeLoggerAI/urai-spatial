import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const registry = fs.readFileSync(new URL('../src/i18n/localeRegistry.ts', import.meta.url), 'utf8')
const bootstrap = fs.readFileSync(new URL('../src/i18n/LocaleBootstrap.tsx', import.meta.url), 'utf8')
const layout = fs.readFileSync(new URL('../src/app/layout.tsx', import.meta.url), 'utf8')

test('launch locale registry contains exactly the governed 20 preparation locales', () => {
  for (const locale of ['en','zh-Hans','hi','es','fr','ar','bn','pt-BR','ru','ur','id','de','ja','sw','tr','vi','fil','ko','it','fa']) {
    assert.match(registry, new RegExp(`['"]${locale}['"]`))
  }
  assert.match(registry, /URAI_LOCALE_RUNTIME_STATUS = 'machine-preparation-only'/)
  assert.match(registry, /URAI_RTL_LOCALES = new Set<UraiLaunchLocale>\(\['ar', 'ur', 'fa'\]\)/)
  assert.match(registry, /'zh-cn': 'zh-Hans'/)
  assert.match(registry, /pt: 'pt-BR'/)
  assert.match(registry, /tl: 'fil'/)
})

test('runtime locale bootstrap is truthful, persistent, and RTL-aware without claiming translation approval', () => {
  assert.match(bootstrap, /const STORAGE_KEY = 'urai\.locale'/)
  assert.match(bootstrap, /params\.get\('lang'\)/)
  assert.match(bootstrap, /navigator\.languages/)
  assert.match(bootstrap, /root\.lang = locale/)
  assert.match(bootstrap, /root\.dir = direction/)
  assert.match(bootstrap, /root\.dataset\.uraiLocaleRuntimeStatus = URAI_LOCALE_RUNTIME_STATUS/)
  assert.match(bootstrap, /root\.dataset\.uraiLocaleNativeReview = localeRequiresNativeReview\(locale\) \? 'required' : 'source'/)
  assert.match(bootstrap, /window\.addEventListener\('storage'/)
  assert.match(bootstrap, /new CustomEvent\(LOCALE_EVENT/)
})

test('root layout mounts localization bootstrap while retaining safe English server fallback', () => {
  assert.match(layout, /import LocaleBootstrap from '@\/i18n\/LocaleBootstrap'/)
  assert.match(layout, /<html[\s\S]*lang="en"/)
  assert.match(layout, /<LocaleBootstrap \/>/)
})
