import assert from 'node:assert/strict'
import test from 'node:test'
import { URAI_CATALOGS, URAI_LAUNCH_LOCALES, URAI_NATIVE_REVIEWED_LOCALES, URAI_SOURCE_MESSAGES } from '../src/lib/i18n/locales.ts'
import { URAI_JOURNEY_CONTROL_MESSAGES } from '../src/lib/i18n/journeyControlMessages.ts'
import { URAI_GEOGRAPHIC_MESSAGES } from '../src/lib/i18n/geographicMessages.ts'
import { URAI_FOUNDER_MESSAGES } from '../src/lib/i18n/founderMessages.ts'
import { URAI_JOURNEY_MESSAGES } from '../src/lib/i18n/journeyMessages.ts'
import { currentLocalePreference, currentSpeechTag, displayLocale, localeDate, localeNumber, localizedMessage, readLocalePreference, serverLocalePreference, speechTagFor, subscribeLocale, updateLocalePreference, writeLocalePreference } from '../src/lib/i18n/localePreference.ts'

function storage(initial = {}) {
  const values = new Map(Object.entries(initial))
  return {getItem:key => values.get(key) ?? null, setItem:(key,value) => values.set(key,value)}
}

test('all twenty catalogs retain matching placeholders without granting language acceptance', () => {
  assert.equal(URAI_LAUNCH_LOCALES.length, 20)
  assert.deepEqual([...URAI_NATIVE_REVIEWED_LOCALES], ['en'])
  assert.equal(Object.keys(URAI_SOURCE_MESSAGES).length, 20 + Object.keys(URAI_JOURNEY_MESSAGES).length + Object.keys(URAI_JOURNEY_CONTROL_MESSAGES).length + Object.keys(URAI_GEOGRAPHIC_MESSAGES).length + Object.keys(URAI_FOUNDER_MESSAGES).length)
  for (const code of URAI_LAUNCH_LOCALES) {
    const expected=Object.keys(URAI_SOURCE_MESSAGES)
    assert.deepEqual(Object.keys(URAI_CATALOGS[code]).sort(), expected.sort())
    for (const [id,definition] of Object.entries(URAI_SOURCE_MESSAGES)) {
      const placeholders = value => (value.match(/\{[a-zA-Z]+\}/g) ?? []).sort()
      if(URAI_CATALOGS[code][id] !== undefined) assert.deepEqual(placeholders(URAI_CATALOGS[code][id]), placeholders(definition.source))
      else {const fallback=localizedMessage({requested:code,preview:true},id);assert.equal(fallback.text,definition.source);assert.equal(fallback.locale,'en');assert.equal(fallback.direction,'ltr');assert.equal(fallback.preview,false)}
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
// Compile the actual Focus helper, rather than a copied implementation. The
// foreign default Intl locale matches the observed browser regression fixture.
async function actualFocusDateLabel() {
  const {readFile} = await import('node:fs/promises')
  const {runInNewContext} = await import('node:vm')
  const ts = (await import('typescript')).default
  const text = await readFile(new URL('../src/app/focus/FocusChamberClient.tsx', import.meta.url), 'utf8')
  const parsed = ts.createSourceFile('FocusChamberClient.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const helper = parsed.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'dateLabel')
  assert.ok(helper, 'actual Focus date helper must exist')
  const compiled = ts.transpileModule(helper.getText(parsed), {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText
  const foreignIntl = {DateTimeFormat:class extends Intl.DateTimeFormat {
    constructor(locale, options) { super(locale ?? 'de-DE', options) }
  }}
  return runInNewContext(compiled + ';dateLabel', {Intl:foreignIntl})
}

test('actual Focus date helper uses the selected general-preview locale for all twenty languages', async () => {
  const label = await actualFocusDateLabel()
  const occurredAt = '2026-01-01T12:00:00Z'
  for (const requested of URAI_LAUNCH_LOCALES) {
    const preference = {requested,preview:true}
    let calls = 0
    const result = label(occurredAt, {date:(value,options) => {
      calls += 1
      assert.equal(value, occurredAt, 'source timestamp stays unchanged')
      assert.deepEqual(JSON.parse(JSON.stringify(options)), {dateStyle:'medium',timeStyle:'short'})
      return localeDate(preference,value,options)
    }})
    assert.equal(calls, 1, `Focus must use the captured selected formatter:${requested}`)
    assert.equal(result, new Intl.DateTimeFormat(requested,{dateStyle:'medium',timeStyle:'short'}).format(new Date(occurredAt)))
  }
})

test('actual Focus date helper keeps every unreviewed preference in admitted English without preview', async () => {
  const label = await actualFocusDateLabel()
  const occurredAt = '2026-01-01T12:00:00Z'
  const expected = new Intl.DateTimeFormat('en',{dateStyle:'medium',timeStyle:'short'}).format(new Date(occurredAt))
  for (const requested of URAI_LAUNCH_LOCALES) {
    assert.equal(label(occurredAt, {date:(value,options) => localeDate({requested,preview:false},value,options)}), expected)
  }
  assert.deepEqual([...URAI_NATIVE_REVIEWED_LOCALES], ['en'], 'date repair grants no language admission')
})

test('actual Focus date helper preserves unparseable source labels when the existing formatter rejects', async () => {
  const label = await actualFocusDateLabel()
  for (const value of ['not recorded', 'not-a-date', '']) {
    assert.equal(label(value, {date:(input,options) => localeDate({requested:'fr',preview:true},input,options)}), value)
  }
})

test('actual Focus date attributes identify formatted dates and leave unparseable source-label language unclaimed', async () => {
  const {readFile} = await import('node:fs/promises')
  const {runInNewContext} = await import('node:vm')
  const ts = (await import('typescript')).default
  const text = await readFile(new URL('../src/app/focus/FocusChamberClient.tsx', import.meta.url), 'utf8')
  const parsed = ts.createSourceFile('FocusChamberClient.tsx',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX)
  let span
  const visit = node => {
    if (ts.isJsxElement(node) && node.openingElement.tagName.getText(parsed) === 'span' && node.children.some(child => ts.isJsxExpression(child) && child.expression && ts.isCallExpression(child.expression) && child.expression.expression.getText(parsed) === 'dateLabel')) span = node
    ts.forEachChild(node,visit)
  }
  visit(parsed)
  assert.ok(span, 'actual rendered date span must exist')
  const spread = span.openingElement.attributes.properties.find(ts.isJsxSpreadAttribute)
  const evaluate = (value,formatProps) => spread ? runInNewContext('(' + spread.expression.getText(parsed) + ')',{memory:{occurredAt:value},locale:{formatProps}}) : {}
  for (const requested of URAI_LAUNCH_LOCALES) {
    const formatProps={lang:requested,dir:['ar','ur','fa'].includes(requested)?'rtl':'ltr'}
    assert.deepEqual(JSON.parse(JSON.stringify(evaluate('2026-01-01T12:00:00Z',formatProps))),formatProps)
    for (const value of ['not recorded','not-a-date','']) {
      assert.deepEqual(JSON.parse(JSON.stringify(evaluate(value,formatProps))),{dir:'auto'})
    }
  }
})



test('persistent digital-Founder disclosure has complete preparation and critical English fallback', () => {
  assert.deepEqual(Object.keys(URAI_FOUNDER_MESSAGES), ['founder.disclosure'])
  assert.equal(URAI_FOUNDER_MESSAGES['founder.disclosure'].sensitivity, 'privacy')
  for (const requested of URAI_LAUNCH_LOCALES) {
    assert.ok(URAI_CATALOGS[requested]['founder.disclosure'].trim())
    const result = localizedMessage({requested,preview:true}, 'founder.disclosure')
    assert.equal(result.text, 'Founder digital presence')
    assert.equal(result.locale, 'en')
    assert.equal(result.direction, 'ltr')
    assert.equal(result.preview, false)
  }
})
