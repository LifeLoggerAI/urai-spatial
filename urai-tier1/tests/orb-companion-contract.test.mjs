import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'

const source = fs.readFileSync(new URL('../src/lib/orb-companion-contract.ts', import.meta.url), 'utf8')
const conversationSource = fs.readFileSync(new URL('../src/spatial/orb/OrbConversationPanel.tsx', import.meta.url), 'utf8')
const playbackSource = fs.readFileSync(new URL('../src/spatial/orb/orbVoicePlayback.ts', import.meta.url), 'utf8')
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
  assert.match(conversationSource, /void speakOrbResponse\(resolved\.message, resolved\.locale\)/)
  assert.match(conversationSource, /playDeviceVoice\(resolved\.message, resolved\.locale\)/)
  assert.match(conversationSource, /speakOrbResponse\(result\.message, result\.locale\)/)
  assert.match(conversationSource, /playDeviceVoice\(result\.message, result\.locale\)/)
  assert.match(conversationSource, /Allow Orb replies and narrator lines to use the configured natural external voice provider/)
})

test('Orb voice can be stopped after the AI response finishes', () => {
  assert.match(conversationSource, /data-orb-voice-phase=\{voicePhase\}/)
  assert.match(conversationSource, /disabled=\{!busy && !voicePlaying\}/)
  assert.match(conversationSource, /voicePlayback\.current\?\.stop\(\)/)
  assert.match(playbackSource, /this\.aborter\?\.abort\(\)/)
  assert.match(playbackSource, /audio\.pause\(\)/)
  assert.match(playbackSource, /this\.environment\.speech\?\.cancel\(\)/)
})

test('low stimulation blocks both voice entry points and unmute until an explicit later choice', () => {
  for (const entry of ['playDeviceVoice', 'speakOrbResponse']) {
    assert.match(conversationSource, new RegExp(`const ${entry} = [\\s\\S]{0,110}sensorySafeEnabled\\(\\) \\|\\| voicePreferences\\.current\\.sensorySafe`))
    assert.match(conversationSource, new RegExp(`const ${entry} = [\\s\\S]{0,180}muteVoiceForComfort\\(\\)[\\s\\S]{0,30}return`))
  }
  assert.match(conversationSource, /aria-pressed=\{!voiceMuted\}[\s\S]{0,140}sensorySafeEnabled\(\) \|\| voicePreferences\.current\.sensorySafe/)
  assert.match(conversationSource, /voicePreferences\.current\.sensorySafe = enabled/)
  assert.match(conversationSource, /Low stimulation is off\. Orb voice remains muted until you choose Voice on\./)
  assert.match(conversationSource, /const muteVoiceForComfort[\s\S]{0,180}voicePreferences\.current\.muted = true/)
})
