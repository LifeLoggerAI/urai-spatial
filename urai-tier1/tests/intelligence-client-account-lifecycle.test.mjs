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
  const state = { calls: 0, auth: {}, parsed: 0, observers: new Set() }
  let currentUser
  Object.defineProperty(state.auth, 'currentUser', { get: () => currentUser, set: value => {
    currentUser = value
    for (const observer of [...state.observers]) queueMicrotask(() => { if (state.observers.has(observer)) observer.next(value) })
  } })
  const owner = { uid: 'SYNTHETIC-owner', getIdToken: async () => {
    if (options.token) await options.token(state, owner)
    return 'SYNTHETIC-token'
  } }
  state.auth.currentUser = owner
  const imports = {
    'firebase/auth': { getAuth: () => state.auth, onIdTokenChanged: (_auth, next, error) => {
      const observer = { next, error }, initial = state.auth.currentUser
      state.observers.add(observer)
      queueMicrotask(() => { if (state.observers.has(observer)) next(initial) })
      return () => state.observers.delete(observer)
    } },
    '@/lib/firebase/client': { app: {}, firebasePublicEnvReady: true },
    '@/lib/clientApiUrl': { clientApiUrl: value => value },
    '@/lib/orb-companion-contract': { buildOrbCompanionResponse: () => ({ reply: 'SYNTHETIC local fallback' }) },
    '@/lib/i18n/contentLanguage': { contentLanguage: locale => locale === 'en-US' ? { speechTag: 'en-US' } : null },
    '@/lib/i18n/localePreference': { currentSpeechTag: () => 'en-US' },
  }
  const module = { exports: {} }
  const context = vm.createContext({ TextEncoder, TextDecoder, Blob, Response, AbortController, AbortSignal, DOMException,
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
  const modules = new Map()
  const load = (relative, output) => {
    if (modules.has(relative)) return modules.get(relative)
    const loaded = { exports: {} }; modules.set(relative, loaded.exports)
    const source = fs.readFileSync(new URL(relative, import.meta.url), 'utf8')
    const compiled = output ?? ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
    new vm.Script(`(function(require,module,exports){${compiled}\n})`).runInContext(context)(id => {
      assert.ok(Object.hasOwn(imports, id), id); return imports[id]
    }, loaded, loaded.exports)
    return loaded.exports
  }
  imports['@/lib/privacy/aiActorBoundary'] = load('../src/lib/privacy/aiActorBoundary.ts')
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
      // A started Council/Orb actor lease closes with AbortError; voice retains its null-blob contract.
      if (kind !== 'voice') await assert.rejects(f.run(), error => error?.name === 'AbortError')
      else { const result = await f.run(); assert.equal(result.blob, null) }
      assert.equal(f.state.calls, 0)
      assert.equal(f.state.observers.size, 0)
    })
    test(`${kind} ${change} during response consumption withholds prior-account output`, async () => {
      const f = fixture(kind, { afterBody: (state, owner) => { state.auth.currentUser = change === 'signout' ? null : { ...owner, uid: change === 'switch' ? 'SYNTHETIC-other' : owner.uid } } })
      if (kind !== 'voice') await assert.rejects(f.run(), error => error?.name === 'AbortError')
      else { const result = await f.run(); assert.equal(result.blob, null) }
      assert.equal(f.state.calls, 1)
      assert.equal(f.state.observers.size, 0)
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
test('mounted Council account change clears private draft, history, result and consent, and aborts the prior request', async () => {
  // Deterministic actual-source keyed lifecycle; this is not a React DOM/browser mount.
  const source = fs.readFileSync(new URL('../src/spatial/council/CouncilConversationPanel.tsx', import.meta.url), 'utf8')
  const emitted = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const seeded = ['SYNTHETIC private draft', [{ role: 'user', content: 'SYNTHETIC prior context' }], { message: 'SYNTHETIC prior answer' }, 'openai', 'pending', true, true]
  let values = [], refs = [], effects = [], cursor = 0, refCursor = 0, effectCursor = 0
  let listener, unsubscribed = false, storeOff, childKey, rendered
  const observers = new Set()
  const auth = { currentUser: { uid: 'SYNTHETIC prior owner' } }
  const emit = value => {
    for (const observer of [...observers]) queueMicrotask(() => { if (observers.has(observer)) observer.next(value) })
  }
  const sdk = { getAuth: () => auth, onIdTokenChanged: (_auth, next, error) => {
    listener = next
    const observer = { next, error }, initial = auth.currentUser
    observers.add(observer)
    queueMicrotask(() => { if (observers.has(observer)) next(initial) })
    return () => { observers.delete(observer); unsubscribed = true }
  } }
  const imports = {
    react: {
      useState: initial => {
        const index = cursor++
        if (!(index in values)) values[index] = typeof initial === 'function' ? initial() : initial
        return [values[index], value => { values[index] = typeof value === 'function' ? value(values[index]) : value }]
      },
      useMemo: fn => fn(),
      useRef: current => { const index = refCursor++; return refs[index] ??= { current } },
      useEffect: (effect, deps) => {
        const index = effectCursor++, prior = effects[index]
        if (!prior || !deps || deps.some((value, i) => value !== prior.deps?.[i])) effects[index] = { effect, deps, cleanup: prior?.cleanup, pending: true }
      },
      useSyncExternalStore: (subscribe, getSnapshot) => {
        if (!storeOff) storeOff = subscribe(() => render())
        return getSnapshot()
      },
    },
    'react/jsx-runtime': { jsx: (type, props, key) => ({ type, props, key }), jsxs: (type, props, key) => ({ type, props, key }) },
    'firebase/auth': sdk,
    '@/lib/firebase/client': { app: {}, firebasePublicEnvReady: true },
    '@/spatial/orb/openaiClient': {}, './councilClient': {},
    './councilProviderRegistry': { REQUESTABLE_COUNCIL_PROVIDER_IDS: ['openai'], LIVE_COUNCIL_PROVIDER_IDS: [], PENDING_COUNCIL_PROVIDER_IDS: ['anthropic'],
      COUNCIL_PROVIDER_REGISTRY: { openai: { label: 'OpenAI' } } },
  }
  const context = vm.createContext({ DOMException, AbortController, AbortSignal })
  const authority = { exports: {} }
  const helperSource = fs.readFileSync(new URL('../src/lib/privacy/aiActorBoundary.ts', import.meta.url), 'utf8')
  const helperEmitted = ts.transpileModule(helperSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const dependency = id => { assert.ok(Object.hasOwn(imports, id), id); return imports[id] }
  new vm.Script(`(function(require,module,exports){${helperEmitted}\n})`).runInContext(context)(dependency, authority, authority.exports)
  imports['@/lib/privacy/aiActorBoundary'] = authority.exports
  const module = { exports: {} }
  new vm.Script(`(function(require,module,exports){${emitted}\n})`).runInContext(context)(dependency, module, module.exports)
  const clearChild = () => { for (const effect of effects) effect?.cleanup?.() }
  function render() {
    const node = module.exports.default({ agent: { name: 'SYNTHETIC Guide', role: 'reflective', focus: 'optional' } })
    if (node.key !== childKey) {
      const first = childKey === undefined
      clearChild()
      childKey = node.key
      values = first ? seeded.slice() : []
      refs = []; effects = []
    }
    cursor = 0; refCursor = 0; effectCursor = 0
    rendered = node.type(node.props)
    for (const effect of effects) if (effect?.pending) {
      effect.cleanup?.(); effect.cleanup = effect.effect(); effect.pending = false
    }
    return rendered
  }
  render()
  const cleanup = () => { clearChild(); storeOff?.(); storeOff = undefined }
  assert.equal(typeof listener, 'function')
  const prior = new AbortController(), priorRef = refs[0], priorKey = childKey
  refs[0].current = prior
  emit(auth.currentUser); await new Promise(resolve => setImmediate(resolve))
  assert.equal(childKey, priorKey); assert.equal(prior.signal.aborted, false)
  assert.equal(values[0], seeded[0]); assert.equal(observers.size, 2)
  auth.currentUser = { uid: 'SYNTHETIC replacement owner' }; emit(auth.currentUser)
  await new Promise(resolve => setImmediate(resolve))
  assert.notEqual(childKey, priorKey)
  assert.equal(prior.signal.aborted, true); assert.equal(refs[0].current, null)
  assert.equal(priorRef.current, null)
  assert.equal(values[0], ''); assert.equal(values[1].length, 0); assert.equal(values[2], null)
  assert.equal(values[5], false); assert.equal(values[6], false)
  const pending = new AbortController(); refs[0].current = pending
  cleanup(); assert.equal(unsubscribed, true); assert.equal(pending.signal.aborted, true)
  assert.equal(refs[0].current, null); assert.equal(observers.size, 0)
})
