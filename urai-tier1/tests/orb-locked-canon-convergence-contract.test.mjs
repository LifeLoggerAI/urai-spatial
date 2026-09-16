import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8')

const home = read('src/spatial/layout/HomeWorldProductionSacred.tsx')
const conversation = read('src/spatial/orb/OrbConversationPanel.tsx')

test('Home preserves the locked Avatar + Orb + Ground + Sky authority', () => {
  assert.match(home, /data-home-presence-presentation="visible-avatar-third-person"/)
  assert.match(home, /presentation:'visible-home-avatar-third-person'/)
  assert.match(home, /<primitive object=\{model\} visible scale=\{0\.72\}/)
  assert.match(home, /data-home-camera-mode=/)
  assert.doesNotMatch(home, /privacy-preserving-first-person-presence/)
})

test('Home Life Map ascent belongs to the broad sky rather than a localized portal', () => {
  assert.match(home, /function SkyDome\(\{ onActivate \}/)
  assert.match(home, /name="home-life-map-sky-lookout"/)
  assert.match(home, /interaction:'broad-sky-life-map-ascent'/)
  assert.match(home, /<SkyDome onActivate=\{props\.onLifeMap\}/)
  assert.doesNotMatch(home, /PORTAL_MODEL/)
  assert.doesNotMatch(home, /home-life-map-physical-portal/)
  assert.doesNotMatch(home, /LifeMapPortal/)
})

test('Orb authored state clips are one-shot entry gestures, not infinite loops', () => {
  assert.match(home, /setLoop\(THREE\.LoopOnce,1\)/)
  assert.match(home, /clampWhenFinished = true/)
  assert.doesNotMatch(home, /setLoop\(THREE\.LoopRepeat, Infinity\)/)
  assert.match(home, /ORB_STATE_MOTION/)
  assert.match(home, /stateMotion:'one-shot-entry-plus-persistent-organic-runtime'/)
})

test('Orb persistent motion remains state-aware and reduced-motion safe', () => {
  assert.match(home, /const motion = ORB_STATE_MOTION\[state\]/)
  assert.match(home, /if \(!reducedMotion\)/)
  assert.match(home, /root\.current\.position\.y = ORB\.y/)
  assert.match(home, /sensory\.light\.intensity/)
  assert.match(home, /state === 'privacy' \? 0\.022/)
  assert.match(home, /state === 'warning' \? '#cf9b65'/)
})

test('Conversation speaking state is bound to actual playback rather than streamed text deltas', () => {
  const deltaBlock = conversation.match(/if \(providerEvent\.type === 'delta'\) \{([\s\S]*?)\} else if/)?.[1] ?? ''
  assert.match(deltaBlock, /setStreamedText/)
  assert.doesNotMatch(deltaBlock, /publishConversationState\('speaking'/)
  assert.match(conversation, /await audio\.play\(\)\s*\n\s*beginSpeakingClock\('natural'\)/)
  assert.match(conversation, /utterance\.onstart = \(\) => handlers\.onStart\(\)/)
  assert.match(conversation, /utterance\.onboundary/)
})

test('Text focus only becomes Listening when a real microphone session is active', () => {
  const focusBlock = conversation.match(/onFocus=\{\(\) => \{([\s\S]*?)\}\}/)?.[1] ?? ''
  assert.match(focusBlock, /micActiveRef\.current \? 'listening' : 'attention'/)
  assert.doesNotMatch(focusBlock, /publishConversationState\('listening'\)/)
})

test('Speech lifecycle exposes timing events for Orb embodiment', () => {
  assert.match(conversation, /const ORB_SPEECH_CLOCK_EVENT = 'urai:orb-speech-clock'/)
  assert.match(conversation, /phase: 'start'/)
  assert.match(conversation, /phase: 'boundary'/)
  assert.match(conversation, /phase: 'frame'/)
  assert.match(conversation, /phase: 'cancel'/)
  assert.match(conversation, /audio\.ontimeupdate/)
})

test('Real microphone activity drives Listening and local VAD barge-in', () => {
  assert.match(conversation, /navigator\.mediaDevices\?\.getUserMedia/)
  assert.match(conversation, /echoCancellation: true/)
  assert.match(conversation, /noiseSuppression: true/)
  assert.match(conversation, /autoGainControl: true/)
  assert.match(conversation, /const VAD_THRESHOLD = 0\.035/)
  assert.match(conversation, /const BARGE_IN_HOLD_MS = 70/)
  assert.match(conversation, /getFloatTimeDomainData/)
  assert.match(conversation, /if \(wasSpeaking\) \{\s*stopVoice\(false\)/)
  assert.match(conversation, /publishConversationState\('listening'\)/)
  assert.match(conversation, /Microphone audio is not uploaded or transcribed by this control/)
})
