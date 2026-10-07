import assert from 'node:assert/strict'
import test from 'node:test'
import { URAI_CATALOGS, URAI_LAUNCH_LOCALES, URAI_NATIVE_REVIEWED_LOCALES, URAI_SOURCE_MESSAGES } from '../src/lib/i18n/locales.ts'
import { URAI_JOURNEY_MESSAGES } from '../src/lib/i18n/journeyMessages.ts'
import { currentLocalePreference, currentSpeechTag, displayLocale, localeDate, localeNumber, localizedMessage, readLocalePreference, serverLocalePreference, speechTagFor, subscribeLocale, updateLocalePreference, writeLocalePreference } from '../src/lib/i18n/localePreference.ts'

function storage(initial = {}) {
  const values = new Map(Object.entries(initial))
  return {getItem:key => values.get(key) ?? null, setItem:(key,value) => values.set(key,value)}
}

test('all twenty catalogs retain matching placeholders without granting language acceptance', () => {
  assert.equal(URAI_LAUNCH_LOCALES.length, 20)
  assert.deepEqual([...URAI_NATIVE_REVIEWED_LOCALES], ['en'])
  assert.equal(Object.keys(URAI_SOURCE_MESSAGES).length, 20 + Object.keys(URAI_JOURNEY_MESSAGES).length)
  for (const code of URAI_LAUNCH_LOCALES) {
    assert.deepEqual(Object.keys(URAI_CATALOGS[code]).sort(), Object.keys(URAI_SOURCE_MESSAGES).sort())
    for (const [id,definition] of Object.entries(URAI_SOURCE_MESSAGES)) {
      const placeholders = value => (value.match(/\{[a-zA-Z]+\}/g) ?? []).sort()
      assert.deepEqual(placeholders(URAI_CATALOGS[code][id]), placeholders(definition.source))
    }
  }
})

test('French working controls require explicit preview and keep sensitive text in English', () => {
  assert.equal(localizedMessage({requested:'fr',preview:false}, 'nav.home').text, 'Home')
  assert.deepEqual(localizedMessage({requested:'fr',preview:true}, 'home.lifeMapAction'), {text:'Ouvrir directement la carte de vie',locale:'fr',direction:'ltr',preview:true})
  assert.equal(localizedMessage({requested:'fr',preview:true}, 'privacy.reviewRequired').text, 'Native review required')
  assert.equal(localizedMessage({requested:'fr',preview:true}, 'privacy.reviewRequired').locale, 'en')
  const previous = URAI_CATALOGS.fr['common.search']
  try {
    delete URAI_CATALOGS.fr['common.search']
    assert.equal(localizedMessage({requested:'fr',preview:true}, 'common.search').locale, 'en')
    assert.equal(localizedMessage({requested:'fr',preview:true}, 'common.search').text, 'Search')
  } finally { URAI_CATALOGS.fr['common.search'] = previous }
})

test('language-specific preview persists, while another URL language and unsupported storage fall back safely', () => {
  const saved = storage()
  assert.equal(writeLocalePreference(saved, {requested:'fr',preview:true}), true)
  assert.deepEqual(readLocalePreference({storage:saved,languages:['de-DE']}), {requested:'fr',preview:true})
  assert.deepEqual(readLocalePreference({storage:saved,search:'?lang=ar',languages:['de-DE']}), {requested:'ar',preview:false})
  assert.deepEqual(readLocalePreference({storage:storage({'urai:locale':'xx','urai:locale-preview':'xx'}),languages:['de-DE']}), {requested:'de',preview:false})
  const blocked = {getItem:()=>{throw new Error('blocked')},setItem:()=>{throw new Error('blocked')}}
  assert.deepEqual(readLocalePreference({storage:blocked,languages:['xx']}), {requested:'en',preview:false})
  assert.equal(writeLocalePreference(blocked, {requested:'fr',preview:true}), false)
})

test('selected French and Arabic formats, direction and speech tags agree with working UI', () => {
  const french = {requested:'fr',preview:true}
  assert.equal(localeNumber(french, 1234.5), '1\u202f234,5')
  assert.equal(localeDate(french, '2026-10-07T12:00:00Z', {dateStyle:'long',timeZone:'UTC'}), '7 octobre 2026')
  assert.equal(speechTagFor(french), 'fr-FR')
  assert.equal(speechTagFor({requested:'fr',preview:false}), 'en-US')
  assert.equal(localizedMessage({requested:'ar',preview:true}, 'common.search').direction, 'rtl')
  assert.equal(localeNumber({requested:'ar',preview:true}, 1234.5, {numberingSystem:'arab'}), '١٬٢٣٤٫٥')
  assert.equal(speechTagFor({requested:'ar',preview:true}), 'ar-SA')
})

test('mounted consumers are notified of preference changes and the SSR snapshot remains English', () => {
  updateLocalePreference({requested:'en',preview:false})
  let changes = 0
  const unsubscribe = subscribeLocale(() => { changes += 1 })
  try {
    updateLocalePreference({requested:'fr',preview:true})
    assert.equal(displayLocale(currentLocalePreference()), 'fr')
    assert.equal(currentSpeechTag(), 'fr-FR')
    assert.deepEqual(serverLocalePreference(), {requested:'en',preview:false})
    updateLocalePreference({requested:'fr',preview:true})
    assert.equal(changes, 1)
  } finally { unsubscribe(); updateLocalePreference({requested:'en',preview:false}) }
})

test('speech tags preserve English admission and require explicit preview for every other launch locale', () => {
  try {
    for (const requested of URAI_LAUNCH_LOCALES) {
      updateLocalePreference({requested, preview:false})
      assert.equal(currentSpeechTag(), 'en-US')
      updateLocalePreference({requested, preview:true})
      assert.equal(currentSpeechTag(), speechTagFor({requested, preview:true}))
      assert.ok(currentSpeechTag().length <= 35, 'tag fits the existing Adam server locale field')
    }
    updateLocalePreference({requested:'unsupported', preview:true})
    assert.equal(currentSpeechTag(), 'en-US')
    assert.deepEqual([...URAI_NATIVE_REVIEWED_LOCALES], ['en'])
  } finally { updateLocalePreference({requested:'en',preview:false}) }
})
