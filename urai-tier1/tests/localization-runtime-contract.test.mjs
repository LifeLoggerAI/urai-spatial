import assert from 'node:assert/strict'
import test from 'node:test'
import {
  URAI_LAUNCH_LOCALES,
  URAI_GLOBAL_LANGUAGE_TARGETS,
  URAI_UNPREPARED_LANGUAGE_TARGETS,
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
  assert.equal(negotiateUraiLocale({ languages:['zh-TW','fr'] }), 'fr')
  assert.equal(negotiateUraiLocale({ languages:['zh-HK'] }), 'en')
  assert.equal(negotiateUraiLocale({ languages:['xx-ZZ'] }), 'en')
})

test('locale normalization and RTL rules are bounded to governed launch ids', () => {
  assert.equal(normalizeUraiLocale('PT_br'), 'pt-BR')
  assert.equal(normalizeUraiLocale('ar-EG'), 'ar')
  assert.equal(normalizeUraiLocale('zh-SG'), 'zh-Hans')
  assert.equal(normalizeUraiLocale('zh-Hant'), null)
  assert.equal(normalizeUraiLocale('zh-TW'), null)
  assert.equal(normalizeUraiLocale('zh_Hant_TW'), null)
  assert.equal(normalizeUraiLocale('zh-HK'), null)
  assert.equal(normalizeUraiLocale('zh-MO'), null)
  assert.equal(uraiTextDirection('ar'), 'rtl')
  assert.equal(uraiTextDirection('ur'), 'rtl')
  assert.equal(uraiTextDirection('fa'), 'rtl')
  assert.equal(uraiTextDirection('en'), 'ltr')
})

test('machine-prepared unreviewed locales stay runtime-fallback and review-required', () => {
  assert.equal(messageFor('fr','nav.home'), 'Home')
  assert.equal(localizationCompleteness('fr').complete, true)
  assert.deepEqual(localizationCompleteness('fr').missingMessageIds,[])
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

test('21 distinct global language targets do not imply 21 runtime languages', () => {
  assert.equal(URAI_GLOBAL_LANGUAGE_TARGETS.length, 21)
  assert.equal(new Set(URAI_GLOBAL_LANGUAGE_TARGETS.map(code => code.split('-')[0])).size, 21)
  assert.deepEqual([...URAI_UNPREPARED_LANGUAGE_TARGETS], ['pl'])
  assert.equal(URAI_GLOBAL_LANGUAGE_TARGETS.at(-1), 'pl')
  assert.equal(normalizeUraiLocale('pl'), null)
  assert.equal(negotiateUraiLocale({languages:['pl-PL','en-US']}), 'en')
})
