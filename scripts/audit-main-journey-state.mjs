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

function forbidMatch(label, source, pattern) {
  if (pattern.test(source)) failures.push(`${label}: forbidden hardcoded pattern ${pattern}`)
}

requireMatch('Focus route', focusRoute, /FocusChamberClient/)
requireMatch('Replay route', replayRoute, /CinematicReplayClient/)
requireMatch('Focus authenticated memory authority', focusClient, /useSelectedMemory\(\)/)

for (const token of ['memoryId', 'manifestId']) {
  requireMatch(`Selected-memory hook reads ${token}`, selectedMemoryHook, new RegExp(`params\\.get\\('${token}'\\)`))
  requireMatch(`Replay reads ${token}`, replayClient, new RegExp(`params\\.get\\('${token}'\\)`))
  requireMatch(`Replay returns ${token}`, replayClient, new RegExp(`next\\.set\\('${token}', ${token}\\)`))
}
requireMatch('Selected-memory hook accepts Life Map node identity', selectedMemoryHook, /params\.get\('memoryId'\) \?\? params\.get\('node'\)/)
requireMatch('Replay reads node', replayClient, /params\.get\('node'\)/)
requireMatch('Replay returns node', replayClient, /next\.set\('node', node\)/)

requireMatch('Focus forwards complete selected identity', focusClient, /new URLSearchParams\(\{ memoryId: memory\.id, manifestId: memory\.replayManifest\.id, node: memory\.star\.id, from: 'focus-artifact' \}\)/)
requireMatch('Focus enters Replay through world travel', focusClient, /requestUraiWorldTravel\(\{/)
requireMatch('Focus Replay destination', focusClient, /destination: 'replay'/)
requireMatch('Focus Replay manifest context', focusClient, /replayManifestId: memory\.replayManifest\.id/)
requireMatch('Focus Replay portal accessibility', focusClient, /aria-label={`Open Replay for \${memory\.title}`}/)
requireMatch('Focus fails closed without authorized memory', focusClient, /if \(!memory \|\| !replayHref\) return/)
requireMatch('Focus deterministic world return', focusClient, /requestUraiWorldReturn\(\)/)
requireMatch('Focus DOM memory identity', focusClient, /data-memory-id=\{memory\.id\}/)
requireMatch('Focus DOM star identity', focusClient, /data-star-id=\{memory\.star\.id\}/)
requireMatch('Focus DOM manifest identity', focusClient, /data-manifest-id=\{memory\.replayManifest\.id\}/)

requireMatch('Replay session memory receipt', replayClient, /urai-replay-return-memory-id/)
requireMatch('Replay session manifest receipt', replayClient, /urai-replay-return-manifest-id/)
requireMatch('Replay session node receipt', replayClient, /urai-replay-return-node/)
requireMatch('Replay direct-navigation fallback', replayClient, /window\.location\.assign\(target\)/)
requireMatch('Replay Escape return', replayClient, /event\.key === 'Escape'/)
requireMatch('Replay Focus return URL', replayClient, /return `\/focus\?\$\{next\.toString\(\)\}`/)

forbidMatch('Focus client', focusClient, /href="\/replay\?memoryId=quiet-reset/)
forbidMatch('Focus client', focusClient, /DEFAULT_MEMORY_ID|DEFAULT_MANIFEST_ID/)
forbidMatch('Replay client', replayClient, /function focusReturnUrl\(manifestId: string\)/)

const result = {
  ok: failures.length === 0,
  contract: 'home-life-map-focus-replay-return-v4',
  requiredState: ['memoryId', 'manifestId', 'node'],
  failures,
}

console.log(JSON.stringify(result, null, 2))
if (failures.length) process.exitCode = 1
