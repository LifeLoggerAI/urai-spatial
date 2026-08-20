import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const replay = fs.readFileSync(path.join(process.cwd(), 'src/app/replay/CinematicReplayClient.tsx'), 'utf8')

test('Replay environment is local and Founder-proof deterministic', () => {
  assert.doesNotMatch(replay, /import\s*\{[^}]*\bEnvironment\b[^}]*\}\s*from\s*['"]@react-three\/drei['"]/)
  assert.doesNotMatch(replay, /<Environment\b/)
  assert.doesNotMatch(replay, /raw\.githack\.com|drei-assets/)
  assert.match(replay, /REPLAY_ENVIRONMENT_MODEL/)
  assert.match(replay, /<hemisphereLight/)
  assert.match(replay, /<directionalLight/)
})
