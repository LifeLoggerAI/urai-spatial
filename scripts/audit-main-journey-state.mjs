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
requireMatch('Focus route fingerprint', focusRoute, /focus-selected-memory-camera-chamber/)
requireMatch('Replay route', replayRoute, /CinematicReplayClient/)
requireMatch('Replay query read', replayClient, /useSearchParams/)
requireMatch('Replay memory preservation', replayClient, /params\?\.get\('memoryId'\)/)
requireMatch('Replay manifest preservation', replayClient, /params\?\.get\('manifestId'\)/)
requireMatch('Replay node preservation', replayClient, /params\?\.get\('node'\)/)
requireMatch('Replay return builder', replayClient, /function focusReturnUrl\(memoryId: string, manifestId: string, node: string\)/)
requireMatch('Replay return memory', replayClient, /next\.set\('memoryId', memoryId\)/)
requireMatch('Replay return manifest', replayClient, /next\.set\('manifestId', manifestId\)/)
requireMatch('Replay return node', replayClient, /next\.set\('node', node\)/)
requireMatch('Replay session memory receipt', replayClient, /urai-replay-return-memory-id/)
requireMatch('Replay session manifest receipt', replayClient, /urai-replay-return-manifest-id/)
requireMatch('Replay session node receipt', replayClient, /urai-replay-return-node/)
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
