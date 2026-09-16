import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'

const source = fs.readFileSync(new URL('../src/lib/orb-companion-contract.ts', import.meta.url), 'utf8')
const conversationSource = fs.readFileSync(new URL('../src/spatial/orb/OrbConversationPanel.tsx', import.meta.url), 'utf8')
const speechClockSource = fs.readFileSync(new URL('../src/spatial/orb/orbSpeechClock.ts', import.meta.url), 'utf8')
const conversationCss = fs.readFileSync(new URL('../src/spatial/orb/OrbConversationPanel.module.css', import.meta.url), 'utf8')
const voiceClientSource = fs.readFileSync(new URL('../src/spatial/narrator/elevenlabsClient.ts', import.meta.url), 'utf8')
const flat = source.replace(/\s+/g, ' ')

const requiredHomeCommands = [
  'go home',
  'back home',
  'wind back',
  'close chat',
  'close orb',
  'return home',
  'take me home',
]

const requiredRouteHints = [
  'home',
  'brain-synapses',
  'chest-heart',
  'arms-device',
  'legs-movement',
  'sky-life-map',
  'ground-world',
  'object-memory',
  'lifemap',
]

function hasCssDeclaration(block, property, value) {
  return block
    .split(';')
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .some((declaration) => declaration === `${property}:${value}`)
}

test('orb companion preserves required home unwind route commands', () => {
  assert.match(source, /const HOME_ROUTE_COMMANDS = \[/)
  for (const command of requiredHomeCommands) {
    assert.ok(source.includes(`"${command}"`), `missing orb home command: ${command}`)
  }
  assert.ok(flat.includes('HOME_ROUTE_COMMANDS.some((command) => text.includes(command))'), 'home command matcher must use HOME_ROUTE_COMMANDS')
})

test('orb companion preserves all spatial route hints', () => {
  assert.match(source, /export type OrbRouteHint =/)
  for (const hint of requiredRouteHints) {
    assert.ok(source.includes(`"${hint}"`), `missing orb route hint: ${hint}`)
  }
})

test('orb companion local fallback stays safe, routed, and auditable', () => {
  assert.ok(source.includes('mode: "local-fallback"'), 'orb response must preserve local fallback mode')
  assert.ok(source.includes('confidenceLabel: routeHint ? "routed" : "fallback"'), 'orb response must label routed intents')
  assert.ok(source.includes('sources: routeHint ? ["local-route-intent"] : []'), 'routed local fallback must expose local-route-intent source')
  assert.ok(source.includes('I can wind us back home, close the chat layer, and keep the orb passive.'), 'home reply must be safe and control-oriented')
})

test('orb companion treats client user ids as public demo labels only', () => {
  assert.ok(source.includes('identityMode: "public-demo"'), 'orb response must declare public-demo identity mode')
  assert.ok(source.includes('userIdSource: "default-demo" | "client-demo"'), 'orb response must expose identity source')
  assert.ok(source.includes('PUBLIC_DEMO_USER_ID_PATTERN'), 'orb response must validate public demo user ids')
  assert.ok(source.includes('message.slice(0, 500)'), 'orb response must bound public demo message length')
  assert.ok(source.includes('isDemoFallback: identity.userIdSource === "default-demo"'), 'fallback identity must be derived from normalized identity source')
})

test('live Orb replies use the external natural voice path before device fallback', () => {
  assert.match(voiceClientSource, /export async function requestExternalVoiceAudio/)
  assert.match(conversationSource, /requestExternalVoiceAudio/)
  assert.match(conversationSource, /URAI_VOICE_CONFIG\.neutral\.voiceId/)
  assert.match(conversationSource, /resolved\.provider === 'openai'/)
  assert.match(conversationSource, /void speakOrbResponse\(resolved\.message\)/)
  assert.match(conversationSource, /playDeviceVoice\(resolved\.message\)/)
  assert.match(conversationSource, /Allow Orb replies and narrator lines to use the configured natural external voice provider/)
})

test('Orb audible speaking begins from actual playback instead of streamed text or text-only timing', () => {
  const deltaBlock = conversationSource.match(/if \(providerEvent\.type === 'delta'\) \{([\s\S]*?)\} else if/)?.[1] ?? ''
  assert.match(deltaBlock, /setStreamedText/)
  assert.doesNotMatch(deltaBlock, /publishConversationState\('speaking'/)
  assert.match(conversationSource, /await audio\.play\(\)/)
  assert.match(conversationSource, /beginSpeakingClock\('natural'\)/)
  assert.match(conversationSource, /utterance\.onstart = \(\) => handlers\.onStart\(\)/)
  assert.match(conversationSource, /utterance\.onboundary/)
  assert.match(speechClockSource, /export const ORB_SPEECH_CLOCK_EVENT = 'urai:orb-speech-clock'/)
  assert.match(speechClockSource, /export const ORB_RESPONSE_ANTICIPATION_MS = 380/)
  const textOnly = conversationSource.match(/const playTextOnlyResponse = async[\s\S]*?\n  }\n\n  const playDeviceVoice/)?.[0] ?? ''
  assert.match(textOnly, /source: 'text'/)
  assert.doesNotMatch(textOnly, /beginSpeakingClock\('text'\)|publishConversationState\('speaking'/)
})

test('natural voice analysis is local, optional, and does not double-route audio', () => {
  assert.match(conversationSource, /createMediaElementSource\(audio\)/)
  assert.match(conversationSource, /const analyser = context\.createAnalyser\(\)/)
  assert.match(conversationSource, /source\.connect\(analyser\)/)
  assert.match(conversationSource, /analyser\.connect\(context\.destination\)/)
  assert.match(conversationSource, /getFloatTimeDomainData\(samples\)/)
  assert.match(conversationSource, /amplitude: rms/)
  assert.match(conversationSource, /if \(voiceAnalyser\.current\) return/)
  assert.match(conversationSource, /stopNaturalVoiceAnalysis\(\)/)
})

test('Orb voice can be stopped after the AI response finishes', () => {
  assert.match(conversationSource, /const \[voicePlaying, setVoicePlaying\] = useState\(false\)/)
  assert.match(conversationSource, /disabled=\{!busy && !voicePlaying\}/)
  assert.match(conversationSource, /voiceAborter\.current\?\.abort\(\)/)
  assert.match(conversationSource, /activeAudio\.pause\(\)/)
  assert.match(conversationSource, /window\.speechSynthesis\.cancel\(\)/)
  assert.match(conversationSource, /phase: 'cancel'/)
})

test('Orb local microphone VAD is explicit, ephemeral, and supports barge-in without transcription claims', () => {
  assert.match(conversationSource, /navigator\.mediaDevices\?\.getUserMedia/)
  assert.match(conversationSource, /echoCancellation: true/)
  assert.match(conversationSource, /noiseSuppression: true/)
  assert.match(conversationSource, /autoGainControl: true/)
  assert.match(conversationSource, /getFloatTimeDomainData/)
  assert.match(conversationSource, /const VAD_THRESHOLD = 0\.035/)
  assert.match(conversationSource, /const BARGE_IN_HOLD_MS = 70/)
  assert.match(conversationSource, /if \(wasSpeaking\) \{\s*stopVoice\(false\)/)
  assert.match(conversationSource, /publishConversationState\('listening'\)/)
  assert.match(conversationSource, /Microphone audio is not uploaded or transcribed by this control/)
  assert.doesNotMatch(conversationSource, /MediaRecorder|FormData\(\).*microphone|fetch\([^)]*microphone/i)
})

test('textarea focus does not masquerade as acoustic Listening without an active microphone session', () => {
  const focusBlock = conversationSource.match(/onFocus=\{\(\) => \{([\s\S]*?)\}\}/)?.[1] ?? ''
  assert.match(focusBlock, /micActiveRef\.current \? 'listening' : 'attention'/)
  assert.doesNotMatch(focusBlock, /publishConversationState\('listening'\)/)
})

test('Orb conversation disclosure remains a real pointer hit target above the spatial canvas', () => {
  const panelCss = conversationCss.match(/\.panel\{([^}]*)\}/)?.[1] ?? ''
  const summaryCss = conversationCss.match(/\.panel summary\{([^}]*)\}/)?.[1] ?? ''
  const bodyCss = conversationCss.match(/\.body\{([^}]*)\}/)?.[1] ?? ''

  assert.ok(hasCssDeclaration(panelCss, 'position', 'relative'))
  assert.ok(hasCssDeclaration(panelCss, 'z-index', '1'))
  assert.ok(hasCssDeclaration(panelCss, 'isolation', 'isolate'))
  assert.ok(hasCssDeclaration(panelCss, 'pointer-events', 'auto'))

  assert.ok(hasCssDeclaration(summaryCss, 'position', 'relative'))
  assert.ok(hasCssDeclaration(summaryCss, 'z-index', '2'))
  assert.ok(hasCssDeclaration(summaryCss, 'pointer-events', 'auto'))
  assert.ok(hasCssDeclaration(summaryCss, 'touch-action', 'manipulation'))
  assert.ok(hasCssDeclaration(summaryCss, 'transform', 'translateZ(0)'))

  assert.ok(hasCssDeclaration(bodyCss, 'position', 'relative'))
  assert.ok(hasCssDeclaration(bodyCss, 'z-index', '1'))
  assert.ok(hasCssDeclaration(bodyCss, 'pointer-events', 'auto'))
  assert.match(conversationSource, /<summary>Talk with Orb<\/summary>/)
})
