import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

const source = readFileSync(process.env.URAI_PRIVACY_SOURCE_FILE || new URL('../src/app/privacy-controls/ConsentSanctuaryClient.tsx', import.meta.url), 'utf8')
const parsed = ts.createSourceFile('ConsentSanctuaryClient.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
let effect
function find(node) {
  if (ts.isCallExpression(node) && node.expression.getText(parsed) === 'useEffect' && node.arguments[0]?.getText(parsed).includes('const onKeyDown')) effect = node.arguments[0].getText(parsed)
  ts.forEachChild(node, find)
}
find(parsed)
assert.ok(effect, 'The real Privacy keyboard effect must be present')
const javascript = ts.transpileModule(`globalThis.install = ${effect}`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText

// Execute the actual keyboard effect, with navigation events observed at the
// existing world-owner boundary. No browser history or provider access is used.
function keyboard({ pending = null, showAudit = false, phase = 'idle', previousDestination, historyLength = 2 } = {}) {
  const events = [], state = [], listeners = new Map()
  const window = {
    history: { length: historyLength, back: () => events.push({ kind: 'unsafe-history-back' }) },
    location: { assign: href => events.push({ kind: 'hard-location', href }) },
    addEventListener: (name, handler) => listeners.set(name, handler),
    removeEventListener: (name, handler) => { if (listeners.get(name) === handler) listeners.delete(name) },
  }
  const context = vm.createContext({ window, pending, showAudit, phase, world: { previousDestination },
    setPending: value => state.push(['pending', value]), setMutationState: value => state.push(['mutation', value]), setShowAudit: value => state.push(['audit', value]),
    requestUraiWorldReturn: () => events.push({ kind: 'world-return' }),
    requestUraiWorldTravel: request => events.push({ kind: 'world-travel', ...request }),
  })
  vm.runInContext(javascript, context)
  const cleanup = context.install()
  return { events, state, cleanup, listeners, press(defaultPrevented = false) {
    const event = { key: 'Escape', defaultPrevented, preventDefault() { this.defaultPrevented = true } }
    listeners.get('keydown')?.(event)
    return event
  } }
}

test('fresh direct entry uses canonical Passport travel despite browser history', () => {
  for (const historyLength of [1, 2, 20]) {
    const view = keyboard({ historyLength })
    assert.equal(view.press().defaultPrevented, true)
    assert.deepEqual(view.events, [{ kind: 'world-travel', destination: 'passport', href: '/passport' }])
  }
})
test('a known in-app origin delegates to the existing world return owner', () => {
  const view = keyboard({ previousDestination: 'mirror' })
  view.press()
  assert.deepEqual(view.events, [{ kind: 'world-return' }])
})
test('a self-reference uses Passport instead of cycling back into Privacy', () => {
  const view = keyboard({ previousDestination: 'privacy-controls' })
  view.press()
  assert.deepEqual(view.events, [{ kind: 'world-travel', destination: 'passport', href: '/passport' }])
})
test('pending changes cancel before audit dismissal or world travel', () => {
  const view = keyboard({ pending: { domain: 'memory' }, showAudit: true, previousDestination: 'mirror' })
  view.press()
  assert.deepEqual(view.state, [['pending', null], ['mutation', 'idle']])
  assert.deepEqual(view.events, [])
})
test('audit dismissal stays in Privacy without a navigation event', () => {
  const view = keyboard({ showAudit: true, previousDestination: 'mirror' })
  view.press()
  assert.deepEqual(view.state, [['audit', false]])
  assert.deepEqual(view.events, [])
})
test('consumed Escape and in-progress world travel cannot schedule another return', () => {
  const consumed = keyboard({ previousDestination: 'mirror' })
  consumed.press(true)
  assert.deepEqual(consumed.events, [])
  const travelling = keyboard({ phase: 'travelling', previousDestination: 'mirror' })
  travelling.press()
  assert.deepEqual(travelling.events, [])
})
test('unmount removes this realm keyboard listener', () => {
  const view = keyboard()
  view.cleanup()
  assert.equal(view.listeners.has('keydown'), false)
})
