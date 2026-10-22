import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const client = fs.readFileSync(new URL('src/spatial/orb/orbActivityClient.ts', root), 'utf8')
const panel = fs.readFileSync(new URL('src/spatial/orb/OrbConversationPanel.tsx', root), 'utf8')

test('activity requires a deliberate owner-bound read without silent model context injection', () => {
  assert.match(panel, /Review my recent UrAi activity/)
  assert.match(panel, /onClick=\\{\\(\\) => void showActivity\\(\\)\\}/)
  assert.match(client, /isCurrentAIActorSnapshot\\(actor\\)/)
  assert.match(client, /getAILedgerEntries/)
  assert.match(client, /row.ownerId !== actor.uid/)
  assert.match(client, /truthKind !== 'user-assertion'/)
  assert.match(panel, /This view does not send ledger entries to the model or authorize actions/)
  assert.doesNotMatch(client, /requestOpenAIOrb|paidSpatialFetch|writeAILedgerEntry/)
})
