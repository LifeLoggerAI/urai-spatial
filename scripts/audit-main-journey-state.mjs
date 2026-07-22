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
const replayClient = read('urai-tier1/src/app/replay/CinematicReplayClient.tsx')
const replayRoute = read('urai-tier1/src/app/replay/page.tsx')

function requireMatch(label, source, pattern) {
  if (!pattern.test(source)) failures.push(`${label}: missing ${pattern}`)
}

function requireCondition(label, condition) {
  if (!condition) failures.push(label)
}

function forbidMatch(label, source, pattern) {
  if (pattern.test(source)) failures.push(`${label}: forbidden hardcoded pattern ${pattern}`)
}

requireMatch('Focus route', focusRoute, /FocusChamberClient/)
requireMatch('Replay route', replayRoute, /CinematicReplayClient/)
requireMatch('Focus authenticated memory authority', focusClient, /useSelectedMemory\(\)/)
requireMatch('Replay authenticated memory authority', replayClient, /useSelectedMemory\(\)/)

for (const token of ['memoryId', 'manifestId']) {
  requireMatch(`Selected-memory hook reads ${token}`, selectedMemoryHook, new RegExp(`params\\.get\\('${token}'\\)`))
}
requireMatch('Selected-memory hook accepts Life Map node identity', selectedMemoryHook, /params\.get\('memoryId'\) \?\? params\.get\('node'\)/)
requireMatch('Selected-memory manifest identity check', selectedMemoryHook, /parsed\.memory\.replayManifest\.id !== manifestId/)

requireMatch(
  'Focus forwards complete selected identity',
  focusClient,
  /new URLSearchParams\(\{\s*memoryId:\s*memory\.id,\s*manifestId:\s*memory\.replayManifest\.id,\s*node:\s*memory\.star\.id,\s*from:\s*'focus-artifact',?\s*\}\)/,
)
requireMatch('Focus enters Replay through world travel', focusClient, /requestUraiWorldTravel\(\{/)
requireMatch('Focus Replay destination', focusClient, /destination: 'replay'/)
requireMatch('Focus Replay manifest context', focusClient, /replayManifestId: memory\.replayManifest\.id/)
requireMatch('Focus Replay portal accessibility', focusClient, /aria-label={`Open Replay for \${memory\.title}`}/)

const combinedFocusGuard = /if \(!memory \|\| !replayHref \|\| committed\) return/.test(focusClient)
const separateAuthorizationGuard = /if \(!memory \|\| !replayHref\) return/.test(focusClient)
const separateCommittedGuard = /if \(committed\) return/.test(focusClient)
requireCondition('Focus must fail closed without an authorized memory and Replay route.', combinedFocusGuard || separateAuthorizationGuard)
requireCondition('Focus must debounce an already committed Replay transition.', combinedFocusGuard || separateCommittedGuard)

requireMatch('Focus deterministic world return', focusClient, /requestUraiWorldReturn\(\)/)
requireMatch('Focus DOM memory identity', focusClient, /data-memory-id=\{memory(?:\?\.|\.)id\}/)
requireMatch('Focus DOM star identity', focusClient, /data-star-id=\{memory(?:\?\.|\.)star\.id\}/)
requireMatch('Focus DOM manifest identity', focusClient, /data-manifest-id=\{memory(?:\?\.|\.)replayManifest\.id\}/)

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
  contract: 'home-life-map-focus-replay-return-v5',
  requiredState: ['memoryId', 'manifestId', 'node'],
  failures,
}

console.log(JSON.stringify(result, null, 2))
if (failures.length) process.exitCode = 1
