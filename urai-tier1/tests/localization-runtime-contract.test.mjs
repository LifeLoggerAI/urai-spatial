import assert from 'node:assert/strict'
import test from 'node:test'
import {
  URAI_LAUNCH_LOCALES,
  localizationCompleteness,
  messageFor,
  negotiateUraiLocale,
  normalizeUraiLocale,
  runtimeUraiLocale,
  uraiTextDirection,
} from '../src/lib/i18n/locales.ts'

test('governed launch locale set remains exact and twenty-wide', () => {
  assert.equal(URAI_LAUNCH_LOCALES.length, 20)
  assert.deepEqual(URAI_LAUNCH_LOCALES, [
    'en','zh-Hans','hi','es','fr','ar','bn','pt-BR','ru','ur',
    'id','de','ja','sw','tr','vi','fil','ko','it','fa',
  ])
})

test('negotiation is explicit then stored then browser then English', () => {
  assert.equal(negotiateUraiLocale({ explicit:'fr', stored:'es', languages:['de'] }), 'fr')
  assert.equal(negotiateUraiLocale({ stored:'es', languages:['de'] }), 'es')
  assert.equal(negotiateUraiLocale({ languages:['pt-PT'] }), 'pt-BR')
  assert.equal(negotiateUraiLocale({ languages:['zh-CN'] }), 'zh-Hans')
  assert.equal(negotiateUraiLocale({ languages:['xx-ZZ'] }), 'en')
})

test('locale normalization and RTL rules are bounded to governed launch ids', () => {
  assert.equal(normalizeUraiLocale('PT_br'), 'pt-BR')
  assert.equal(normalizeUraiLocale('ar-EG'), 'ar')
  assert.equal(uraiTextDirection('ar'), 'rtl')
  assert.equal(uraiTextDirection('ur'), 'rtl')
  assert.equal(uraiTextDirection('fa'), 'rtl')
  assert.equal(uraiTextDirection('en'), 'ltr')
})

test('machine-prepared unreviewed locales stay runtime-fallback and review-required', () => {
  assert.equal(messageFor('fr','nav.home'), 'Home')
  assert.equal(localizationCompleteness('fr').complete, true)
  assert.equal(localizationCompleteness('fr').nativeReviewRequired, true)
  assert.equal(localizationCompleteness('en').complete, true)
  assert.equal(localizationCompleteness('en').nativeReviewRequired, false)
})

test('unreviewed locale preferences do not mislabel English fallback copy or force RTL runtime', () => {
  assert.equal(runtimeUraiLocale('fr'), 'en')
  assert.equal(runtimeUraiLocale('ar'), 'en')
  assert.equal(uraiTextDirection(runtimeUraiLocale('ar')), 'ltr')
  assert.equal(runtimeUraiLocale('en'), 'en')
})
