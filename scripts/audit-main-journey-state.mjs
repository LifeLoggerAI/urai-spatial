#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const failures = []

function read(relativePath) {
  try {
    return readFileSync(join(root, relativePath), 'utf8')
  } catch (error) {
    failures.push(`Failed to read ${relativePath}: ${error.message}`)
    return ''
  }
}

const focusRoute = read('urai-tier1/src/app/focus/page.tsx')
const focusClient = read('urai-tier1/src/app/focus/FocusChamberClient.tsx')
const selectedMemoryHook = read('urai-tier1/src/spatial/memory/useSelectedMemory.ts')
const worldEvents = read('urai-tier1/src/spatial/world/worldEvents.ts')
const worldTransition = read('urai-tier1/src/spatial/world/WorldTransitionController.tsx')
const replayClient = read('urai-tier1/src/app/replay/CinematicReplayClient.tsx')
const replayRoute = read('urai-tier1/src/app/replay/page.tsx')

function requireMatch(label, source, pattern) {
  if (!pattern.test(source)) failures.push(`${label}: missing ${pattern}`)
}

function forbidMatch(label, source, pattern) {
  if (pattern.test(source)) failures.push(`${label}: forbidden hardcoded pattern ${pattern}`)
}

requireMatch('Focus route', focusRoute, /FocusChamberClient/)
requireMatch('Replay route', replayRoute, /CinematicReplayClient/)
requireMatch('Focus authenticated memory authority', focusClient, /useSelectedMemory\(\)/)
requireMatch('Replay authenticated memory authority', replayClient, /useSelectedMemory\(\)/)

requireMatch('Selected-memory hook reads memory identity', selectedMemoryHook, /currentParams\.get\('memoryId'\) \?\? currentParams\.get\('node'\)/)
requireMatch('Selected-memory hook reads manifest identity', selectedMemoryHook, /currentParams\.get\('manifestId'\)/)
requireMatch('Selected-memory hook subscribes to exact world locations', selectedMemoryHook, /URAI_WORLD_LOCATION_EVENT/)
requireMatch('Selected-memory hook subscribes to browser history', selectedMemoryHook, /addEventListener\('popstate', syncFromWindow\)/)
requireMatch('Selected-memory manifest identity check', selectedMemoryHook, /parsed\.memory\.replayManifest\.id !== manifestId/)
requireMatch('World events publish location changes', worldEvents, /announceUraiWorldLocation/)
requireMatch('World transition announces final href', worldTransition, /announceUraiWorldLocation\(href\)/)

for (const pattern of [
  /memoryId: memory\.id/,
  /manifestId: memory\.replayManifest\.id/,
  /node: memory\.star\.id/,
  /from: 'focus-memory-aperture'/,
]) {
  requireMatch('Focus forwards complete selected identity', focusClient, pattern)
}
requireMatch('Focus enters Replay through world travel', focusClient, /requestUraiWorldTravel\(\{/)
requireMatch('Focus Replay destination', focusClient, /destination: 'replay'/)
requireMatch('Focus Replay manifest context', focusClient, /replayManifestId: memory\.replayManifest\.id/)
requireMatch('Focus Replay portal accessibility', focusClient, /aria-label={`Open Replay for \${memory\.title}`}/)
requireMatch('Focus fails closed without authorized memory', focusClient, /if \(!memory \|\| !replayHref\) return/)
requireMatch('Focus direct Life Map return', focusClient, /destination: 'life-map'/)
requireMatch('Focus raw-star return context', focusClient, /memoryId: memory\.star\.id/)
requireMatch('Focus DOM memory identity', focusClient, /data-memory-id=\{memory\.id\}/)
requireMatch('Focus DOM star identity', focusClient, /data-star-id=\{memory\.star\.id\}/)
requireMatch('Focus DOM manifest identity', focusClient, /data-manifest-id=\{memory\.replayManifest\.id\}/)
requireMatch('Focus owns no persistent Orb', focusClient, /data-orb-owner="none"/)

requireMatch('Replay deterministic world return', replayClient, /requestUraiWorldReturn\(\)/)
requireMatch('Replay Escape return', replayClient, /event\.key === 'Escape'/)
requireMatch('Replay fails closed without authorized memory', replayClient, /if \(!memory\) return/)
requireMatch('Replay DOM memory identity', replayClient, /data-memory-id=\{memory\.id\}/)
requireMatch('Replay DOM star identity', replayClient, /data-star-id=\{memory\.star\.id\}/)
requireMatch('Replay DOM manifest identity', replayClient, /data-manifest-id=\{memory\.replayManifest\.id\}/)
requireMatch('Replay uses manifest phases', replayClient, /memory\?\.replayManifest\.segments/)
requireMatch('Replay honors reduced motion', replayClient, /useReducedMotion\(\)/)

forbidMatch('Focus client', focusClient, /href="\/replay\?memoryId=quiet-reset/)
forbidMatch('Focus client', focusClient, /DEFAULT_MEMORY_ID|DEFAULT_MANIFEST_ID/)
forbidMatch('Replay client', replayClient, /quiet-reset|replay-recovery-thread|seed-memory-bloom/)
forbidMatch('Replay client', replayClient, /window\.location\.assign/)

const result = {
  ok: failures.length === 0,
  contract: 'home-life-map-focus-replay-return-v6',
  requiredState: ['memoryId', 'manifestId', 'node'],
  failures,
}

console.log(JSON.stringify(result, null, 2))
if (failures.length) process.exitCode = 1
