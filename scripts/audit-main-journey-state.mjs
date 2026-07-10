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

for (const token of ['memoryId', 'manifestId', 'node']) {
  requireMatch(`Focus reads ${token}`, focusClient, new RegExp(`params\\.get\\('${token}'\\)`))
  requireMatch(`Replay reads ${token}`, replayClient, new RegExp(`params\\.get\\('${token}'\\)`))
  requireMatch(`Focus forwards ${token}`, focusClient, new RegExp(`next\\.set\\('${token}', ${token}\\)`))
  requireMatch(`Replay returns ${token}`, replayClient, new RegExp(`next\\.set\\('${token}', ${token}\\)`))
}

requireMatch('Focus session memory receipt', focusClient, /urai-focus-memory-id/)
requireMatch('Focus session manifest receipt', focusClient, /urai-focus-manifest-id/)
requireMatch('Focus session node receipt', focusClient, /urai-focus-node/)
requireMatch('Replay session memory receipt', replayClient, /urai-replay-return-memory-id/)
requireMatch('Replay session manifest receipt', replayClient, /urai-replay-return-manifest-id/)
requireMatch('Replay session node receipt', replayClient, /urai-replay-return-node/)
requireMatch('Replay direct-navigation fallback', replayClient, /window\.location\.assign\(target\)/)
requireMatch('Replay Escape return', replayClient, /event\.key === 'Escape'/)
requireMatch('Focus Life Map return', focusClient, /return `\/life-map\?\$\{next\.toString\(\)\}`/)

forbidMatch('Focus client', focusClient, /href="\/replay\?memoryId=quiet-reset/)
forbidMatch('Replay client', replayClient, /function focusReturnUrl\(manifestId: string\)/)

const result = {
  ok: failures.length === 0,
  contract: 'home-life-map-focus-replay-return-v2',
  requiredState: ['memoryId', 'manifestId', 'node'],
  failures,
}

console.log(JSON.stringify(result, null, 2))
if (failures.length) process.exitCode = 1
