import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = path.resolve(import.meta.dirname, '..')
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8')

test('Privacy Controls has one canonical route owner', () => {
  const page = read('src/app/privacy-controls/page.tsx')
  const legacy = read('src/app/UraiAutonomousV1Layer.tsx')
  assert.match(page, /ConsentSanctuaryClient/)
  assert.match(page, /<ConsentSanctuaryClient\s*\/>/)
  assert.doesNotMatch(legacy, /pathname\.startsWith\("\/privacy-controls"\)/)
  assert.match(legacy, /Privacy Controls is explicitly/)
})

test('Consent Sanctuary is spatial and remains directly operable', () => {
  const client = read('src/app/privacy-controls/ConsentSanctuaryClient.tsx')
  const css = read('src/app/privacy-controls/consent-sanctuary.css')
  assert.match(client, /<Canvas/)
  assert.match(client, /OrbitControls/)
  assert.match(client, /DOMAIN_ORDER\.map/)
  assert.match(client, /Skip to direct controls/)
  assert.match(client, /role="dialog"/)
  assert.match(client, /aria-live="polite"/)
  assert.match(client, /DEMONSTRATION — no personal data/)
  assert.match(client, /No private data was replaced with demo data/)
  assert.match(css, /min-height:48px/)
  assert.match(css, /prefers-reduced-motion/)
  assert.match(css, /forced-colors/)
})

test('Consent mutations are authenticated, transactional, revisioned, and audited', () => {
  const client = read('src/app/privacy-controls/ConsentSanctuaryClient.tsx')
  const model = read('src/app/privacy-controls/consentModel.ts')
  assert.match(client, /onAuthStateChanged/)
  assert.match(client, /runTransaction/)
  assert.match(client, /CONSENT_REVISION_CONFLICT/)
  assert.match(client, /privacyPolicy', 'current'/)
  assert.match(client, /privacyAudit/)
  assert.match(client, /result: 'enforced'/)
  assert.match(client, /serverTimestamp\(\)/)
  assert.match(model, /'memory' \| 'location' \| 'models' \| 'exports' \| 'workforce' \| 'identity'/)
  assert.match(model, /consequenceSummary/)
})

test('Firestore rules deny cross-user writes and enforce append-only audit receipts', () => {
  const rules = read('../firebase/firestore.rules')
  assert.match(rules, /match \/privacyPolicy\/\{docId\}/)
  assert.match(rules, /request\.resource\.data\.revision == resource\.data\.revision \+ 1/)
  assert.match(rules, /match \/privacyAudit\/\{auditId\}/)
  assert.match(rules, /request\.resource\.data\.receiptId == auditId/)
  assert.match(rules, /allow update, delete: if false/)
  assert.match(rules, /request\.resource\.data\.ownerId == uid/)
})
