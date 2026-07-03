import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const registry = fs.readFileSync(path.join(root, 'src/spatial/assets/uraiV2Assets.ts'), 'utf8')
const resolver = fs.readFileSync(path.join(root, 'src/spatial/v2/livingStateResolver.ts'), 'utf8')
const layout = fs.readFileSync(path.join(root, 'src/app/layout.tsx'), 'utf8')

const cssFiles = [
  'v2-ground-states.css',
  'v2-ground-council.css',
  'v2-ground-objects.css',
  'v2-memory-states.css',
  'v2-realm-states.css',
  'v2-accessibility-states.css',
]

const expectedGroupCounts = {
  helperSpecs: 11,
  objectSpecs: 9,
  starSpecs: 19,
  focusSpecs: 9,
  replaySpecs: 9,
  mirrorSpecs: 7,
  passportSpecs: 8,
  onboardingSpecs: 4,
  accessibilitySpecs: 4,
}

test('V2 registry contains the canonical 80 living states', () => {
  let total = 0
  for (const [name, expected] of Object.entries(expectedGroupCounts)) {
    const match = registry.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\] as const`))
    assert.ok(match, `${name} must exist`)
    const count = (match[1].match(/^\s*\['/gm) || []).length
    assert.equal(count, expected, `${name} count`)
    total += count
  }
  assert.equal(total, 80)
  assert.match(registry, /export const V2_ASSET_COUNT/)
  assert.match(registry, /const v2Root = '\/assets\/urai\/v2'/)
})

test('V2 resolver keeps memory, consent, Ground, onboarding, and accessibility state rules explicit', () => {
  for (const token of ['resolveMemoryState', 'resolveConsentState', 'resolveGroundState', 'onboardingState', 'accessibilityState']) {
    assert.match(resolver, new RegExp(token))
  }
})

test('the root runtime activates V2 without removing the V1 owner', () => {
  assert.match(layout, /UraiAutonomousV1Layer/)
  assert.match(layout, /UraiV2OnboardingLayer/)
  assert.match(layout, /data-urai-living-state-layer="v2"/)
})

test('all visible V2 presentation layers are loaded by the onboarding runtime', () => {
  const component = fs.readFileSync(path.join(root, 'src/app/UraiV2OnboardingLayer.tsx'), 'utf8')
  for (const file of cssFiles) {
    assert.match(component, new RegExp(file.replaceAll('.', '\\.')))
    assert.equal(fs.existsSync(path.join(root, 'src/app', file)), true, `${file} must exist`)
  }
})
