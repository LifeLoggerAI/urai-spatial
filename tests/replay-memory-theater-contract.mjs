import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(path, 'utf8')
const requireToken = (path, text, token) => {
  if (!text.includes(token)) throw new Error(`${path} must include: ${token}`)
}
const forbidToken = (path, text, token) => {
  if (text.includes(token)) throw new Error(`${path} must not include: ${token}`)
}

const pagePath = 'urai-tier1/src/app/replay/page.tsx'
const clientPath = 'urai-tier1/src/app/replay/FinalReplayFilmClient.tsx'
const cssPath = 'urai-tier1/src/app/replay/FinalReplayFilmClient.module.css'
const statePath = 'urai-tier1/src/spatial/scene/replayState.ts'
const page = read(pagePath)
const client = read(clientPath)
const css = read(cssPath)
const state = read(statePath)

for (const token of ['FinalReplayFilmClient', 'replay-route-launch-fingerprint']) requireToken(pagePath, page, token)

for (const token of [
  "'use client'",
  'urai-replay-surface',
  'data-urai-final-replay-film',
  'data-mode="replay"',
  'replay_playing',
  'replay_paused',
  'Pattern Replay',
  'Source: Life Map',
  'URAI Replay',
  'Pause replay',
  'Play replay',
  'Return to Focus',
  'Unwind',
  'Open Mirror',
  'Esc returns to Focus',
  'urai-replay-meta-panel',
  'Replay narrator panel',
  'Private · Only visible to you',
  'urai-replay-timeline',
  'Replay playback controls',
  'type="range"',
  'Replay timeline',
  "event.key === 'Escape'",
  "event.key === ' '",
  'prefers-reduced-motion: reduce',
]) requireToken(clientPath, client, token)

for (const token of ['READINESS 87%', 'INTENSITY 88%', 'BOUNDARY 75%', 'coming soon', 'TODO']) forbidToken(clientPath, client, token)

for (const token of ['@media(max-width:850px)', '@media(prefers-reduced-motion:reduce)', 'var(--replay-art)', 'var(--replay-progress)', '.routeRail', '.timeline']) requireToken(cssPath, css, token)

for (const token of ["'replay_ready'", "'replay_playing'", "'replay_paused'", "'replay_scrubbing'", "'replay_complete'", "'memory'", "'emotion'", "'pattern'", "'return'", 'resolveReplayPhase', 'getReplaySegmentAt']) requireToken(statePath, state, token)

console.log('Replay Memory Theater final film contract passed.')
