import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const home = fs.readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV223.tsx', import.meta.url), 'utf8')
const homeRepair = fs.readFileSync(new URL('../src/spatial/layout/HomeAAAVisualRepair.tsx', import.meta.url), 'utf8')
const vault = fs.readFileSync(new URL('../src/app/passport/PassportVaultClient.tsx', import.meta.url), 'utf8')
const controller = fs.readFileSync(new URL('../src/spatial/home/useHomeExperienceController.ts', import.meta.url), 'utf8')
const state = fs.readFileSync(new URL('../src/spatial/home/homeExperienceState.ts', import.meta.url), 'utf8')

test('Passport has one governed visible folio plus a hidden proximity and keyboard bridge', () => {
  assert.match(home, /function HomePassportSemanticBridge/)
  assert.match(home, /name="home-passport-semantic-bridge"/)
  assert.match(home, /visible=\{false\}/)
  assert.match(home, /semanticOwner: 'passport-proximity-bridge'/)
  assert.match(home, /visualAuthority: false/)
  assert.match(home, /supersededBy: 'home-first-person-passport-ownership-object'/)
  assert.doesNotMatch(home, /home-passport-book|home-physical-passport-artifact/)
  assert.match(homeRepair, /name="home-first-person-passport-ownership-object"/)
  assert.match(homeRepair, /visualForm: 'rigid-ownership-folio-v1'/)
  assert.match(home, /data-home-passport-artifact="governed-rigid-folio-visual-plus-semantic-bridge"/)
  assert.match(home, /data-testid="urai-home-passport-interact"/)
  assert.match(home, /Open Passport/)
})
test('Passport entry preserves the exact bodyless first-person Home origin', () => {
  assert.match(home, /HOME_PASSPORT_ORIGIN_CAPTURE_EVENT/)
  assert.match(home, /destination: 'passport'/)
  assert.match(home, /entryPortal: 'home-passport-ownership-object'/)
  assert.match(home, /cameraCheckpoint: 'home-first-person-passport-origin'/)
  assert.match(controller, /persistHomeReturnFrame\(\{ kind: 'destination', destination: 'PASSPORT', origin: currentOrigin\(\) \}\)/)
  assert.match(state, /HomeReturnDestination = HomeDestination \| 'PASSPORT'/)
})

test('Passport vault returns through governed world state rather than a blind Home link', () => {
  assert.match(vault, /requestUraiWorldReturn/)
  assert.match(vault, /data-testid="passport-return-origin"/)
  assert.match(vault, />Return to origin</)
})
