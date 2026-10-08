import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import { webcrypto } from 'node:crypto'
import ts from 'typescript'

// Actual current client source; only Firebase identity and transport are synthetic.
function fixture(kind, options = {}) {
  const source = fs.readFileSync(new URL(kind === 'council' ? '../src/spatial/council/councilClient.ts' : kind === 'orb' ? '../src/spatial/orb/openaiClient.ts' : '../src/spatial/life-model/personPresenceVoiceClient.ts', import.meta.url), 'utf8')
  const emitted = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const state = { calls: 0, auth: {}, parsed: 0 }
  const owner = { uid: 'SYNTHETIC-owner', getIdToken: async () => {
    if (options.token) await options.token(state, owner)
    return 'SYNTHETIC-token'
  } }
  state.auth.currentUser = owner
  const imports = {
    'firebase/auth': { getAuth: () => state.auth },
    '@/lib/firebase/client': { app: {}, firebasePublicEnvReady: true },
    '@/lib/clientApiUrl': { clientApiUrl: value => value },
    '@/lib/orb-companion-contract': { buildOrbCompanionResponse: () => ({ reply: 'SYNTHETIC local fallback' }) },
    '@/lib/i18n/contentLanguage': { contentLanguage: locale => locale === 'en-US' ? { speechTag: 'en-US' } : null },
    '@/lib/i18n/localePreference': { currentSpeechTag: () => 'en-US' },
  }
  const module = { exports: {} }
  const context = vm.createContext({ TextEncoder, TextDecoder, Blob, Response, AbortController,
    crypto: webcrypto, fetch: async (url, init) => {
      state.calls++
      if (options.transport) return options.transport(state, url, init)
      if (kind === 'orb') {
        const stream = new Response(JSON.stringify({ type: 'done', provider: 'openai', message: 'SYNTHETIC answer', caption: 'SYNTHETIC answer',
          disclosure: 'SYNTHETIC provider attribution', locale: 'en-US', suggestedActions: [] }) + '\n')
        const actualGetReader = stream.body.getReader.bind(stream.body)
        stream.body.getReader = () => {
          const reader = actualGetReader(), read = reader.read.bind(reader)
          reader.read = async () => { const value = await read(); state.parsed++; if (options.afterBody) await options.afterBody(state, owner); return value }
          return reader
        }
        return stream
      }
      const response = kind === 'council' ? Response.json({ provider: 'anthropic', message: 'SYNTHETIC answer', caption: 'SYNTHETIC answer',
        disclosure: 'SYNTHETIC provider attribution', model: 'SYNTHETIC-model', suggestedActions: [] }) : new Response('SYNTHETIC audio')
      const parse = kind === 'council' ? 'json' : 'blob'
      const actual = response[parse].bind(response)
      response[parse] = async () => { const value = await actual(); state.parsed++; if (options.afterBody) await options.afterBody(state, owner); return value }
      return response
    },
  })
  new vm.Script(`(function(require,module,exports){${emitted}\n})`).runInContext(context)(id => {
    assert.ok(Object.hasOwn(imports, id), id); return imports[id]
  }, module, module.exports)
  const request = kind === 'council' ? module.exports.requestExternalCouncilProvider : kind === 'orb' ? module.exports.requestOpenAIOrb : module.exports.requestPersonPresenceVoice
  const run = (input = {}) => request({ provider: 'anthropic', message: 'SYNTHETIC private context', context: [], aiProcessingConsent: true,
    sessionId: 'presence:synthetic-session-123', text: 'SYNTHETIC private narration', locale: 'en-US', externalProcessingConsent: true,
    signal: new AbortController().signal, ...input })
  return { run, state, owner }
}

for (const kind of ['council', 'voice', 'orb']) {
  test(`${kind} current-account request remains functional`, async () => {
    const f = fixture(kind); const result = await f.run()
    assert.equal(f.state.calls, 1)
    if (kind !== 'voice') assert.equal(result.message, 'SYNTHETIC answer')
    else assert.ok(result.blob?.size)
  })
  for (const change of ['signout', 'switch', 'same-uid-replacement']) {
    test(`${kind} ${change} during token refresh prevents dispatch of prior-account data`, async () => {
      const f = fixture(kind, { token: (state, owner) => { state.auth.currentUser = change === 'signout' ? null : { ...owner, uid: change === 'switch' ? 'SYNTHETIC-other' : owner.uid } } })
      const result = await f.run(); assert.equal(f.state.calls, 0)
      if (kind !== 'voice') assert.equal(result, null)
      else assert.equal(result.blob, null)
    })
    test(`${kind} ${change} during response consumption withholds prior-account output`, async () => {
      const f = fixture(kind, { afterBody: (state, owner) => { state.auth.currentUser = change === 'signout' ? null : { ...owner, uid: change === 'switch' ? 'SYNTHETIC-other' : owner.uid } } })
      const result = await f.run(); assert.equal(f.state.calls, 1)
      if (kind !== 'voice') assert.equal(result, null)
      else assert.equal(result.blob, null)
    })
  }
  test(`${kind} cancellation before invocation prevents all transport`, async () => {
    const f = fixture(kind), controller = new AbortController(); controller.abort()
    const result = await f.run({ signal: controller.signal }); assert.equal(f.state.calls, 0)
    if (kind === 'voice') assert.equal(result.blob, null)
  })
}
test('person voice needs explicit current external consent before any request', async () => {
  const f = fixture('voice'); const result = await f.run({ externalProcessingConsent: false })
  assert.equal(f.state.calls, 0); assert.equal(result.blob, null)
})
test('Council post-provider consent failure retains truthful attempted-processing disclosure', async () => {
  const f = fixture('council', { transport: () => Response.json({ error: 'MODEL_PROCESSING_NOT_AUTHORIZED', externalProcessingAttempted: true }, { status: 403 }) })
  await assert.rejects(f.run(), error => error.name === 'CouncilExternalProviderAttemptError')
  assert.equal(f.state.calls, 1)
})
test('mounted Council account change clears private draft, history, result and consent, and aborts the prior request', () => {
  const source = fs.readFileSync(new URL('../src/spatial/council/CouncilConversationPanel.tsx', import.meta.url), 'utf8')
  const emitted = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const values = ['SYNTHETIC private draft', [{ role: 'user', content: 'SYNTHETIC prior context' }], { message: 'SYNTHETIC prior answer' }, 'openai', 'pending', true, true]
  const effects = [], refs = []
  let cursor = 0, listener, unsubscribed = false
  const auth = { currentUser: { uid: 'SYNTHETIC prior owner' } }
  const imports = {
    react: { useState: initial => { const index = cursor++; if (!(index in values)) values[index] = initial; return [values[index], value => { values[index] = value }] },
      useMemo: fn => fn(), useRef: current => { const ref = { current }; refs.push(ref); return ref }, useEffect: effect => effects.push(effect) },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    'firebase/auth': { getAuth: () => auth, onAuthStateChanged: (_auth, callback) => { listener = callback; return () => { unsubscribed = true } } },
    '@/lib/firebase/client': { app: {}, firebasePublicEnvReady: true },
    '@/spatial/orb/openaiClient': {}, './councilClient': {},
    './councilProviderRegistry': { REQUESTABLE_COUNCIL_PROVIDER_IDS: ['openai'], LIVE_COUNCIL_PROVIDER_IDS: [], PENDING_COUNCIL_PROVIDER_IDS: ['anthropic'],
      COUNCIL_PROVIDER_REGISTRY: { openai: { label: 'OpenAI' } } },
  }
  const module = { exports: {} }
  new vm.Script(`(function(require,module,exports){${emitted}\n})`).runInNewContext({})(id => {
    assert.ok(Object.hasOwn(imports, id), id); return imports[id]
  }, module, module.exports)
  module.exports.default({ agent: { name: 'SYNTHETIC Guide', role: 'reflective', focus: 'optional' } })
  const cleanup = effects[0]?.()
  assert.equal(typeof listener, 'function')
  const prior = new AbortController(); refs[0].current = prior
  auth.currentUser = { uid: 'SYNTHETIC replacement owner' }; listener(auth.currentUser)
  assert.equal(prior.signal.aborted, true); assert.equal(refs[0].current, null)
  assert.equal(values[0], ''); assert.equal(values[1].length, 0); assert.equal(values[2], null)
  assert.equal(values[5], false); assert.equal(values[6], false)
  const pending = new AbortController(); refs[0].current = pending
  cleanup(); assert.equal(unsubscribed, true); assert.equal(pending.signal.aborted, true)
})
