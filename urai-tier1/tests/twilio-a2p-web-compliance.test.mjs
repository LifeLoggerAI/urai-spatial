import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = path.resolve(import.meta.dirname, '..')
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8')

const requiredPrivacySentence = 'We do not sell or share your SMS opt-in data or personal information with third parties for marketing purposes.'
const disclosure = 'I agree to receive SMS messages from UrAi, including account notifications, service updates, user-requested reminders, and customer-care messages. Message frequency varies. Message and data rates may apply. Reply STOP to opt out or HELP for help. Consent is not required to use UrAi.'

test('public Privacy Policy contains Twilio A2P SMS privacy requirements', () => {
  const privacy = read('src/app/privacy/page.tsx')
  assert.match(privacy, /<h1 id="privacy-policy-heading"[^>]*>Privacy Policy<\/h1>/)
  assert.ok(privacy.includes(requiredPrivacySentence))
  assert.match(privacy, /UrAi/)
  assert.match(privacy, /mobile phone number/)
  assert.match(privacy, /SMS consent/)
  assert.match(privacy, /account and service notifications/)
  assert.match(privacy, /user-requested reminders/)
  assert.match(privacy, /customer-care/)
})

test('public Terms & Conditions contains complete SMS terms', () => {
  const terms = read('src/app/terms/page.tsx')
  assert.match(terms, /<h1 id="terms-heading"[^>]*>Terms &amp; Conditions<\/h1>/)
  for (const phrase of [
    'SMS Terms',
    'Users who expressly opt in may receive SMS messages from UrAi',
    'Message frequency varies.',
    'Message and data rates may apply.',
    'Reply STOP to opt out at any time.',
    'Reply HELP for assistance.',
    'Consent to receive SMS messages is not required to use UrAi.',
  ]) assert.ok(terms.includes(phrase), `Terms missing required phrase: ${phrase}`)
})

test('authenticated communication settings collect explicit optional SMS consent', () => {
  const client = read('src/app/settings/communications/CommunicationSettingsClient.tsx')
  assert.ok(client.includes(disclosure))
  assert.match(client, /type="tel"/)
  assert.match(client, /type="checkbox"/)
  assert.match(client, /checked=\{affirmed\}/)
  assert.doesNotMatch(client, /defaultChecked/)
  assert.match(client, /required/)
  assert.match(client, /Enable SMS/)
  assert.match(client, /Disable SMS/)
  assert.match(client, /consented: true/)
  assert.match(client, /consented: false/)
  assert.match(client, /withdrawnAt/)
  assert.match(client, /href="\/privacy\/"/)
  assert.match(client, /href="\/terms\/"/)
  assert.match(client, /aria-live="polite"/)
  assert.match(client, /minHeight: 48/)
  assert.match(client, /This setting does not authorize purchased-list marketing or SMS authentication codes/)
})

test('public SMS opt-in proof is documentation-only and mirrors the real consent disclosure', () => {
  const proof = read('src/app/sms-opt-in/page.tsx')
  assert.ok(proof.includes(disclosure))
  assert.match(proof, /does not submit a phone number, create an account, or enroll anyone in SMS/)
  assert.match(proof, /checked=\{false\}/)
  assert.match(proof, /Privacy Policy/)
  assert.match(proof, /Terms &amp; Conditions/)
  assert.match(proof, /After the authenticated user submits the form/)
  assert.match(proof, /SMS messaging enabled/)
  assert.match(proof, /Disable SMS/)
  assert.match(proof, /\/settings\/communications/)
})

test('route manifest registers the compliance surfaces as critical public routes', () => {
  const manifest = JSON.parse(read('../release/route-manifest.json'))
  for (const route of ['/privacy', '/terms', '/settings/communications', '/sms-opt-in']) {
    assert.ok(manifest.criticalRoutes.includes(route), `${route} missing from criticalRoutes`)
    assert.ok(manifest.classification.publicExact.includes(route), `${route} missing from publicExact`)
  }
})
