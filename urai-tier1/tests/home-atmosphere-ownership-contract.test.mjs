import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const css = readFileSync(new URL('../src/spatial/world/persistentRealmAtmosphere.css', import.meta.url), 'utf8')
const home = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionPolished.tsx', import.meta.url), 'utf8')
const shell = readFileSync(new URL('../src/spatial/world/UraiWorldShell.tsx', import.meta.url), 'utf8')
const runtime = readFileSync(new URL('../src/app/HomeSpatialRuntimeLayer.tsx', import.meta.url), 'utf8')

test('ready asset-driven Home owns its 3D sky instead of receiving the persistent CSS overlay', () => {
  assert.match(css, /\.urai-world-runtime\[data-world-destination='home'\]:has\(\s*\.urai-asset-home-world\[data-home-primary-owner='asset-driven'\]\[data-home-assets-ready='true'\]\s*\)\s*>\s*\.urai-world-atmosphere\s*\{\s*display:\s*none\s*;/)
  assert.match(home, /<HomeSkyGradient\s*\/>/)
  assert.match(home, /data-home-assets-ready=\{ready \? 'true' : 'false'\}/)
  assert.match(shell, /<PersistentRealmAtmosphere\s*\/>/)
})

test('fallback or unready Home and every other realm retain the persistent atmosphere', () => {
  const scoped = css.match(/\.urai-world-runtime\[data-world-destination='home'\]:has\([\s\S]*?\)\s*>\s*\.urai-world-atmosphere\s*\{\s*display:\s*none\s*;/)?.[0] ?? ''
  assert.ok(scoped.includes("data-home-assets-ready='true'"))
  assert.ok(scoped.includes("data-world-destination='home'"))
  assert.doesNotMatch(css, /(?:^|\n)\s*\.urai-world-atmosphere\s*\{\s*display:\s*none\s*;/)
  assert.match(runtime, /data-home-assets-ready=\{assetsReady \? 'true' : 'false'\}/)
  assert.match(runtime, /accessible-fallback-without-webgl/)
})
