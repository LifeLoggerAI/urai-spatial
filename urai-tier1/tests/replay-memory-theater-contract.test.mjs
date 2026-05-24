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
const tierOneExperience = read('src/spatial/layout/TierOneExperience.tsx')

test('replay route remains wired to the canonical TierOneExperience replay shell', () => {
  assert.match(replayPage, /TierOneExperience/)
  assert.match(replayPage, /mode="replay"/)
  assert.match(replayPage, /Replay Stream/)
  assert.match(replayPage, /data-testid="urai-focus-action-panel"/)
  assert.match(replayPage, /ReplayUnwindButton/)
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
  assert.match(replayUnwindButton, /manifestId/)
  assert.match(replayUnwindButton, /router\.push\(manifestId \? `\/focus\?manifestId=\$\{encodeURIComponent\(manifestId\)\}` : '\/focus'\)/)
  assert.match(replayUnwindButton, /router\.push\('\/unwind'\)/)
  assert.match(replayUnwindButton, /data-testid="replay-unwind-button"/)
  assert.match(replayUnwindButton, /data-escape-ready=\{escapeReady \? 'true' : 'false'\}/)
  assert.match(replayUnwindButton, /Unwind/)
})

test('TierOneExperience preserves replay mode as a first-class scene state', () => {
  assert.match(tierOneExperience, /export type TierOneExperienceMode = [\s\S]*"replay"/)
  assert.match(tierOneExperience, /routeModes = new Set<TierOneExperienceMode>\([\s\S]*"replay"/)
  assert.match(tierOneExperience, /if \(mode === "replay"\) return "replay" as const/)
  assert.match(tierOneExperience, /<UraiIntegratedHomeScene sceneMode=\{routeMode\} \/>/)
  assert.match(tierOneExperience, /data-route-mode=\{routeMode\}/)
})
