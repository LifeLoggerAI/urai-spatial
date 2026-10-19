import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const council=fs.readFileSync(new URL('../src/spatial/council/CouncilRealm.tsx', import.meta.url),'utf8')
const component=fs.readFileSync(new URL('../src/spatial/digital-human/CouncilHumanProximity.tsx', import.meta.url),'utf8')
test('original Council stage includes selected rigged human, real camera tracking and proximity observer',()=>{
  assert.match(council,/RiggedCouncilHuman/)
  assert.match(council,/CouncilCamera input=\{input\}/)
  assert.match(council,/CouncilHumanProximity position=\{POSITIONS\[selected\]/)
  assert.match(component,/useThree\(/)
  assert.match(component,/camera\.position\.distanceTo\(target\.current\)/)
  assert.match(component,/proximityState\(nearby\.current, distance\)/)
})
test('Council proximity announces accessible distance without suggesting approval or fake avatar voice',()=>{
  assert.match(council,/aria-live="polite"/)
  assert.match(council,/No private likeness or character voice is approved here/)
  assert.match(council,/data-digital-human-near=/)
  assert.doesNotMatch(component,/requestAdamPresence|requestAdamFounderVoice|fetch\(/)
})

const fallback = council.match(/function CouncilFallback\([\s\S]*?\n}\n\nfunction useCouncilWebGLCapability/)?.[0] ?? ''

test('WebGL failure retains original Council text conversation without a fictional scene or voice',()=>{
  assert.ok(fallback,'original Council fallback component missing')
  assert.match(fallback,/data-council-renderer="unavailable"/)
  assert.match(fallback,/data-testid="urai-council-text-fallback"/)
  assert.match(fallback,/<CouncilConversationPanel\s+key=\{selectedAgent\.id\}\s+agent=\{selectedAgent\}/)
  assert.match(fallback,/COUNCIL_AGENTS\.map\(/)
  assert.match(fallback,/selectedAgent\.focus/)
  assert.doesNotMatch(fallback,/<Canvas|<RiggedCouncilHuman|requestAdamFounderVoice/)
})
test('provisional WebGL capability probe must not start a provider session',()=>{
  assert.match(council,/webglAvailable === null\) return <CouncilFallback reason="Checking spatial renderer capability\." checking \/>/)
  assert.match(fallback,/\{!checking \? <section[\s\S]*?data-testid="urai-council-text-fallback"/)
  assert.match(fallback,/No private likeness or character voice is approved here/)
})
