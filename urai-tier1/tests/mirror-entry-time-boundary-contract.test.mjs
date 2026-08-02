import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const read = (relative) => fs.readFileSync(new URL(relative, import.meta.url), 'utf8')
const page = read('../src/app/mirror/page.tsx')
const guard = read('../src/app/mirror/MirrorBareEntryGuard.tsx')
const parser = read('../src/spatial/memory/selectedMemoryContract.ts')
const model = read('../src/spatial/mirror/mirrorPatternModel.ts')

test('bare Mirror entry keeps explicit route ownership without mounting the client underneath the guard', () => {
  assert.match(page, /import MirrorSpatialClient from '\.\/MirrorSpatialClient'/)
  assert.match(page, /<MirrorBareEntryGuard>\s*<MirrorSpatialClient \/>\s*<\/MirrorBareEntryGuard>/)
  assert.doesNotMatch(guard, /import MirrorSpatialClient/)
  assert.match(guard, /type EntryState = 'checking' \| 'bare' \| 'contextual'/)
  assert.match(guard, /children: ReactNode/)
  assert.match(guard, /MirrorBareEntryGuard\(\{ children \}: MirrorBareEntryGuardProps\)/)
  assert.match(guard, /if \(entryState === 'contextual'\) return <>\{children\}<\/>/)
  assert.match(guard, /if \(entryState === 'checking'\)/)
  assert.match(guard, /data-testid="mirror-bare-entry"/)
})

test('memory timestamps and replay manifests remain exact and bounded', () => {
  assert.match(parser, /value\.trim\(\) !== value/)
  assert.match(parser, /const CANONICAL_REPLAY_PHASES = \['memory', 'emotion', 'pattern', 'return'\] as const/)
  assert.match(parser, /const MAX_REPLAY_DURATION_MS = 7 \* 24 \* 60 \* 60 \* 1000/)
  assert.match(parser, /Number\.isSafeInteger\(startsAtMs\)/)
  assert.match(parser, /Number\.isSafeInteger\(durationMs\)/)
  assert.match(parser, /const replayPhaseIds = new Set\(segments\.map\(\(\{ id: phaseId \}\) => phaseId\)\)/)
  assert.match(parser, /replayPhaseIds\.size !== CANONICAL_REPLAY_PHASES\.length/)
  assert.match(parser, /CANONICAL_REPLAY_PHASES\.some\(\(phase\) => !replayPhaseIds\.has\(phase\)\)/)
  assert.match(parser, /requestedDurationMs <= MAX_REPLAY_DURATION_MS/)
  assert.match(parser, /: segmentDurationMs/)
})

test('Mirror time-range construction falls back rather than throwing', () => {
  assert.match(model, /const endMs = Date\.parse\(memory\.occurredAt\)/)
  assert.match(model, /!Number\.isSafeInteger\(durationMs\) \|\| durationMs <= 0/)
  assert.match(model, /startMs < -8640000000000000/)
  assert.match(model, /return \{ start: memory\.occurredAt, end: memory\.occurredAt \}/)
})
