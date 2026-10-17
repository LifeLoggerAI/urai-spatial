import assert from 'node:assert/strict'
import test from 'node:test'
import {
  URAI_LAUNCH_LOCALES,
  URAI_GLOBAL_LANGUAGE_TARGETS,
  URAI_SOURCE_MESSAGES,
  URAI_CATALOGS,
  formatUraiCurrency,
  formatUraiRelativeTime,
  formatUraiDate,
  formatUraiNumber,
  URAI_UNPREPARED_LANGUAGE_TARGETS,
  localizationCompleteness,
  messageFor,
  negotiateUraiLocale,
  normalizeUraiLocale,
  runtimeUraiLocale,
  uraiTextDirection,
} from '../src/lib/i18n/locales.ts'

test('governed launch locale set remains twenty-one distinct languages', () => {
  assert.equal(URAI_LAUNCH_LOCALES.length, 21)
  assert.deepEqual(URAI_LAUNCH_LOCALES, [
    'en','zh-Hans','hi','es','fr','ar','bn','pt-BR','ru','ur',
    'id','de','ja','sw','tr','vi','fil','ko','it','fa','pl',
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
  assert.deepEqual([...URAI_UNPREPARED_LANGUAGE_TARGETS], [])
  assert.equal(URAI_GLOBAL_LANGUAGE_TARGETS.at(-1), 'pl')
  assert.equal(normalizeUraiLocale('pl'), 'pl')
  assert.equal(negotiateUraiLocale({languages:['pl-PL','en-US']}), 'pl')
})

test('Polish catalog preserves all 240 message IDs and named placeholders',()=>{
  const ids=Object.keys(URAI_SOURCE_MESSAGES).sort()
  assert.equal(ids.length,240)
  assert.deepEqual(Object.keys(URAI_CATALOGS.pl).sort(),ids)
  const tokens=s=>[...s.matchAll(/\{[A-Za-z][A-Za-z0-9]*\}/g)].map(m=>m[0]).sort()
  for(const id of ids){
    assert.ok(URAI_CATALOGS.pl[id]?.trim(),id)
    assert.deepEqual(tokens(URAI_CATALOGS.pl[id]),tokens(URAI_SOURCE_MESSAGES[id].source),id)
  }
  assert.equal(localizationCompleteness('pl').complete,true)
  assert.equal(localizationCompleteness('pl').nativeReviewRequired,true)
  assert.equal(runtimeUraiLocale('pl'),'en')
  assert.equal(messageFor('pl','nav.home'),'Home')
})
test('Polish number/date/currency and relative time, Chinese script and RTL',()=>{
  assert.equal(normalizeUraiLocale('pl-PL'),'pl')
  assert.equal(normalizeUraiLocale('zh-Hant'),null)
  for(const id of ['ar','ur','fa']) assert.equal(uraiTextDirection(id),'rtl')
  assert.equal(uraiTextDirection('pl'),'ltr')
  assert.match(formatUraiNumber('pl',12.5),/,5/)
  assert.match(formatUraiCurrency('pl',12.5,'PLN'),/zł|PLN/)
  assert.match(formatUraiRelativeTime('pl',2,'day'),/dni/)
  assert.match(formatUraiDate('pl','2026-10-16T00:00:00Z',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}),/października/)
})
