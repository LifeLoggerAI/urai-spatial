import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const bridge = await readFile(new URL('../src/spatial/digital-human/ChalkSyntheticConversationBridge.tsx', import.meta.url), 'utf8')
const realm = await readFile(new URL('../src/spatial/council/CouncilRealm.tsx', import.meta.url), 'utf8')

test('CHALK fixture is explicit local PCM and has no provider or microphone path', () => {
  assert.match(bridge, /makeToneWav\('conversation'\)/)
  assert.match(bridge, /No provider, microphone, account data, likeness, or conversation is used/)
  assert.doesNotMatch(bridge, /fetch\(|navigator\.mediaDevices|requestOpenAI|requestCouncilProvider/)
})

test('CHALK fixture uses the real playback owner and clears media during route cleanup', () => {
  assert.match(bridge, /new OrbVoicePlayback/)
  assert.match(bridge, /onExternalMediaChange/)
  assert.match(bridge, /bridge\.stop\(\); onMedia\(null\)/)
  assert.match(bridge, /Interrupt/)
})

test('Council mounts the fixture only under the existing dual review gate', () => {
  assert.match(realm, /NEXT_PUBLIC_URAI_ANONYMOUS_FACE_CALIBRATION === 'true'/)
  assert.match(realm, /get\('anonymousFaceLab'\) === '1'/)
  assert.match(realm, /faceLabEnabled \? \(/)
  assert.match(realm, /<ChalkSyntheticConversationBridge onMedia=\{setFaceLabMedia\} reducedMotion=\{reducedMotion\}/)
})
