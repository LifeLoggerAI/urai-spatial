import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const canonical = fs.readFileSync(new URL('../src/app/shadow/page.tsx', import.meta.url), 'utf8')
const alias = fs.readFileSync(new URL('../src/app/spatial/shadow/page.tsx', import.meta.url), 'utf8')

test('Shadow aliases share one canonical embodied runtime', () => {
  for (const source of [canonical, alias]) {
    assert.match(source, /SpatialRealmRuntime/)
    assert.match(source, /realm="shadow"/)
    assert.match(source, /postLaunchSpatialRealmsEnabled/)
  }
  assert.doesNotMatch(alias, /ShadowRealmPortal/)
  assert.match(alias, /data-route-owner="canonical-shadow-runtime"/)
})
