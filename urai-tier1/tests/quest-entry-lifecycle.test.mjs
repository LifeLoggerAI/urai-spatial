import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

const entryUrl = new URL('../src/app/spatial/ar-vr/QuestVrEntryButton.tsx', import.meta.url)

test('Quest entry registers end handling before renderer attachment', async () => {
  const source = await readFile(entryUrl, 'utf8')
  const listener = source.indexOf("session.addEventListener?.('end'")
  const attach = source.indexOf('await onSessionRequested?.(session)')

  assert.ok(listener >= 0)
  assert.ok(attach >= 0)
  assert.ok(listener < attach)
  assert.match(source, /if \(sessionEnded\) return/)
  assert.match(source, /requestedSession\?\.end\?\.\(\)/)
})
