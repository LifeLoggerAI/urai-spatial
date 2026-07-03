import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const runtime = fs.readFileSync(path.join(root, 'src/app/UraiAutonomousV1Realms.tsx'), 'utf8')
const styles = fs.readFileSync(path.join(root, 'src/app/urai-autonomous-v1-realms-final.css'), 'utf8')

test('the visible realm owner uses the canonical provider asset registry', () => {
  for (const token of [
    'mirrorAssets.primary.src',
    'mirrorAssets.accents.pattern.src',
    'uiAssets.orbActive.src',
    'avatarAssets.mirror.src',
    'passportAssets.primary.src',
    'passportAssets.accents.ownershipSeal.src',
    'privacyControlsAssets.primary.src',
    'locationMapAssets.primary.src',
    'statusAssets.primary.src',
  ]) {
    assert.match(runtime, new RegExp(token.replaceAll('.', '\\.')))
  }
  assert.match(runtime, /data-realm-art="provider-final"/)
  assert.match(runtime, /urai-autonomous-v1-realms-final\.css/)
})

test('Mirror is embodied and non-judgmental in the actual fixed owner', () => {
  assert.match(runtime, /Mirror does not judge\./)
  assert.match(runtime, /Mirror Guide private workforce presence/)
  assert.match(runtime, /See the pattern\. Keep your authority\./)
  assert.match(runtime, /replay-recovery-thread/)
  assert.match(styles, /\.uraiAutoMirror \.uraiRealmAccent-2/)
  assert.match(styles, /\.uraiRealmGuide i/)
})

test('Passport exposes ownership and reversible consent in the actual fixed owner', () => {
  assert.match(runtime, /Ownership key active/)
  assert.match(runtime, /Review permissions/)
  assert.match(runtime, /privacy-controls#export/)
  assert.match(runtime, /privacy-controls#delete/)
  assert.match(styles, /\.uraiAutoPassport \.uraiRealmAccents::before/)
})

test('realm upgrades remain mobile-safe and reduced-motion safe', () => {
  assert.match(styles, /@media \(max-width: 760px\)/)
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(runtime, /aria-label=\{realm\.guide\.alt\}/)
  assert.match(runtime, /aria-label=\{`\$\{realm\.label\} action paths`\}/)
})
