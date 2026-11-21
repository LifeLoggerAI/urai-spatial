import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const scene = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionPolished.tsx', import.meta.url), 'utf8')
const atmosphere = readFileSync(new URL('../src/spatial/world/persistentRealmAtmosphere.css', import.meta.url), 'utf8')

test('distant Home fog shares the real 3D sky color family without changing Ascent fog', () => {
  const fog = scene.match(/<fogExp2 attach="fog" args=\{\[cosmic \? '#050b14' : '(#[0-9a-f]{6})', cosmic \? \.0017 : \.0095\]\} \/>/)
  assert.ok(fog, 'Home and Ascent fog settings are retained with a distinct Home color')
  assert.equal(fog[1], '#638ca0')
})

test('ready Home excludes the duplicate persistent atmosphere while unready Home retains it', () => {
  assert.match(atmosphere, /data-world-destination='home'[\s\S]*?data-home-assets-ready='true'[\s\S]*?\.urai-world-atmosphere\s*\{\s*display:\s*none\s*;/)
})
