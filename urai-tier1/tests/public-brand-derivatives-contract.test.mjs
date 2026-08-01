import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = path.resolve(process.cwd(), '..')
const visualAuthority = fs.readFileSync(path.join(root, 'brand/VISUAL_MASTER_AUTHORITY.md'), 'utf8')
const rejected = fs.readFileSync(path.join(root, 'brand/REJECTED_VISUAL_ALTERNATES.md'), 'utf8')
const registry = JSON.parse(fs.readFileSync(path.join(root, 'brand/public-identity-registry.json'), 'utf8'))
const generator = fs.readFileSync(path.join(process.cwd(), 'scripts/generate-public-brand-derivatives.mjs'), 'utf8')

test('public identity authority is exact and bounded', () => {
  assert.match(visualAuthority, /UrAi/)
  assert.match(visualAuthority, /RuAi/)
  assert.match(visualAuthority, /URAI Labs/)
  assert.match(visualAuthority, /URAI Foundation/)
  assert.match(visualAuthority, /URAI IP Holdings/)
  assert.match(visualAuthority, /provisional (?:visual|founder) authority/i)
  assert.match(rejected, /Fixed uppercase `URAI` consumer wordmark/)
  assert.equal(registry.admission.providerCalls, 0)
  assert.equal(registry.admission.spendUsd, '0.00')
  assert.equal(registry.admission.productionPublished, false)
  assert.equal(registry.admission.certifiedV1ImagesRegenerated, false)
  assert.equal(registry.admission.promotedModelsRegenerated, false)
  assert.equal(registry.admission.v2plusAdmitted, false)
})

test('registry contains complete deterministic launch derivatives', () => {
  const ids = new Set(registry.derivatives.map((item) => item.id))
  for (const required of ['favicon-16','favicon-32','favicon-48','favicon-svg','apple-touch','pwa-192','pwa-512','pwa-maskable-192','pwa-maskable-512','android-foreground','android-background','notification','store-apple','store-play','social-avatar','splash-mark-svg','splash-mark-png','loading-mark','ruai-social-avatar']) {
    assert.ok(ids.has(required), `missing ${required}`)
  }
  assert.equal(registry.geometry.maskableEssentialDiameterPercent, 66)
  assert.equal(registry.geometry.smallSizeSimplificationBelowPx, 32)
  assert.equal(registry.identities.urai.displayName, 'UrAi')
  assert.equal(registry.identities.ruai.displayName, 'RuAi')
  assert.notEqual(registry.identities.urai.structuralModifier, registry.identities.ruai.structuralModifier)
})

test('generator is deterministic, local, and writes hashes', () => {
  assert.match(generator, /createHash\('sha256'\)/)
  assert.match(generator, /manifest\.json/)
  assert.match(generator, /providerCalls:\s*0/)
  assert.match(generator, /spendUsd:\s*'0\.00'/)
  assert.doesNotMatch(generator, /\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|\bEventSource\b|node:https?|\baxios\b|\bundici\b/)
  assert.doesNotMatch(generator, /OpenAI|Maps|Places|Routes/)
})
