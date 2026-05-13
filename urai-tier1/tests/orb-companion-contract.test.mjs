import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'

const source = fs.readFileSync(new URL('../src/lib/orb-companion-contract.ts', import.meta.url), 'utf8')
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
