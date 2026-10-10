import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'
import { URAI_GEOGRAPHIC_MESSAGES, URAI_GEOGRAPHIC_CATALOGS } from '../src/lib/i18n/geographicMessages.ts'
import { localizedGeographicStatus } from '../src/lib/i18n/geographicCopy.ts'
import { localizedMessage } from '../src/lib/i18n/localePreference.ts'
import { URAI_SOURCE_MESSAGES, URAI_CATALOGS, URAI_LAUNCH_LOCALES, URAI_NATIVE_REVIEWED_LOCALES, runtimeUraiLocale, localizationCompleteness } from '../src/lib/i18n/locales.ts'
import { defaultConsentPolicy, isConsentPolicy } from '../src/app/privacy-controls/consentModel.ts'
import * as vault from '../src/spatial/places/geographicLocationVault.ts'
import { createGeographicLocationRequest } from '../src/spatial/places/geographicLocationRequest.ts'
import { localizationMessageBindings } from '../../scripts/lib/localization-message-bindings.mjs'

const source = fs.readFileSync(new URL('../src/app/location-map/geographic/GeographicLocationClient.tsx', import.meta.url), 'utf8')

test('geographic status state stores stable IDs without capturing locale copy in callbacks', () => {
  assert.match(source, /useState<GeographicStatusMessage>\(\{id: 'geographic\.status\.off'\}\)/)
  assert.match(source, /localizedGeographicStatus\(locale\.preference, message\)/)
  assert.doesNotMatch(source, /setMessage\(\s*(?:copy|locale)\./)
  assert.doesNotMatch(source, /useEffect[\s\S]*?\}, \[[^\]]*\b(?:copy|locale|preference)\b/)
  assert.match(source, /lang=\{statusCopy\.locale\} dir=\{statusCopy\.direction\}/)
})

test('geographic permission, consent, coordinate and status source copy retains critical sensitivity', () => {
  for (const [id, message] of Object.entries(URAI_GEOGRAPHIC_MESSAGES)) {
    assert.equal(message.id, id)
    assert.equal(URAI_GEOGRAPHIC_CATALOGS.en[id], message.source)
    if (/^geographic\.(status|policy|coordinate|precision|authority)\./.test(id)) assert.ok(['privacy','consent'].includes(message.sensitivity), id)
  }
  assert.equal(Object.keys(URAI_GEOGRAPHIC_MESSAGES).length, 73)
  assert.equal(URAI_GEOGRAPHIC_MESSAGES['geographic.action.useLocation'].sensitivity, 'consent')
  assert.equal(URAI_GEOGRAPHIC_MESSAGES['geographic.action.revoke'].sensitivity, 'consent')
})

test('private memory labels and coordinate precision remain original data through locale changes', () => {
  assert.match(source, /useState\(URAI_GEOGRAPHIC_MESSAGES\['geographic\.pin\.currentPlace'\]\.source as string\)/)
  assert.match(source, /readablePlace: readablePlace \|\| URAI_GEOGRAPHIC_MESSAGES\['geographic\.pin\.unnamed'\]\.source/)
  assert.match(source, /<strong dir="auto">\{pin\.title\}<\/strong><span dir="auto">\{pin\.readablePlace\}<\/span>/)
  assert.match(source, /displayCoordinate\.latitude\.toFixed\(precision === 'city' \? 2 : precision === 'approximate' \|\| !exactPrivateAllowed \? 3 : 5\)/)
  assert.doesNotMatch(source, /(?:copy|locale)\.text\(\s*pin\.(?:title|readablePlace)/)
})

test('all geographic review catalogs are complete but runtime and critical status copy remain English', () => {
  assert.deepEqual([...URAI_NATIVE_REVIEWED_LOCALES], ['en'])
  assert.equal(Object.keys(URAI_SOURCE_MESSAGES).length, 237)
  const ids = Object.keys(URAI_GEOGRAPHIC_MESSAGES)
  for (const requested of URAI_LAUNCH_LOCALES) {
    assert.deepEqual(Object.keys(URAI_GEOGRAPHIC_CATALOGS[requested]), ids)
    assert.equal(localizationCompleteness(requested).complete, true)
    assert.equal(runtimeUraiLocale(requested), 'en')
    for (const [id, definition] of Object.entries(URAI_GEOGRAPHIC_MESSAGES)) {
      assert.ok(URAI_CATALOGS[requested][id].trim(), `${requested}:${id}`)
      const placeholders = text => (text.match(/\{[a-zA-Z]+\}/g) ?? []).sort()
      assert.deepEqual(placeholders(URAI_CATALOGS[requested][id]), placeholders(definition.source))
      if (id.startsWith('geographic.status.')) {
        const result = localizedGeographicStatus({requested, preview:true}, {id, mode:'denied'})
        assert.equal(result.locale, 'en')
        assert.equal(result.direction, 'ltr')
        assert.equal(result.preview, false)
        assert.equal(result.text, definition.source.replace('{mode}', 'denied'))
      }
    }
  }
})

test('unknown geographic status or policy mode fails before publishing copy', () => {
  const preference = {requested:'ar', preview:true}
  assert.throws(() => localizedGeographicStatus(preference, {id:'geographic.status.invented'}), /UNKNOWN_GEOGRAPHIC_STATUS/)
  assert.throws(() => localizedGeographicStatus(preference, {id:'geographic.status.policyClosed',mode:'invented'}), /UNKNOWN_GEOGRAPHIC_POLICY_MODE/)
})

test('dynamic geographic bindings are backed by finite immutable source maps', () => {
  const helper = fs.readFileSync(new URL('../src/lib/i18n/geographicCopy.ts', import.meta.url), 'utf8')
  const ids = localizationMessageBindings(helper, URAI_SOURCE_MESSAGES, 'geographicCopy.ts')
  for (const id of Object.keys(URAI_GEOGRAPHIC_MESSAGES).filter(id => id.startsWith('geographic.status.'))) assert.ok(ids.includes(id), id)
  for (const mode of ['granted','limited','paused','denied']) assert.ok(ids.includes(`geographic.authority.${mode}`))
  const componentIds = localizationMessageBindings(source, URAI_SOURCE_MESSAGES, 'GeographicLocationClient.tsx')
  assert.ok(componentIds.includes('geographic.action.revoke'))
  assert.ok(componentIds.includes('geographic.map.label'))
  assert.doesNotMatch(source, /<section className="geoMap"[^>]*\blang=/)
  assert.match(source, /<section className="geoMap" aria-labelledby="geo-map-label">/)
  assert.match(source, /<span id="geo-map-label" \{\.\.\.locale\.props\('geographic\.map\.label'\)\}/)
})

test('an absent prepared geographic label uses reviewed English with matching metadata', () => {
  const id = 'geographic.title'
  const previous = URAI_CATALOGS.ar[id]
  try {
    URAI_CATALOGS.ar[id] = '   '
    assert.deepEqual(localizedMessage({requested:'ar', preview:true}, id), {text:URAI_GEOGRAPHIC_MESSAGES[id].source,locale:'en',direction:'ltr',preview:false})
  } finally { URAI_CATALOGS.ar[id] = previous }
})

const require = createRequire(import.meta.url)
const compiled = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText
function actualGeographicMarkup(preference) {
  const locale = {preference,text:(id,values)=>localizedMessage(preference,id,values).text,props:id=>{const copy=localizedMessage(preference,id);return {lang:copy.locale,dir:copy.direction,'data-urai-translation-preview':String(copy.preview)}}}
  const noExternal = () => { throw new Error('INERT_GEOGRAPHIC_EXTERNAL_CALL') }
  const module = {exports:{}}
  const imports = id => {
    if (id === 'react' || id === 'react/jsx-runtime') return require(id)
    if (id === 'firebase/auth') return {getAuth:noExternal,onAuthStateChanged:noExternal}
    if (id === 'firebase/firestore') return {doc:noExternal,onSnapshot:noExternal}
    if (id === 'next/link') return {__esModule:true,default:({children,...props})=>React.createElement('a',props,children)}
    if (id.endsWith('consentModel')) return {defaultConsentPolicy,isConsentPolicy}
    if (id.endsWith('firebase/client')) return {app:null,firebasePublicEnvReady:false,getFirebaseDb:noExternal}
    if (id.endsWith('geographicLocationVault')) return vault
    if (id.endsWith('useUraiLocale')) return {useUraiLocale:()=>locale}
    if (id.endsWith('geographicMessages')) return {URAI_GEOGRAPHIC_MESSAGES}
    if (id.endsWith('geographicCopy')) return {localizedGeographicStatus}
    if (id.endsWith('geographicLocationRequest')) return {createGeographicLocationRequest}
    if (id.endsWith('.css')) return {}
    throw new Error(`UNKNOWN_GEOGRAPHIC_FIXTURE_IMPORT:${id}`)
  }
  vm.runInNewContext(compiled,{module,exports:module.exports,require:imports,console},{filename:'actual-GeographicLocationClient.tsx'})
  return renderToStaticMarkup(React.createElement(module.exports.default))
}

test('actual geographic component renders preview headings beside English consent and signed-out state', () => {
  for (const requested of ['en','fr','ar']) {
    const html = actualGeographicMarkup({requested,preview:true})
    const title = URAI_GEOGRAPHIC_CATALOGS[requested]['geographic.title']
    assert.ok(html.includes(`>${title}</h1>`), requested)
    assert.match(html, /role="status" aria-live="polite" lang="en" dir="ltr" data-urai-translation-preview="false"/)
    assert.ok(html.includes(URAI_GEOGRAPHIC_MESSAGES['geographic.status.off'].source))
    assert.ok(html.includes(URAI_GEOGRAPHIC_MESSAGES['geographic.policy.signedOut'].source))
    assert.match(html, /data-location-authority="signed-out"/)
    assert.match(html, /<section class="geoMap" aria-labelledby="geo-map-label">/)
    assert.match(html, /<input dir="auto" value="Current place"/)
  }
})

test('frozen geographic source placeholders bind only policy and display values', () => {
  const expected = {
    'geographic.status.policyClosed': ['mode'],
    'geographic.status.policyBlocked': ['mode'],
    'geographic.policy.summary': ['mode','precise'],
    'geographic.coordinate.accuracy': ['meters'],
    'geographic.pins.countOne': ['count'],
    'geographic.pins.countOther': ['count'],
  }
  const actual = Object.fromEntries(Object.entries(URAI_GEOGRAPHIC_CATALOGS.en).map(([id,text]) => [id,[...text.matchAll(/\{([a-zA-Z]+)\}/g)].map(m=>m[1])]).filter(([,values])=>values.length))
  assert.deepEqual(actual, expected)
})
