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


test('Quest entry requires explicit session consent before requesting WebXR', async () => {
  const source = await readFile(entryUrl, 'utf8')
  const consentGate = source.indexOf('if (!sessionConsent)')
  const requestSession = source.indexOf("xr.requestSession('immersive-vr'")
  assert.ok(consentGate >= 0)
  assert.ok(requestSession > consentGate)
  assert.match(source, /type="checkbox"/)
  assert.match(source, /I agree to use my headset movement and controls for this VR session/)
  assert.match(source, /This page does not record or save them/)
  assert.match(source, /setSessionConsent\(false\)/)
})
