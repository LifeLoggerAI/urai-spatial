import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8')

const home = read('src/spatial/layout/HomeWorldProductionSacred.tsx')
const currentHome = read('src/spatial/layout/HomeWorldProductionV223.tsx')
const conversation = read('src/spatial/orb/OrbConversationPanel.tsx')
const speechClock = read('src/spatial/orb/orbSpeechClock.ts')
const adaptiveQuality = read('src/spatial/performance/useAdaptiveSpatialQuality.ts')

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

test('Current Orb authored state clips are one-shot entry gestures, not infinite loops', () => {
  assert.match(currentHome, /setLoop\(THREE\.LoopOnce, 1\)/)
  assert.match(currentHome, /clampWhenFinished = true/)
  assert.doesNotMatch(currentHome, /next\.reset\(\)\.setLoop\(THREE\.LoopRepeat\s*,\s*Infinity\)/)
  assert.match(currentHome, /ORB_STATE_MOTION/)
  assert.match(currentHome, /stateMotion: 'one-shot-entry-plus-persistent-organic-runtime'/)
})

test('Current Orb persistent motion remains state-aware and reduced-motion safe', () => {
  assert.match(currentHome, /const motion = ORB_STATE_MOTION\[state\]/)
  assert.match(currentHome, /if \(!reducedMotion\)/)
  assert.match(currentHome, /root\.current\.position\.y = baseY/)
  assert.match(currentHome, /sensory\.light\.intensity/)
  assert.match(currentHome, /state === 'privacy' \? \.022/)
  assert.match(currentHome, /state === 'warning' \? '#cf9b65'/)
  assert.match(currentHome, /const expressiveEnergy = reducedMotion \? 0/)
})

test('Home Orb shares one near-ground rest-height authority', () => {
  assert.match(currentHome, /const ORB_FIELD_RADIUS = 0\.5/)
  assert.match(currentHome, /const ORB_GROUND_CLEARANCE = 0\.015/)
  assert.match(currentHome, /const ORB_REST_CENTER_OFFSET = ORB_FIELD_RADIUS \+ ORB_GROUND_CLEARANCE/)
  assert.match(currentHome, /const baseY = groundY \+ ORB_REST_CENTER_OFFSET/)
  assert.match(currentHome, /position=\{\[ORB_POSITION\.x, groundY \+ ORB_REST_CENTER_OFFSET, ORB_POSITION\.z\]\}/)
  assert.match(currentHome, /<sphereGeometry args=\{\[ORB_FIELD_RADIUS,effectBudget\.membraneSegments,effectBudget\.membraneSegments\]\}/)
  assert.doesNotMatch(currentHome, /groundY \+ 1\.52/)
})

test('Current Home never retires descendants of the canonical Avatar or living-memory Orb', () => {
  assert.match(currentHome, /const CURRENT_HOME_PRESENCE_ROOTS = new Set\(\['home-living-memory-orb', 'home-visible-user-avatar'\]\)/)
  assert.match(currentHome, /function isInsideCurrentHomePresence\(object: THREE\.Object3D\)/)
  assert.match(currentHome, /while \(current\)/)
  assert.match(currentHome, /CURRENT_HOME_PRESENCE_ROOTS\.has\(current\.name\)/)
  assert.match(currentHome, /current = current\.parent/)
  assert.match(currentHome, /if \(isInsideCurrentHomePresence\(object\)\) return/)
  assert.match(currentHome, /name="home-orb-authored-core"/)
  assert.match(currentHome, /name="home-orb-non-spherical-core"/)
  assert.match(currentHome, /name="home-orb-stabilizer-ring-1"/)
})

test('Authored model cloning is skeleton-safe, preserves material shape, and disposes only cloned materials', () => {
  assert.match(currentHome, /import \{ clone as cloneSkeleton \} from 'three\/addons\/utils\/SkeletonUtils\.js'/)
  assert.match(currentHome, /const root = cloneSkeleton\(source\)/)
  assert.match(currentHome, /object\.material = Array\.isArray\(object\.material\)/)
  assert.match(currentHome, /object\.material\.map\(\(material\) => material\.clone\(\)\)/)
  assert.match(currentHome, /: object\.material\.clone\(\)/)
  assert.match(currentHome, /function disposeClonedMaterials\(root: THREE\.Object3D\)/)
  assert.match(currentHome, /materials\.forEach\(\(material\) => material\.dispose\(\)\)/)
  assert.match(currentHome, /disposeClonedMaterials\(model\)/)
  assert.match(currentHome, /disposeClonedMaterials\(authoredOrb\)/)
  assert.doesNotMatch(currentHome, /geometry\.dispose\(\)|texture\.dispose\(\)/)
  assert.doesNotMatch(currentHome, /Array\.isArray\(source\)/)
})

test('Visible Home Avatar uses the existing authored idle_breath clip and respects reduced motion', () => {
  assert.match(currentHome, /const \{ actions \} = useAnimations\(human\.animations, model\)/)
  assert.match(currentHome, /const idle = actions\.idle_breath/)
  assert.match(currentHome, /if \(!idle \|\| reducedMotion\) return/)
  assert.match(currentHome, /idle\.reset\(\)\.setLoop\(THREE\.LoopRepeat, Infinity\)\.fadeIn\(\.3\)\.play\(\)/)
  assert.match(currentHome, /animation: reducedMotion \? 'still-reduced-motion' : 'idle_breath'/)
  assert.match(currentHome, /cloneStrategy: 'skeleton-safe'/)
})

test('Conversation speaking state is bound to actual audible playback rather than streamed text or muted response timing', () => {
  const deltaBlock = conversation.match(/if \(providerEvent\.type === 'delta'\) \{([\s\S]*?)\} else if/)?.[1] ?? ''
  assert.match(deltaBlock, /setStreamedText/)
  assert.doesNotMatch(deltaBlock, /publishConversationState\('speaking'/)
  assert.match(conversation, /await audio\.play\(\)/)
  assert.match(conversation, /beginSpeakingClock\('natural'\)/)
  assert.match(conversation, /utterance\.onstart = \(\) => handlers\.onStart\(\)/)
  assert.match(conversation, /utterance\.onboundary/)
  const textOnly = conversation.match(/const playTextOnlyResponse = async[\s\S]*?\n  }\n\n  const playDeviceVoice/)?.[0] ?? ''
  assert.match(textOnly, /emitOrbSpeechClock\(\{ phase: 'frame', source: 'text'/)
  assert.doesNotMatch(textOnly, /beginSpeakingClock\('text'\)|publishConversationState\('speaking'/)
})

test('Text focus only becomes Listening when a real microphone session is active', () => {
  const focusBlock = conversation.match(/onFocus=\{\(\) => \{([\s\S]*?)\}\}/)?.[1] ?? ''
  assert.match(focusBlock, /micActiveRef\.current \? 'listening' : 'attention'/)
  assert.doesNotMatch(focusBlock, /publishConversationState\('listening'\)/)
})

test('Shared speech lifecycle defines response anticipation and truthful optional RMS', () => {
  assert.match(speechClock, /export const ORB_SPEECH_CLOCK_EVENT = 'urai:orb-speech-clock'/)
  assert.match(speechClock, /export const ORB_RESPONSE_ANTICIPATION_MS = 380/)
  assert.match(speechClock, /'anticipation' \| 'start' \| 'boundary' \| 'frame' \| 'end' \| 'cancel'/)
  assert.match(speechClock, /readonly amplitude\?: number/)
  assert.match(conversation, /phase: 'anticipation'/)
  assert.match(conversation, /createMediaElementSource\(audio\)/)
  assert.match(conversation, /createAnalyser\(\)/)
  assert.match(conversation, /getFloatTimeDomainData\(samples\)/)
  assert.match(conversation, /amplitude: rms/)
  assert.match(conversation, /if \(voiceAnalyser\.current\) return/)
})

test('Visible Orb consumes speech timing without pretending text has acoustic amplitude', () => {
  assert.match(currentHome, /window\.addEventListener\(ORB_SPEECH_CLOCK_EVENT, listener\)/)
  assert.match(currentHome, /detail\.source === 'text'/)
  assert.match(currentHome, /detail\.phase === 'boundary'/)
  assert.match(currentHome, /typeof detail\.amplitude === 'number'/)
  assert.match(currentHome, /speechEnergy\.current/)
  assert.match(currentHome, /speechImpulse\.current/)
  assert.match(currentHome, /anticipation\.current/)
  assert.match(currentHome, /speechEmbodiment: 'actual-playback-clock-with-rms-when-available'/)
  assert.match(currentHome, /heartMaterial\.current\.emissiveIntensity/)
  assert.match(currentHome, /worldLight\.current\.intensity/)
})

test('Orb effects use the repository adaptive quality authority rather than a parallel device classifier', () => {
  assert.match(currentHome, /useAdaptiveSpatialQuality\(\)/)
  assert.match(currentHome, /const effectBudget = ORB_EFFECT_BUDGET\[quality\.tier\]/)
  assert.match(currentHome, /low: \{ motes: 120, filaments: 2, membraneSegments: 32 \}/)
  assert.match(currentHome, /medium: \{ motes: 180, filaments: 5, membraneSegments: 48 \}/)
  assert.match(currentHome, /high: \{ motes: 520, filaments: 8, membraneSegments: 64 \}/)
  assert.match(adaptiveQuality, /export type SpatialQualityTier = 'low' \| 'medium' \| 'high'/)
  assert.doesNotMatch(currentHome, /deviceMemory|hardwareConcurrency|effectiveType|saveData/)
})

test('Real microphone activity drives Listening and local VAD barge-in', () => {
  assert.match(conversation, /navigator\.mediaDevices\?\.getUserMedia/)
  assert.match(conversation, /echoCancellation: true/)
  assert.match(conversation, /noiseSuppression: true/)
  assert.match(conversation, /autoGainControl: true/)
  assert.match(conversation, /const VAD_THRESHOLD = 0\.035/)
  assert.match(conversation, /const BARGE_IN_HOLD_MS = 70/)
  assert.match(conversation, /getFloatTimeDomainData\(samples\)/)
  assert.match(conversation, /if \(wasSpeaking\) \{\s*stopVoice\(false\)/)
  assert.match(conversation, /publishConversationState\('listening'\)/)
  assert.match(conversation, /Microphone audio is not uploaded or transcribed by this control/)
})

test('Orb audio lifecycle closes acquired resources and cancels truthful speech state on playback failure', () => {
  assert.match(conversation, /const context = new AudioContext\(\)\s*voiceContext\.current = context\s*await context\.resume\(\)/)
  assert.match(conversation, /if \(context\.state !== 'running' \|\| voiceAudio\.current !== audio\) \{\s*stopNaturalVoiceAnalysis\(\)/)
  assert.match(conversation, /const stream = await navigator\.mediaDevices\.getUserMedia[\s\S]*?micStream\.current = stream\s*const context = new AudioContext\(\)\s*micContext\.current = context\s*await context\.resume\(\)/)
  assert.match(conversation, /if \(speechStartedAt\.current !== null\) endSpeakingClock\('natural', finishSpeech \? 'end' : 'cancel'\)/)
  assert.match(conversation, /catch \{\s*await stopMicrophone\(false\)/)
})