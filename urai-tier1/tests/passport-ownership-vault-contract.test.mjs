import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = path.resolve(import.meta.dirname, '..')
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8')

test('Passport has one canonical route owner and excludes the legacy realm owner', () => {
  const page = read('src/app/passport/page.tsx')
  const client = read('src/app/passport/PassportVaultClient.tsx')
  const legacy = read('src/app/UraiAutonomousV1Layer.tsx')
  const realmCanon = read('tests/guardian/realm-routes-canon.test.mjs')
  const runtimeCanon = read('tests/guardian/passport-council-runtime-canon.test.mjs')
  assert.match(page, /PassportVaultClient/)
  assert.match(page, /<PassportVaultClient\s*\/>/)
  assert.doesNotMatch(page, /FinalPassportVault/)
  assert.match(client, /data-route-owner="passport-ownership-vault"/)
  assert.doesNotMatch(legacy, /pathname\.startsWith\("\/passport"\)/)
  assert.match(realmCanon, /PassportVaultClient/)
  assert.match(runtimeCanon, /PassportVaultClient/)
  assert.doesNotMatch(runtimeCanon, /assert\.match\(passportRoute, \/FinalPassportVault/)
})

test('Ownership Vault is spatial and directly accessible without WebGL', () => {
  const client = read('src/app/passport/PassportVaultClient.tsx')
  const css = read('src/app/passport/passport-vault.css')
  assert.match(client, /<Canvas/)
  assert.match(client, /OrbitControls/)
  assert.match(client, /Skip to vault controls/)
  assert.match(client, /All records and actions remain available without WebGL/)
  assert.match(client, /event\.key === 'Home'/)
  assert.match(client, /event\.key === 'Escape'/)
  assert.match(client, /aria-live="polite"/)
  assert.match(client, /DEMONSTRATION — sample data only/)
  assert.match(css, /min-height:48px/)
  assert.match(css, /prefers-reduced-motion/)
  assert.match(css, /forced-colors/)
})

test('Ownership Vault has no runtime font or external CDN dependency', () => {
  const client = read('src/app/passport/PassportVaultClient.tsx')
  assert.doesNotMatch(client, /\bText\b/)
  assert.doesNotMatch(client, /unicode-font-resolver/)
  assert.doesNotMatch(client, /cdn\.jsdelivr\.net/)
  assert.match(client, /boxGeometry/)
})

test('Passport uses trusted authenticated export deletion and snapshot operations', () => {
  const client = read('src/app/passport/PassportVaultClient.tsx')
  const bridge = read('src/lib/privacy/operationalPrivacyClient.ts')
  assert.match(client, /onAuthStateChanged/)
  assert.match(client, /getOperationalPassportSnapshot/)
  assert.match(client, /createOperationalExportRequest/)
  assert.match(client, /getOperationalExportDownloadUrl/)
  assert.match(client, /createOperationalDeletionRequest/)
  assert.match(client, /Nothing is called deleted until the trusted job reports completed/)
  assert.match(bridge, /httpsCallable/)
  assert.match(bridge, /collection\(getFirebaseDb\(\), 'users', uid, collectionName\)/)
  assert.doesNotMatch(bridge, /collection\(getFirebaseDb\(\), collectionName\)/)
})

test('Passport does not leak private identifiers into public presentation state', () => {
  const model = read('src/app/passport/passportModel.ts')
  const client = read('src/app/passport/PassportVaultClient.tsx')
  assert.match(model, /redactPassportSnapshot/)
  assert.match(client, /ownerReference/)
  assert.doesNotMatch(client, /window\.location\.search.*uid|[?&]uid=/)
  assert.doesNotMatch(client, /providerSecret|accessToken|refreshToken/)
})
