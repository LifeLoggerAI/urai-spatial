import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const client = fs.readFileSync('src/app/replay/CinematicReplayClient.tsx', 'utf8')
const controls = fs.readFileSync('src/app/replay/ReplayProductControls.tsx', 'utf8')
const transport = fs.readFileSync('src/spatial/replay/replayServerTransport.ts', 'utf8')
const operations = fs.readFileSync('src/spatial/replay/replayOperations.ts', 'utf8')
const rules = fs.readFileSync('../firebase/firestore.rules', 'utf8')

test('Replay preserves current cinematic identity while exposing Save Hide Correct and History', () => {
  for (const marker of ['assetCssStack', 'replayAssets', 'data-node={memory.star.id}', 'data-canonical-asset={replayAssets.primary.src}', '<ReplayProductControls memory={memory} />']) {
    assert.ok(client.includes(marker), `missing current-main Replay marker: ${marker}`)
  }
  for (const marker of ['Replay memory controls', "operations.saved ? 'Saved' : 'Save'", "operations.hidden ? 'Unhide' : 'Hide'", "pendingCorrection ? 'Correcting…' : 'Correct'", '>History<', 'data-replay-saved', 'data-replay-hidden', 'data-pending-operations']) {
    assert.ok(controls.includes(marker), `missing Replay product marker: ${marker}`)
  }
})

test('Replay controls expose truthful accessible pending offline error and recovery states', () => {
  assert.match(controls, /role="status" aria-live="polite"/)
  assert.match(controls, /queued offline/)
  assert.match(controls, /Retrying pending Replay changes/)
  assert.match(controls, />Retry<\/button>/)
  assert.match(controls, /next\.error/)
  assert.match(controls, /aria-pressed=\{operations\.saved\}/)
  assert.match(controls, /aria-pressed=\{operations\.hidden\}/)
  assert.match(controls, /min-height:44px/)
  assert.match(controls, /safe-area-inset-bottom/)
  assert.match(controls, /prefers-reduced-motion:reduce/)
  assert.match(controls, /forced-colors:active/)
})

test('correction workflow preserves original history and unsent owner-scoped drafts', () => {
  assert.match(controls, /role="dialog" aria-modal="true"/)
  assert.match(controls, /The original memory remains unchanged/)
  assert.match(controls, /previousValue: memory\.summary/)
  assert.match(controls, /Original: \{String\(item\.correction\.previousValue \?\? ''\)\}/)
  assert.match(controls, /Corrected: \{String\(item\.correction\.nextValue \?\? ''\)\}/)
  assert.match(controls, /urai-replay-correction-draft-v1:/)
  assert.match(controls, /encodeURIComponent\(ownerId\).*encodeURIComponent\(memoryId\)/)
  assert.match(controls, /Keep draft and close/)
  assert.match(controls, /maxLength=\{1000\}/)
  assert.doesNotMatch(controls, /String\([^)]*\?\? undefined\)/)
})

test('authenticated persistence is owner-scoped idempotent transactional and account-switch safe', () => {
  assert.match(transport, /getAuth\(app\)\.currentUser/)
  assert.match(transport, /user\.uid !== ownerId/)
  assert.match(transport, /'users', authenticated\.uid, 'replayEvents'/)
  assert.doesNotMatch(transport, /'users', operation\.ownerId/)
  assert.match(transport, /if \(existingOperation\.exists\(\)\) return/)
  assert.match(transport, /isAlreadyApplied/)
  assert.match(transport, /outcome: duplicate \? 'already-applied' : 'committed'/)
  assert.match(transport, /runTransaction/)
  assert.match(transport, /serverTimestamp\(\)/)
  assert.match(transport, /safeDocumentToken = \(value: string\) => encodeURIComponent\(value\)/)
  assert.match(transport, /requireAuthenticatedOwner\(operation\.ownerId\)/g)
  assert.match(controls, /activeIdentity\.current !== requestedIdentity/)
  assert.match(controls, /const current = readReplayOperationState\(window\.localStorage, memory\.ownerId, memory\.id\)/)
  assert.match(controls, /mergeState\(current, server\)/)
  assert.match(controls, /const applyIfCurrent = \(state: ReplayOperationState\)/)
  assert.match(controls, /onOptimistic: applyIfCurrent/)
  assert.match(controls, /onSettled: applyIfCurrent/)
})

test('Firestore and local queues cannot cross account ownership boundaries', () => {
  assert.match(rules, /match \/users\/\{uid\}/)
  assert.match(rules, /match \/replayEvents\/\{eventId\}/)
  assert.match(rules, /allow read: if isSelf\(uid\) \|\| isAdmin\(\)/)
  assert.match(rules, /allow create: if isAdmin\(\) \|\| \(isUserOwnedCreate\(uid\)/)
  assert.match(rules, /allow update: if isAdmin\(\) \|\| \(isUserOwnedUpdate\(uid\)/)
  assert.match(rules, /request\.auth\.uid == uid/)
  assert.match(operations, /belongsTo\(operation, ownerId, memoryId\)/)
  assert.match(operations, /STORAGE_PREFIX.*ownerId.*memoryId/s)
})

test('offline retry is bounded by events or explicit user action and duplicate ids are suppressed', () => {
  assert.match(controls, /window\.addEventListener\('online', onOnline\)/)
  assert.match(controls, /onClick=\{\(\) => void retryPending\(\)\}/)
  assert.doesNotMatch(controls, /setInterval\([^)]*retry/)
  assert.doesNotMatch(controls, /while \(true\)/)
  assert.match(operations, /state\.pending\.some\(\(entry\) => entry\.id === operation\.id\)/)
  assert.match(operations, /state\.audit\.some\(\(entry\) => entry\.id === operation\.id\)/)
})

test('cinematic keyboard timing ignores interactive controls and keeps Escape unwind', () => {
  assert.match(client, /closest\('button, input, textarea, select, summary, a, \[role="button"\]'\)/)
  assert.match(client, /event\.key === 'Escape'/)
  assert.match(client, /event\.key === ' ' \|\| event\.key === 'Enter'/)
  assert.match(client, /window\.removeEventListener\('keydown', onKey\)/)
})
