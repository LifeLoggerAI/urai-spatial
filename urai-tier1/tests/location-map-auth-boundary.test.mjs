import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const scene = fs.readFileSync(new URL('../src/spatial/places/LocationMapScene.tsx', import.meta.url), 'utf8')
const boundary = fs.readFileSync(new URL('../src/spatial/places/LocationMapAcceptanceBoundary.tsx', import.meta.url), 'utf8')
const wheelBridge = fs.readFileSync(new URL('../src/spatial/places/LocationMapNativeWheelBridge.tsx', import.meta.url), 'utf8')

test('Location Map production access uses Firebase auth and explicit demo intent only', () => {
  assert.match(scene, /onAuthStateChanged\(getAuth\(app\)/)
  assert.match(scene, /searchParams\.get\('demo'\) === '1'/)
  assert.match(scene, /setAccess\(user \? 'private' : 'threshold'\)/)
  assert.doesNotMatch(scene, /urai:userId|locationMapDemoMode|localStorage\.getItem|localStorage\.setItem/)
})

test('private Location Map fixtures remain behind the server-enabled acceptance boundary', () => {
  assert.match(boundary, /if \(!enabled\) return <LocationMapScene places=\{places\} \/>/)
  assert.match(boundary, /acceptanceAccessMode="private"/)
  assert.match(scene, /acceptanceAccessMode = null/)
  assert.match(scene, /if \(acceptanceAccessMode === 'private'\)/)
})

test('native Location Map input bridge cannot restore implicit demo authority', () => {
  assert.doesNotMatch(wheelBridge, /localStorage|locationMapDemoMode|history\.replaceState/)
  assert.match(wheelBridge, /overview\.click\(\)/)
})
