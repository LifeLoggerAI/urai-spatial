import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const source = readFileSync(new URL('../src/app/replay/CinematicReplayClient.tsx', import.meta.url), 'utf8')
const overlay = readFileSync(new URL('../src/app/replay/DevReplayCandidateWorld.tsx', import.meta.url), 'utf8')
const manifest = JSON.parse(readFileSync(new URL('../../../operations/assets/launch-critical-assets.json', import.meta.url), 'utf8'))
const receipt = JSON.parse(readFileSync(new URL('../../../operations/assets/generated-receipts/urai-final-glb-pack-v1.json', import.meta.url), 'utf8'))

test('original Replay candidate is an exact unadmitted asset and cannot ship', () => {
  const asset = manifest.assets.find(row => row.id === 'replay-memory-environment-v1')
  const original = receipt.assets.find(row => row.fileName === 'replay-memory-environment-v1.glb')
  assert.ok(asset && original)
  assert.equal(asset.releaseState, 'pending-final-review')
  assert.equal(manifest.releasePolicy.candidateAssetsMayShip, false)
  assert.equal(asset.fixedPath, 'urai-tier1/public/assets/urai/generated/models/replay-memory-environment-v1.glb')
  assert.ok(original.sha256 && original.bytes > 1000 && original.triangleCount > 0)
})

test('in-world source inspection is gated by dev-only flag and explicit query, never an alternate memory owner', () => {
  assert.match(overlay, /process\.env\.NODE_ENV === 'development'/)
  assert.match(overlay, /process\.env\.NEXT_PUBLIC_URAI_PREVIEW_MODE === 'true'/)
  assert.match(overlay, /process\.env\.NEXT_PUBLIC_URAI_CANDIDATE_WORLD_REVIEW === 'true'/)
  assert.match(overlay, /candidateWorld'\) === 'replay'/)
  assert.match(overlay, /useGLTF\(REPLAY_CANDIDATE_ASSET_URL\)/)
  assert.match(overlay, /replay-memory-environment-v1\.glb/)
  assert.match(overlay, /node\.raycast = \(\) => \{\}/)
  assert.match(overlay, /replayCandidateAdmission = 'unadmitted-development-only'/)
  assert.doesNotMatch(overlay, /fetch\(|localStorage|sessionStorage|ownerId|requestCouncilProvider/)
  assert.match(source, /useReplayDevelopmentCandidate\(\)/)
  assert.match(source, /<DevReplayCandidateWorld \/>/)
  assert.match(source, /<ReplayMemoryGrove trees=\{trees\} groundHeight=\{replayGroundHeight\} \/>/)
  assert.match(source, /<ReplayScannedUnderstory groundHeight=\{replayGroundHeight\} \/>/)
  assert.match(source, /memory\.demo \? <DemoMemoryLandscape memory=\{memory\} \/> : null/)
})
