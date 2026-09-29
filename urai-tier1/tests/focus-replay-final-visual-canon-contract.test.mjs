import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const focus = fs.readFileSync('src/app/focus/FocusChamberClient.tsx', 'utf8')
const replay = fs.readFileSync('src/app/replay/CinematicReplayClient.tsx', 'utf8')
const proof = fs.readFileSync('../scripts/capture-lifemap-founder-proof-fixed.mjs', 'utf8')

test('Focus renders the selected memory as a stellar photosphere/corona, not a chamber planet or crystal', () => {
  assert.match(focus, /function StellarPhotosphere/)
  assert.match(focus, /focus-stellar-photosphere-corona/)
  assert.match(focus, /memory-star-stellar-photosphere-corona/)
  assert.match(focus, /function MemoryStarInteraction/)
  assert.match(focus, /data-focus-visual-canon="stellar-photosphere-corona-no-planet-no-crystal"/)
  assert.match(focus, /data-focus-spatial="inside-memory-star"/)
  assert.doesNotMatch(focus, /FOCUS_CHAMBER_MODEL/)
  assert.doesNotMatch(focus, /focus-authored-physical-chamber/)
  assert.doesNotMatch(focus, /function MemoryAperture/)
  assert.doesNotMatch(focus, /octahedronGeometry/)
})

test('Focus canon repair preserves current keyboard/travel/accessibility ownership', () => {
  assert.match(focus, /data-focus-input-ready="false"/)
  assert.match(focus, /KeyW/)
  assert.match(focus, /ArrowUp/)
  assert.match(focus, /requestUraiWorldTravel\(\{ destination: 'replay'/)
  assert.match(focus, /entryPortal: 'focus-memory-aperture'/)
  assert.match(focus, /aria-label=\{memory \? `Open Replay for \$\{memory\.title\}`/)
  assert.match(focus, /focus-spatial-aperture-button:focus-visible/)
})

test('Replay publishes frame-derived readiness for the immersive memory environment', () => {
  assert.match(replay, /function ReplayRenderReadyMarker/)
  assert.match(replay, /gl\.info\.render\.calls/)
  assert.match(replay, /scene\.children\.length/)
  assert.match(replay, /replayRenderReady = frames\.current >= 4 && calls > 0 && objects > 0/)
  assert.match(replay, /replayRenderedMemoryId = memoryId/)
  assert.match(replay, /data-replay-spatial-owner="r3f-immersive-memory-environment"/)
  assert.match(replay, /<ReplayRenderReadyMarker memoryId=\{memory\.id\} \/>/)
  assert.match(replay, /<primitive object=\{model\} name="replay-memory-environment-v1"/)
})

test('Founder evidence refuses to capture Replay until the selected immersive world is rendered', () => {
  assert.match(proof, /async function waitForReplayImmersiveWorld/)
  assert.match(proof, /state\.owner === 'r3f-immersive-memory-environment'/)
  assert.match(proof, /state\.ready === 'true'/)
  assert.match(proof, /state\.renderedMemoryId === expectedMemoryId/)
  assert.match(proof, /expectedMemoryId = 'demo:quiet-reset'/)
  assert.match(proof, /state\.calls > 0/)
  assert.match(proof, /state\.objects > 0/)
  assert.match(proof, /const replayState = await waitForReplayImmersiveWorld\(page\)/)
  assert.match(proof, /await shot\(page, 'replay-destination', 'replay', \{ memoryId: 'quiet-reset', replayState \}\)/)
})
