import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { buildExplicitDemoMemory } from '../src/spatial/memory/selectedMemoryContract.ts'
import { applyMirrorFixture, buildMirrorPatterns } from '../src/spatial/mirror/mirrorPatternModel.ts'

const pageSource = fs.readFileSync(new URL('../src/app/mirror/page.tsx', import.meta.url), 'utf8')
const bareEntrySource = fs.readFileSync(new URL('../src/app/mirror/MirrorBareEntryGuard.tsx', import.meta.url), 'utf8')
const clientSource = fs.readFileSync(new URL('../src/app/mirror/MirrorSpatialClient.tsx', import.meta.url), 'utf8')
const mobileInspectionCss = fs.readFileSync(new URL('../src/app/mirror/mirror-mobile-inspection.css', import.meta.url), 'utf8')
const modelSource = fs.readFileSync(new URL('../src/spatial/mirror/mirrorPatternModel.ts', import.meta.url), 'utf8')
const navigationSource = fs.readFileSync(new URL('../src/spatial/navigation/EmbodiedNavigation.tsx', import.meta.url), 'utf8')
const proofWorkflowSource = fs.readFileSync(new URL('../../.github/workflows/mirror-release-proof.yml', import.meta.url), 'utf8')

test('Mirror route has one embodied spatial owner and no promotional-image owner', () => {
  assert.match(pageSource, /MirrorSpatialClient/)
  assert.match(pageSource, /MirrorBareEntryGuard/)
  assert.match(pageSource, /mirror-embodied-reflection-chamber/)
  assert.doesNotMatch(pageSource, /mirror-reflection-main\.webp/)
  assert.doesNotMatch(pageSource, /Reflection stack/)
  assert.doesNotMatch(pageSource, /See the pattern clearly/)
  assert.doesNotMatch(pageSource, /import Link from/)
})

test('bare Mirror entry remains usable without silently substituting private data', () => {
  for (const required of [
    'data-testid="mirror-bare-entry"',
    'data-demo-disclosure="required"',
    'Open disclosed demo',
    'Open Passport',
    'Return home',
    "params.get('memoryId') ?? params.get('node')",
    "params.get('mirrorFixture')",
    'demo%3Amirror-preview',
  ]) assert.match(bareEntrySource, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))

  assert.match(bareEntrySource, /Mirror will not invent or silently substitute a private memory/)
  assert.doesNotMatch(bareEntrySource, /window\.location\.replace/)
})

test('Mirror spatial runtime owns chamber, embodied reflection, interaction, restoration, and fallbacks', () => {
  for (const required of [
    'data-mirror-renderer="webgl-r3f"',
    'privacy-safe-user-reflection',
    'mirror-reflection-instrument',
    'mirror-pattern-object',
    'mirror-reflection-fragment',
    'useSelectedMemory',
    'useReducedMotion',
    'useWebGLAvailable',
    'mirror-webgl-fallback',
    'MobileMovementPad',
    'useMovementInput',
    'useDragLook',
    'requestUraiWorldTravel',
    "destination: 'replay'",
    "destination: 'passport'",
    "window.addEventListener('popstate'",
    'window.history.replaceState',
    'aria-live="polite"',
    'min-height:48px',
  ]) assert.match(clientSource, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))

  assert.doesNotMatch(clientSource, /quiet-reset/)
  assert.doesNotMatch(clientSource, /mirror-reflection-main\.webp/)
  assert.doesNotMatch(clientSource, /generic person/i)
})

test('Mirror model derives typed evidence-aware patterns from authorized memory', () => {
  const memory = buildExplicitDemoMemory('demo:mirror-contract')
  const patterns = buildMirrorPatterns(memory)
  assert.deepEqual(patterns.map((pattern) => pattern.id), [
    'body-rhythm',
    'relationship-weather',
    'emotional-recurrence',
    'becoming',
  ])
  for (const pattern of patterns) {
    assert.equal(pattern.provenance.includes('demonstration'), true)
    assert.equal(pattern.sources.every((source) => source.permission === 'demo'), true)
    assert.equal(typeof pattern.uncertainty, 'string')
    assert.equal(typeof pattern.confidenceLabel, 'string')
    assert.equal(Array.isArray(pattern.fragments), true)
    assert.equal(pattern.summary.includes('diagnosis'), false)
  }
  assert.match(modelSource, /owner-authorized private memory data/)
  assert.match(modelSource, /not a health reading or diagnosis/)
  assert.match(modelSource, /does not infer another person’s private thoughts or intent/)
})

test('Mirror fixtures remain deterministic and never silently substitute demo for private failures', () => {
  const patterns = buildMirrorPatterns(buildExplicitDemoMemory('demo:fixture'))
  assert.equal(applyMirrorFixture(patterns, 'empty').length, 0)
  assert.equal(applyMirrorFixture(patterns, 'permission-denied').length, 0)
  assert.equal(applyMirrorFixture(patterns, 'failed').length, 0)
  const partial = applyMirrorFixture(patterns, 'partial')
  assert.equal(partial[0].confidenceLabel, 'Limited evidence')
  assert.equal(partial.slice(1).every((pattern) => pattern.evidenceState === 'insufficient'), true)
  const conflicting = applyMirrorFixture(patterns, 'conflicting')
  assert.equal(conflicting.find((pattern) => pattern.id === 'emotional-recurrence')?.evidenceState, 'conflicting')
})

// Owner-authored validation marker after the self-deleting accessibility materializer.
test('Mirror movement help identifies the active realm', () => {
  assert.match(clientSource, /<MovementHelp realm="Mirror"/)
  assert.doesNotMatch(clientSource, /<MovementHelp realm="Life Map"/)
  assert.match(navigationSource, /realm: 'Home' \| 'Ground' \| 'Life Map' \| 'Mirror'/)
})

test('Mirror acceptance fixtures, mobile scrolling, and semantic fallback fail closed', () => {
  assert.match(clientSource, /NEXT_PUBLIC_URAI_ACCEPTANCE_FIXTURES/)
  assert.match(bareEntrySource, /ACCEPTANCE_FIXTURES_ENABLED && Boolean\(params\.get\('mirrorFixture'\)\)/)
  assert.match(proofWorkflowSource, /NEXT_PUBLIC_URAI_ACCEPTANCE_FIXTURES: '1'/)
  assert.match(clientSource, /data-movement-ui="true"/)
  assert.match(clientSource, /touch-action:pan-y/)
  assert.match(clientSource, /className="fallbackInspection"/)
  assert.match(clientSource, /selected\.uncertainty/)
  assert.match(clientSource, /selected\.provenance/)
})

test('mobile inspection transfers pointer ownership from WebGL to threshold navigation', () => {
  assert.match(mobileInspectionCss, /\.mirrorWorld:has\(\.mirrorInspection\) canvas\s*\{[^}]*pointer-events:\s*none\s*!important/s)
  assert.match(mobileInspectionCss, /\.mirrorWorld:has\(\.mirrorInspection\) \.mirrorThresholds\s*\{[^}]*z-index:\s*40\s*!important[^}]*pointer-events:\s*auto/s)
  assert.match(mobileInspectionCss, /\.mirrorWorld:has\(\.mirrorInspection\) \.mirrorThresholds button\s*\{[^}]*pointer-events:\s*auto/s)
})
