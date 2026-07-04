import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

const entryUrl = new URL('../src/app/spatial/ar-vr/QuestVrEntryButton.tsx', import.meta.url)

test('Quest cleanup is re-applied when the session ends during renderer attachment', async () => {
  const source = await readFile(entryUrl, 'utf8')
  const attach = source.indexOf('await onSessionRequested?.(session)')
  const ended = source.indexOf('if (sessionEnded) {', attach)
  const cleanup = source.indexOf('onSessionEnded?.()', ended)

  assert.ok(attach >= 0)
  assert.ok(ended > attach)
  assert.ok(cleanup > ended)
})
