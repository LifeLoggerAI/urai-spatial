#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (path) => readFileSync(join(root, path), 'utf8')
const failures = []

const focusRoute = read('urai-tier1/src/app/focus/page.tsx')
const focusClient = read('urai-tier1/src/app/focus/FocusChamberClient.tsx')
const replayClient = read('urai-tier1/src/app/replay/CinematicReplayClient.tsx')
const replayRoute = read('urai-tier1/src/app/replay/page.tsx')

const requireMatch = (label, source, pattern) => {
  if (!pattern.test(source)) failures.push(`${label}: missing ${pattern}`)
}
const forbidMatch = (label, source, pattern) => {
  if (pattern.test(source)) failures.push(`${label}: forbidden hardcoded pattern ${pattern}`)
}

requireMatch('Focus route', focusRoute, /FocusChamberClient/)
requireMatch('Replay route', replayRoute, /CinematicReplayClient/)
requireMatch('Replay query read', replayClient, /useSearchParams/)
requireMatch('Replay manifest preservation', replayClient, /params\?\.get\('manifestId'\)/)
requireMatch('Replay return URL', replayClient, /\/focus\?manifestId=/)
requireMatch('Replay session return receipt', replayClient, /urai-replay-return-manifest-id/)
requireMatch('Replay direct-navigation fallback', replayClient, /window\.location\.assign\(target\)/)

requireMatch('Focus query read', focusClient, /useSearchParams/)
requireMatch('Focus memory identity read', focusClient, /params\?\.get\('memoryId'\)/)
requireMatch('Focus manifest identity read', focusClient, /params\?\.get\('manifestId'\)/)
requireMatch('Focus node identity read', focusClient, /params\?\.get\('node'\)/)
requireMatch('Focus Replay URL construction', focusClient, /next\.set\('memoryId', memoryId\)/)
requireMatch('Focus Replay manifest forwarding', focusClient, /next\.set\('manifestId', manifestId\)/)
requireMatch('Focus Life Map return', focusClient, /return `\/life-map\?\$\{next\.toString\(\)\}`/)
requireMatch('Focus session memory receipt', focusClient, /urai-focus-memory-id/)
requireMatch('Focus session manifest receipt', focusClient, /urai-focus-manifest-id/)
forbidMatch('Focus client', focusClient, /href="\/replay\?memoryId=quiet-reset&manifestId=replay-recovery-thread/)
forbidMatch('Focus client', focusClient, /href="\/focus\?memoryId=quiet-reset/)

const result = {
  ok: failures.length === 0,
  contract: 'home-life-map-focus-replay-return-v1',
  requiredState: ['memoryId', 'manifestId', 'node', 'source route', 'return route'],
  failures,
}

console.log(JSON.stringify(result, null, 2))
if (failures.length) process.exitCode = 1
