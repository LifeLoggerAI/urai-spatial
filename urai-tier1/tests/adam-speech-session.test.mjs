import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { createSpeechRecognitionSession } from '../src/spatial/adam/speechRecognitionSession.mjs'

const runtime = fs.readFileSync(new URL('../src/spatial/adam/AdamPresenceRuntime.tsx', import.meta.url), 'utf8')

test('browser speech recognition is denied by default and never grants emotion inference', () => {
  const session = createSpeechRecognitionSession()
  assert.equal(session.active, false)
  assert.equal(session.isCurrent(session.revision), false)
  assert.equal(session.revision, 0)
})

test('explicit session grant admits only its own revision and revocation denies it immediately', () => {
  const session = createSpeechRecognitionSession()
  const first = session.grant()
  assert.equal(session.active, true)
  assert.equal(session.isCurrent(first), true)
  assert.equal(session.isCurrent(first + 1), false)
  session.revoke()
  assert.equal(session.active, false)
  assert.equal(session.isCurrent(first), false)
})

test('late callbacks cannot be resurrected by a subsequent session grant', () => {
  const session = createSpeechRecognitionSession()
  const old = session.grant()
  session.revoke()
  const current = session.grant()
  assert.ok(current > old)
  assert.equal(session.isCurrent(old), false)
  assert.equal(session.isCurrent(current), true)
})

test('recognition starts only with explicit browser speech consent and a live revision', () => {
  assert.match(runtime, /if \(typeof window === 'undefined' \|\| !speechInputConsent \|\| !speechInputLeaseRef\.current\.active\) return/)
  assert.match(runtime, /speechInputLeaseRef\.current\.isCurrent\(speechInputRevision\)/)
  assert.match(runtime, /disabled=\{busy \|\| listening \|\| !speechInputConsent\}/)
  assert.match(runtime, /Allow browser speech recognition only when I tap Talk/)
  assert.match(runtime, /may use an external service to process microphone audio/)
  assert.match(runtime, /No emotional inference is enabled/)
})

test('Stop, close, route changes and unchecking consent revoke input before late callback can write', () => {
  assert.match(runtime, /speechInputLeaseRef\.current\.revoke\(\)/)
  assert.match(runtime, /recognitionRef\.current\?\.abort\(\)/)
  assert.match(runtime, /const stopAll = useCallback\(\(\) => \{[\s\S]*?revokeSpeechInput\(\)/)
  assert.match(runtime, /const closePresence = useCallback\(\(\) => \{[\s\S]*?stopAll\(\)/)
  assert.match(runtime, /activeSurfaceKey\.current !== surfaceKey[\s\S]*?stopAll\(\)/)
  assert.match(runtime, /else revokeSpeechInput\(\)/)
  assert.match(runtime, /if \(!isCurrentRecognition\(\)\) return/)
})

test('transcript stays editable, bounded, and cannot be sent without independent AI-provider consent', () => {
  assert.match(runtime, /text\.trimStart\(\)\.slice\(0, 2500\)/)
  assert.match(runtime, /onChange=\{\(event\) => \{ recognizedDraftRef\.current = ''; setMessage\(event\.target\.value\) \}\}/)
  assert.match(runtime, /const captured = recognizedDraftRef\.current/)
  assert.match(runtime, /current === captured \? '' : current/)
  assert.match(runtime, /!aiConsent \|\| activeSurfaceKey\.current !== surfaceKey/)
  assert.match(runtime, /disabled=\{busy \|\| !message\.trim\(\) \|\| !aiConsent\}/)
})

test('Send revokes browser microphone capture after snapshotting text and before provider transport', () => {
  const start = runtime.indexOf('  const submit = async (event: FormEvent) => {')
  const end = runtime.indexOf('\n  if (!surface) return null', start)
  assert.ok(start >= 0 && end > start, 'submission handler must exist')
  const submit = runtime.slice(start, end)
  const snapshot = submit.indexOf('const text = message.trim()')
  const revoke = submit.indexOf('revokeSpeechInput()')
  const outbound = submit.indexOf('await requestAdamPresence(')
  assert.ok(snapshot >= 0 && revoke > snapshot,
    "capture the user's chosen message before revoking browser recognition")
  assert.ok(outbound > revoke,
    'abort/revoke the microphone lease before dispatching any AI-provider request')
})
