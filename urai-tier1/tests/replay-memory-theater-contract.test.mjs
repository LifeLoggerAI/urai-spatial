import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()

function read(relativePath) {
  const absolute = path.join(root, relativePath)
  assert.ok(fs.existsSync(absolute), `missing expected file: ${relativePath}`)
  return fs.readFileSync(absolute, 'utf8')
}

const replayPage = read('src/app/replay/page.tsx')
const replayUnwindButton = read('src/app/replay/ReplayUnwindButton.tsx')
const replayRoute = read('src/app/replay/[replayId]/page.tsx')
const memoryRouteClient = read('src/spatial/layout/MemoryRouteClient.tsx')
const memoryModeSurface = read('src/spatial/layout/MemoryModeSurfaceV2.tsx')
const tierOneExperience = read('src/spatial/layout/TierOneExperience.tsx')

test('replay route remains wired to the static-safe cinematic replay shell', () => {
  assert.match(replayPage, /MemoryRouteClient/)
  assert.match(replayPage, /mode="replay"/)
  assert.match(memoryRouteClient, /MemoryModeSurfaceV2/)
  assert.match(memoryRouteClient, /mode: 'focus' \| 'replay'/)
  assert.match(memoryModeSurface, /URAI Replay · cinematic memory scene/)
  assert.match(memoryModeSurface, /CINEMATIC REPLAY/)
  assert.match(memoryModeSurface, /Replay progress/)
  assert.match(memoryModeSurface, /Replay controls/)
  assert.match(memoryModeSurface, /Return Focus/)
})

test('replay direct route resolves only demo-safe replay ids and fails closed', () => {
  assert.match(replayRoute, /resolveDemoReplay\(replayId\)/)
  assert.match(replayRoute, /isUnavailableMemoryStarResolution/)
  assert.match(replayRoute, /redirect\(resolution\.star\.replayHref\)/)
  assert.match(replayRoute, /data-testid="urai-replay-direct-route"/)
  assert.match(replayRoute, /Return to Life Map/)
  assert.match(replayRoute, /launch-safe demo set/)
})

test('replay unwind affordance preserves safe return behavior', () => {
  assert.match(replayUnwindButton, /'use client'/)
  assert.match(replayUnwindButton, /useRouter/)
  assert.match(replayUnwindButton, /useSearchParams/)
  assert.match(replayUnwindButton, /DEFAULT_REPLAY_MANIFEST_ID/)
  assert.match(replayUnwindButton, /focusUrlForManifest\(manifestId\)/)
  assert.match(replayUnwindButton, /sessionStorage\.setItem\('urai-replay-return-manifest-id', manifestId\)/)
  assert.match(replayUnwindButton, /router\.push\(focusUrlForManifest\(manifestId\)\)/)
  assert.match(replayUnwindButton, /data-testid="replay-unwind-button"/)
  assert.match(replayUnwindButton, /Return to Focus/)
})

test('TierOneExperience preserves replay mode as a first-class fallback scene state', () => {
  assert.match(tierOneExperience, /mode\?: SceneMode/)
  assert.match(tierOneExperience, /const replayMode = "replay"/)
  assert.match(tierOneExperience, /mode !== replayMode/)
  assert.match(tierOneExperience, /mode === replayMode/)
  assert.match(tierOneExperience, /replayActive/)
  assert.match(tierOneExperience, /data-mode=\{mode\}/)
})
