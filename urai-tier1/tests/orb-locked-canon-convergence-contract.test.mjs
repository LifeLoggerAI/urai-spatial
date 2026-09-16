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
  assert.match(home, /data-home-camera-mode=\{transition!==?'none'/)
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

test('Text focus is attention, not fake acoustic listening', () => {
  const focusBlock = conversation.match(/onFocus=\{\(\) => \{([\s\S]*?)\}\}/)?.[1] ?? ''
  assert.match(focusBlock, /publishConversationState\('attention'\)/)
  assert.doesNotMatch(focusBlock, /publishConversationState\('listening'\)/)
})

test('Speech lifecycle exposes timing events for Orb embodiment and barge-in integration', () => {
  assert.match(conversation, /const ORB_SPEECH_CLOCK_EVENT = 'urai:orb-speech-clock'/)
  assert.match(conversation, /phase: 'start'/)
  assert.match(conversation, /phase: 'boundary'/)
  assert.match(conversation, /phase: 'frame'/)
  assert.match(conversation, /phase: 'cancel'/)
  assert.match(conversation, /audio\.ontimeupdate/)
})
