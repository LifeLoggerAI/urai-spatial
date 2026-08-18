import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const companion = fs.readFileSync(new URL('../src/spatial/world/PersistentWorldCompanion.tsx', import.meta.url), 'utf8')
const companionCss = fs.readFileSync(new URL('../src/spatial/world/persistentWorldCompanion.css', import.meta.url), 'utf8')

const estateBlockMatch = companion.match(/const PUBLIC_ESTATE:[\s\S]*?\n\]/)
assert.ok(estateBlockMatch, 'public estate registry must exist')
const estateBlock = estateBlockMatch[0]

const approvedPublicProperties = [
  'URAI Studio',
  'URAI Privacy',
  'URAI Labs',
  'URAI Foundation',
]

const restrictedProperties = [
  'Storytime',
  'Investors',
  'B2B',
  'Marketing',
  'Content',
  'Jobs Runtime',
  'Communications',
  'Admin',
  'Analytics',
  'Staging',
  'Asset Factory',
  'Stewardship',
  'UrAiProd',
  'UrAi-Dev',
]

test('public estate exposes only the four approved public properties', () => {
  for (const label of approvedPublicProperties) {
    assert.ok(estateBlock.includes(`label: '${label}'`), `missing approved public property: ${label}`)
  }
  assert.equal((estateBlock.match(/id:/g) ?? []).length, approvedPublicProperties.length)
  for (const label of restrictedProperties) {
    assert.ok(!estateBlock.includes(label), `restricted property must not enter the public estate: ${label}`)
  }
})

test('unverified public properties fail closed as status-only entries', () => {
  assert.equal((estateBlock.match(/status: 'verification-pending'/g) ?? []).length, approvedPublicProperties.length)
  assert.ok(!/href\s*:/.test(estateBlock), 'verification-pending registry entries must not contain outbound URLs')
  assert.match(companion, /entry\.status === 'live' && entry\.href/)
  assert.match(companion, /Verification pending/)
  assert.match(companion, /data-estate-status=\{entry\.status\}/)
})

test('public constellation is semantic and accessible without WebGL', () => {
  assert.match(companion, /<section className="urai-world-companion__estate" aria-labelledby="urai-public-estate-title">/)
  assert.match(companion, /<h2 id="urai-public-estate-title">Public constellation<\/h2>/)
  assert.match(companion, /<ul>/)
  assert.match(companion, /<li key=\{entry\.id\}/)
  assert.match(companion, /<a href=\{entry\.href\} target="_blank" rel="noreferrer">/)
  assert.match(companionCss, /@media \(max-width: 560px\)[\s\S]*\.urai-world-companion__estate ul \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); \}/)
  assert.match(companionCss, /@media \(forced-colors: active\)/)
  assert.match(companionCss, /@media \(prefers-reduced-motion: reduce\)/)
})
