import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

// Source-level contract complements (but never substitutes for) actual browser,
// Firebase emulator, and authenticated staging acceptance.
const panel = fs.readFileSync(new URL('../src/spatial/council/CouncilConversationPanel.tsx', import.meta.url), 'utf8')
const memory = fs.readFileSync(new URL('../src/spatial/memory/useSelectedMemory.ts', import.meta.url), 'utf8')
const focus = fs.readFileSync(new URL('../src/app/focus/FocusChamberClient.tsx', import.meta.url), 'utf8')
const provider = fs.readFileSync(new URL('../../apps/functions/src/councilProviderFunctions.ts', import.meta.url), 'utf8')

test('Council follows reactive selected-memory navigation instead of a one-shot location read', () => {
  assert.match(panel, /const location = useBrowserLocation\(\)/)
  assert.match(panel, /const memoryRouteId = sanitizeMemoryId\(params\.get\('memoryId'\)\)/)
  assert.match(panel, /sessionKey = JSON\.stringify\(\[actor\.generation,[^\n]*memoryRouteId/)
  assert.match(panel, /const selectedMemory = useSelectedMemory\(\)/)
  assert.match(panel, /selectedMemory\.status === 'ready'/)
  assert.match(panel, /selectedMemory\.memory\.demo === false/)
  assert.match(memory, /onSnapshot\(/)
})
test('selected memory defaults to grounded mode without automatically authorizing provider disclosure', () => {
  assert.match(panel, /useState\(Boolean\(memoryRouteId\)\)/)
  assert.match(panel, /const \[graphShareConsent, setGraphShareConsent\] = useState\(false\)/)
  assert.match(panel, /graphRequested && selectedMemoryRequest/)
  assert.match(panel, /setGraphShareConsent\(false\)/)
  assert.match(provider, /body\.graphShareConsent !== true/)
  assert.match(provider, /await recheckMemory\(\)/)
})
test('actor, route, and revoked memory changes prevent stale response or prior sharing grant', () => {
  assert.match(panel, /aborter\.current\?\.abort\(\)/)
  assert.match(panel, /selectedMemory\.status === 'loading' \|\| validMemoryId/)
  assert.match(panel, /setHistory\(\[\]\)/)
  assert.match(panel, /setConsent\(false\)/)
  assert.match(panel, /setReviewResult\(null\)/)
  assert.match(panel, /validMemoryId && liveMemoryId === validMemoryId/)
  assert.match(focus, /\/council\?memoryId=/)
})
