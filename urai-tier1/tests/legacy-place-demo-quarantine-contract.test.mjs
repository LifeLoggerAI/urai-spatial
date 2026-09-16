import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'

const repository = fs.readFileSync(new URL('../src/spatial/places/memoryPlaceRepository.ts', import.meta.url), 'utf8')
const firestore = fs.readFileSync(new URL('../src/spatial/places/firestoreMemoryPlaceRepository.ts', import.meta.url), 'utf8')
const placeRoute = fs.readFileSync(new URL('../src/app/place/[placeId]/page.tsx', import.meta.url), 'utf8')
const replayRoute = fs.readFileSync(new URL('../src/app/place/[placeId]/replay/page.tsx', import.meta.url), 'utf8')
const focusDoor = fs.readFileSync(new URL('../src/app/focus/FocusPlaceDoor.tsx', import.meta.url), 'utf8')

test('ordinary memory-place access fails closed unless demo mode is explicitly requested', () => {
  assert.ok(repository.includes('failClosedMemoryPlaceRepository'))
  assert.ok(repository.includes('demoMemoryPlaceRepository'))
  assert.ok(repository.includes("context?.source === 'demo'"))
  assert.ok(repository.includes("reason: 'personalized-place-source-required'"))
  assert.ok(repository.includes("safeHref: '/ground'"))
  assert.equal(repository.includes('fallbackMemoryPlaceRepository'), false)
})

test('unwired Firestore place provider cannot substitute demo autobiography', () => {
  assert.ok(firestore.includes('failClosedMemoryPlaceRepository'))
  assert.ok(firestore.includes("source: 'firestore'"))
  assert.equal(firestore.includes('demoMemoryPlaceRepository'), false)
  assert.equal(firestore.includes('fallbackMemoryPlaceRepository'), false)
})

test('legacy place routes fail closed by default and opt into historical samples only with demo=1', () => {
  for (const source of [placeRoute, replayRoute]) {
    assert.equal(source.includes('DEMO_MEMORY_PLACES'), false)
    assert.equal(source.includes('generateStaticParams'), false)
    assert.ok(source.includes('resolveMemoryPlace'))
    assert.ok(source.includes("query?.demo === '1'"))
    assert.ok(source.includes("{ source: 'demo' as const }"))
    assert.ok(source.includes('Return to Ground'))
  }
  assert.ok(placeRoute.includes('legacy-fail-closed-no-demo-substitution'))
  assert.ok(placeRoute.includes('explicit-disclosed-demo'))
  assert.ok(placeRoute.includes('will not substitute a demo or symbolic room for a personal place'))
  assert.ok(replayRoute.includes('legacy-fail-closed-no-demo-substitution'))
  assert.ok(replayRoute.includes('explicit-disclosed-demo'))
  assert.ok(replayRoute.includes('will not replay a demo place as personal memory'))
})

test('Focus never presents a bundled symbolic place as autobiographical UI outside explicit demo mode', () => {
  assert.ok(focusDoor.includes("const explicitDemo = searchParams?.get('demo') === '1'"))
  assert.ok(focusDoor.includes("star.privacyState === 'demo' && !explicitDemo"))
  assert.ok(focusDoor.includes('data-place-door-authority="explicit-demo-only"'))
  assert.ok(focusDoor.includes('bundled demo data, not reconstructed personal memory'))
  assert.ok(focusDoor.includes('Enter Sample Place'))
  assert.ok(focusDoor.includes('demo=1'))
  assert.equal(focusDoor.includes('>\n          Enter Place\n        </Link>'), false)
})
