import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const auth = fs.readFileSync('src/app/login/LoginClient.tsx', 'utf8')
const settings = fs.readFileSync('src/app/settings/DeviceSettingsClient.tsx', 'utf8')
const xr = fs.readFileSync('src/spatial/xr/xrReleaseAuthority.ts', 'utf8')

test('canonical auth entry uses Firebase provider authority and never collects provider passwords', () => {
  assert.match(auth, /GoogleAuthProvider/)
  assert.match(auth, /signInWithPopup/)
  assert.match(auth, /onAuthStateChanged/)
  assert.match(auth, /firebasePublicEnvReady/)
  assert.match(auth, /Private routes remain fail-closed/)
  // Fictional emulator password input is guarded, never a production login.
  assert.match(auth, /uraiJourneyEmulatorEnabled \? \(/)
  assert.match(auth, /data-testid="urai-e2e-password"/)
  assert.match(auth, /signInWithEmailAndPassword\(getUraiAuth\(\)/)
})

test('device settings exposes the governed persistent haptic hard-off control', () => {
  assert.match(settings, /setHapticsEnabled/)
  assert.match(settings, /URAI_HAPTICS_STORAGE_KEY/)
  assert.match(settings, /type="checkbox"/)
  assert.match(settings, /No haptic event is sent to a server/)
  assert.match(settings, /\/privacy-controls/)
})

test('XR launch authority is narrowed until physical hardware evidence exists', () => {
  assert.match(xr, /preview-only-not-physically-verified/)
  assert.match(xr, /physicalHardwareCertified: false/)
  assert.match(xr, /productionFinal: false/)
  assert.match(xr, /frame-pacing evidence/)
})

test('post-login target remains first-party and allowlisted', () => {
  assert.match(auth, /function safePrivateReturnTo/)
  assert.match(auth, /location\.origin !== 'https:\/\/urai\.invalid'/)
  assert.match(auth, /routes\.has\(location\.pathname\)/)
  assert.match(auth, /href=\{returnTo\}/)
})

test('Life Movie preserves selected movie and chapter across login', () => {
  const movie = fs.readFileSync('src/app/life-movie/LifeMovieClient.tsx', 'utf8')
  assert.match(movie, /lifeMovieSignInHref\(requestedMovieId, requestedMemoryId\)/)
})
