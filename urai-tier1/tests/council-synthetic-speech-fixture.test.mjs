import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

const root = new URL('../src/spatial/', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')

test('Council synthetic speech fixture is local-only and remains separate from conversation input', async () => {
  const fixture = await read('council/CouncilSyntheticSpeechFixture.tsx')
  assert.match(fixture, /Local PCM only/)
  assert.match(fixture, /new OrbVoicePlayback/)
  assert.match(fixture, /onExternalMediaChange: onMedia/)
  assert.match(fixture, /playback\.current\?\.stop\(\)/)
  assert.doesNotMatch(fixture, /fetch\(|mediaDevices|requestCouncilProvider|requestOpenAIOrb/)
})

test('Council stage double-gates the fixture and drives only the existing skeletal speaking clip from audio time', async () => {
  const realm = await read('council/CouncilRealm.tsx')
  assert.match(realm, /NEXT_PUBLIC_URAI_CHALK_SYNTHETIC_SPEECH_FIXTURE/)
  assert.match(realm, /chalkSpeechFixture'\) === '1'/)
  assert.match(realm, /actions\.speak_calm/)
  assert.match(realm, /speechMedia\?\.currentTime/)
  assert.match(realm, /CouncilSyntheticSpeechFixture onMedia=\{setSpeechMedia\}/)
  assert.match(realm, /Reduced motion limits the speaking-motion intensity|reducedMotion \? 0\.24 : 1/)
})
