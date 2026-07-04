import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

const entryUrl = new URL('../src/app/spatial/ar-vr/QuestVrEntryButton.tsx', import.meta.url)

test('Quest entry registers end handling before renderer attachment', async () => {
  const source = await readFile(entryUrl, 'utf8')
  const listener = source.indexOf("session.addEventListener?.('end'")
  const attach = source.indexOf('await onSessionRequested?.(session)')
  const endedAfterAttach = source.indexOf('if (sessionEnded) {', attach)
  const cleanupAfterAttach = source.indexOf('onSessionEnded?.()', endedAfterAttach)

  assert.ok(listener >= 0)
  assert.ok(attach >= 0)
  assert.ok(listener < attach)
  assert.ok(endedAfterAttach > attach)
  assert.ok(cleanupAfterAttach > endedAfterAttach)
  assert.match(source, /requestedSession\?\.end\?\.\(\)/)
})
