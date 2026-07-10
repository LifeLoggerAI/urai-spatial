#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (path) => readFileSync(join(root, path), 'utf8')
const failures = []

const focusRoute = read('urai-tier1/src/app/focus/page.tsx')
const focusSurface = read('urai-tier1/src/app/FinalMemorySurfaces.tsx')
const replayClient = read('urai-tier1/src/app/replay/CinematicReplayClient.tsx')
const replayRoute = read('urai-tier1/src/app/replay/page.tsx')

const requireMatch = (label, source, pattern) => {
  if (!pattern.test(source)) failures.push(`${label}: missing ${pattern}`)
}
const forbidMatch = (label, source, pattern) => {
  if (pattern.test(source)) failures.push(`${label}: forbidden hardcoded pattern ${pattern}`)
}

requireMatch('Focus route', focusRoute, /FinalFocusChamber/)
requireMatch('Replay route', replayRoute, /CinematicReplayClient/)
requireMatch('Replay query read', replayClient, /useSearchParams/)
requireMatch('Replay manifest preservation', replayClient, /params\?\.get\('manifestId'\)/)
requireMatch('Replay return URL', replayClient, /\/focus\?manifestId=/)
requireMatch('Replay session return receipt', replayClient, /urai-replay-return-manifest-id/)
requireMatch('Replay direct-navigation fallback', replayClient, /window\.location\.assign\(target\)/)

requireMatch('Focus query read', focusSurface, /useSearchParams|searchParams/)
requireMatch('Focus memory identity forwarding', focusSurface, /memoryId/)
requireMatch('Focus manifest identity forwarding', focusSurface, /manifestId/)
forbidMatch('Focus surface', focusSurface, /href="\/replay\?memoryId=quiet-reset&manifestId=replay-recovery-thread/)
forbidMatch('Focus surface', focusSurface, /href="\/focus\?memoryId=quiet-reset/)

const result = {
  ok: failures.length === 0,
  contract: 'home-life-map-focus-replay-return-v1',
  requiredState: ['memoryId', 'manifestId', 'source route', 'return route'],
  failures,
}

console.log(JSON.stringify(result, null, 2))
if (failures.length) process.exitCode = 1
