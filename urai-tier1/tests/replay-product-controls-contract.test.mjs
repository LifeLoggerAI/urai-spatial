import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const client = fs.readFileSync('src/app/replay/CinematicReplayClient.tsx', 'utf8')
const transport = fs.readFileSync('src/spatial/replay/replayServerTransport.ts', 'utf8')
const rules = fs.readFileSync('../firebase/firestore.rules', 'utf8')

test('Replay exposes visible Save Hide Correct and account-scoped history controls', () => {
  for (const marker of ['Save', 'Hide', 'Correct', 'History', 'Replay memory controls', 'data-replay-saved', 'data-replay-hidden', 'data-pending-operations', 'role="dialog"', 'The original memory is preserved']) {
    assert.ok(client.includes(marker), `missing Replay product marker: ${marker}`)
  }
  assert.match(client, /aria-pressed=\{operations\.saved\}/)
  assert.match(client, /aria-pressed=\{operations\.hidden\}/)
  assert.match(client, /role="status" aria-live="polite"/)
  assert.match(client, /min-height:44px/)
  assert.match(client, /safe-area-inset-bottom/)
  assert.match(client, /prefers-reduced-motion:reduce/)
})

test('Replay queues offline work and retries without duplicate operation ids', () => {
  assert.match(client, /if \(!navigator\.onLine\)/)
  assert.match(client, /applyReplayOperation/)
  assert.match(client, /window\.addEventListener\('online', retry\)/)
  assert.match(client, /flushReplayOperationQueue/)
  assert.match(client, /crypto\.randomUUID\(\)/)
  assert.match(transport, /if \(existingOperation\.exists\(\)\) return/)
  assert.match(transport, /runTransaction/)
})

test('Replay persistence requires authenticated ownership and uses an existing protected collection', () => {
  assert.match(transport, /getAuth\(app\)\.currentUser/)
  assert.match(transport, /user\.uid !== ownerId/)
  assert.match(transport, /'users', user\.uid, 'replayEvents'/)
  assert.doesNotMatch(transport, /'users', operation\.ownerId/)
  assert.match(transport, /authenticatedUid: user\.uid/)
  assert.match(transport, /ownerId: user\.uid/)
  assert.match(rules, /match \/replayEvents\/\{eventId\}/)
  assert.match(rules, /allow create: if isAdmin\(\) \|\| \(isUserOwnedCreate\(uid\)/)
  assert.match(rules, /allow update: if isAdmin\(\) \|\| \(isUserOwnedUpdate\(uid\)/)
})

test('Demo replays fail closed for mutation', () => {
  assert.match(client, /const mutable = Boolean\(memory && !memory\.demo/)
  assert.match(client, /Demo Replays cannot be changed/)
  assert.match(client, /disabled=\{!mutable/)
})
