import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { webcrypto } from 'node:crypto'
import test from 'node:test'

// Execute actual transpiled source. Only SDK identity/event and HTTP terminals
// are controlled; no Firebase app, credential, provider or network is opened.
const require = createRequire(import.meta.url)
const ts = require('typescript')
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const baseline = process.env.URAI_AI_CLIENT_BASELINE_ROOT
const SOURCE = 'urai-tier1/src/'
const language = 'packages/localization/src/contentLanguage.ts'
const boundary = SOURCE + 'lib/privacy/aiActorBoundary.ts'
const clients = { council: SOURCE + 'spatial/council/councilClient.ts', orb: SOURCE + 'spatial/orb/openaiClient.ts' }
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }
const tick = async () => { await Promise.resolve(); await Promise.resolve(); await new Promise(resolve => setImmediate(resolve)) }
const cancellation = error => error?.name === 'AbortError'

function fixture({ enabled = true, user = true, phase = 'none', status = 200, code, lateCancelNever = false, lines } = {}) {
  const listeners = new Set(), requests = [], events = []
  const token = deferred(), headers = deferred(), reached = deferred()
  const userA = { uid: 'synthetic-owner-A', getIdToken: async () => {
    if (phase === 'token') { reached.resolve(); return token.promise }
    return 'synthetic-token-A'
  } }
  const userB = { uid: 'synthetic-owner-B', getIdToken: async () => 'synthetic-token-B' }
  const auth = { currentUser: user ? userA : null }
  const modules = new Map()
  let stream, cancelCount = 0, sdkThrow = false
  const sdk = { getAuth: () => auth, onIdTokenChanged: (_auth, next, error) => {
    if (sdkThrow) throw new Error('Synthetic observer setup failure')
    const listener = { next, error }; listeners.add(listener)
    queueMicrotask(() => { if (listeners.has(listener)) next(auth.currentUser) })
    return () => listeners.delete(listener)
  } }
  const emit = value => {
    for (const listener of [...listeners]) queueMicrotask(() => { if (listeners.has(listener)) listener.next(value) })
  }
  const setActor = (value, notify = true) => { auth.currentUser = value; if (notify) emit(value) }
  const result = kind => kind === 'council'
    ? { provider: 'anthropic', model: 'synthetic-model', message: 'Fictional owner-A answer', caption: 'Fictional answer', disclosure: 'Synthetic terminal only', suggestedActions: [] }
    : { type: 'done', provider: 'openai', message: 'Fictional owner-A answer', caption: 'Fictional answer', disclosure: 'Synthetic terminal only', suggestedActions: [], locale: 'en-US' }
  const makeResponse = kind => {
    if (code) return Response.json({ error: code }, { status })
    const body = new ReadableStream({ start(controller) {
      stream = controller
      if (phase !== 'body' && phase !== 'eof') {
        controller.enqueue(new TextEncoder().encode(lines ?? (JSON.stringify(result(kind)) + (kind === 'orb' ? '\n' : ''))))
        controller.close()
      }
    }, pull(controller) {
      if (phase === 'body') reached.resolve()
      if (phase === 'eof') { controller.close(); setActor(userB, false) }
    }, cancel() {
      cancelCount++; return lateCancelNever ? new Promise(() => {}) : undefined
    } }, { highWaterMark: 0 })
    return new Response(body, { headers: { 'Content-Type': kind === 'orb' ? 'application/x-ndjson' : 'application/json' }, status })
  }
  function load(relative) {
    if (modules.has(relative)) return modules.get(relative)
    const exports = {}; modules.set(relative, exports)
    const from = baseline && Object.values(clients).includes(relative) ? baseline : root
    const text = fs.readFileSync(path.join(from, relative), 'utf8')
    const output = ts.transpileModule(text, { fileName: relative, reportDiagnostics: true,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } })
    assert.equal(output.diagnostics?.length ?? 0, 0)
    const context = vm.createContext({ exports, module: { exports }, DOMException, AbortController, AbortSignal,
      TextEncoder, TextDecoder, URL, process: { env: {} },
      crypto: { subtle: { digest: async (...args) => {
        const value = await webcrypto.subtle.digest(...args)
        if (phase === 'hash') setActor(userB)
        return value
      } } },
      require: id => {
        if (id === 'firebase/auth') return sdk
        if (id === '@/lib/firebase/client') return { app: {}, firebasePublicEnvReady: enabled }
        if (id === '@/lib/clientApiUrl') return load(SOURCE + 'lib/clientApiUrl.ts')
        if (id === '@/lib/privacy/aiActorBoundary') return load(boundary)
        if (id === '@/lib/orb-companion-contract') return load(SOURCE + 'lib/orb-companion-contract.ts')
        if (id === '@/lib/i18n/contentLanguage') return load(language)
        if (id === '@/lib/i18n/localePreference') return { currentSpeechTag: () => 'en-US' }
        throw new Error('Unfenced import: ' + id)
      },
      fetch: async (url, init) => {
        assert.ok(url === '/api/urai/council/anthropic' || url === '/api/urai/orb/openai')
        const kind = url.endsWith('/openai') ? 'orb' : 'council'
        requests.push({ url, signal: init.signal, actor: auth.currentUser, token: init.headers.Authorization, body: JSON.parse(init.body) })
        if (phase === 'headers') { reached.resolve(); return headers.promise }
        const response = makeResponse(kind)
        if (phase === 'after-headers') setActor(userB, false)
        return response
      },
    })
    vm.runInContext(output.outputText, context, { filename: relative })
    return context.module.exports
  }
  const authority = load(boundary)
  const input = () => ({ provider: 'anthropic', message: 'Fictional owner-A question',
    context: Array.from({ length: 10 }, (_, i) => ({ role: 'user', content: 'Fictional prior context ' + i })),
    aiProcessingConsent: true, locale: 'en-US', signal: new AbortController().signal,
    onEvent: event => events.push(event) })
  const request = kind => load(clients[kind])[kind === 'orb' ? 'requestOpenAIOrb' : 'requestExternalCouncilProvider']
  return { auth, authority, userA, userB, requests, events, listeners, token, headers, reached, input, request, setActor, emit,
    setSdkThrow: value => { sdkThrow = value }, cancelCount: () => cancelCount,
    releaseBody: kind => { stream.enqueue(new TextEncoder().encode(JSON.stringify(result(kind)) + (kind === 'orb' ? '\n' : ''))); stream.close() },
    makeResponse }
}

for (const kind of ['council', 'orb']) {
  test('client: ' + kind + ' preserves same-actor request and last-eight raw context', async () => {
    const f = fixture(), input = f.input(), value = await f.request(kind)(input)
    assert.equal(value.message, 'Fictional owner-A answer')
    assert.equal(f.requests.length, 1)
    assert.equal(f.requests[0].body.context.length, 8)
    assert.equal(f.requests[0].body.context[0].content, 'Fictional prior context 2')
    assert.equal(f.requests[0].body.message, input.message)
    assert.match(f.requests[0].body.requestId, /^[a-f0-9]{64}$/)
    assert.equal(input.signal.aborted, false)
    assert.equal(f.listeners.size, 0)
  })
  for (const phase of ['token', 'hash', 'headers', 'after-headers', 'body']) {
    test('client: ' + kind + ' rejects changed actor during ' + phase, async () => {
      const f = fixture({ phase }), input = f.input()
      const pending = f.request(kind)(input)
      const expected = assert.rejects(pending, cancellation)
      if (['token', 'headers', 'body'].includes(phase)) {
        await f.reached.promise; f.setActor(f.userB)
      }
      // Late source values are released regardless of the expected assertion.
      // The unchanged predecessor therefore returns stale data and fails a
      // real assertion rather than leaving a held fixture promise pending.
      setImmediate(() => {
        if (phase === 'token') f.token.resolve('synthetic-late-token')
        if (phase === 'headers') f.headers.resolve(f.makeResponse(kind))
        if (phase === 'body' && (kind === 'council' || f.cancelCount() === 0)) f.releaseBody(kind)
      })
      await expected
      assert.equal(f.events.length, 0)
      assert.equal(input.signal.aborted, false)
      assert.equal(f.listeners.size, 0)
      assert.equal(f.requests.length, ['token', 'hash'].includes(phase) ? 0 : 1)
      await tick(); assert.equal(f.requests.length, ['token', 'hash'].includes(phase) ? 0 : 1)
      assert.equal(f.events.length, 0)
      if (phase === 'headers') assert.equal(f.cancelCount(), 1)
    })
  }
  test('client: ' + kind + ' rejects logout while credential ignores cancellation', async () => {
    const f = fixture({ phase: 'token' }), input = f.input(), pending = f.request(kind)(input)
    const expected = assert.rejects(pending, cancellation)
    await f.reached.promise; f.setActor(null)
    setImmediate(() => f.token.resolve('synthetic-late-token')); await expected; await tick()
    assert.equal(f.requests.length, 0); assert.equal(f.events.length, 0); assert.equal(f.listeners.size, 0)
  })
  test('client: ' + kind + ' cancels same-UID replacement without canceling caller signal', async () => {
    const f = fixture({ phase: 'token' }), input = f.input(), pending = f.request(kind)(input)
    const expected = assert.rejects(pending, cancellation)
    await f.reached.promise; f.setActor({ ...f.userA })
    setImmediate(() => f.token.resolve('synthetic-late-token')); await expected; await tick()
    assert.equal(f.requests.length, 0); assert.equal(input.signal.aborted, false)
  })
  test('client: ' + kind + ' preserves same-object token refresh', async () => {
    const f = fixture({ phase: 'token' }), input = f.input(), pending = f.request(kind)(input)
    await f.reached.promise; f.emit(f.userA); await tick(); f.token.resolve('synthetic-refreshed-token')
    assert.equal((await pending).message, 'Fictional owner-A answer')
    assert.equal(f.requests.length, 1); assert.equal(f.listeners.size, 0)
  })
  for (const negative of ['no-user', 'no-configuration', 'no-consent', 'aborted']) test('client: ' + kind + ' retains ' + negative + ' denial', async () => {
    const f = fixture({ enabled: negative !== 'no-configuration', user: negative !== 'no-user' }), input = f.input()
    if (negative === 'no-consent') input.aiProcessingConsent = false
    if (negative === 'aborted') input.signal = AbortSignal.abort()
    assert.equal(await f.request(kind)(input), null)
    assert.equal(f.requests.length, 0); assert.equal(f.events.length, 0); assert.equal(f.listeners.size, 0)
  })
}

test('actor snapshot is stable on token refresh and resets on same-UID replacement', async () => {
  const f = fixture(), a = f.authority.getAIActorSnapshot(), server = f.authority.getServerAIActorSnapshot()
  assert.equal(f.authority.getAIActorSnapshot(), a)
  assert.equal(f.authority.getServerAIActorSnapshot(), server)
  let notices = 0; const off = f.authority.subscribeAIActor(() => { notices++ })
  await tick(); f.emit(f.userA); await tick()
  assert.equal(f.authority.getAIActorSnapshot(), a)
  f.setActor({ ...f.userA }); await tick()
  const next = f.authority.getAIActorSnapshot()
  assert.notEqual(next, a); assert.ok(next.generation > a.generation)
  assert.equal(f.authority.isCurrentAIActorSnapshot(a), false)
  assert.equal(next.uid, f.userA.uid); assert.ok(notices > 0)
  off(); assert.equal(f.listeners.size, 0)
})

test('queued A to B to A notifications invalidate prior snapshot and request', async () => {
  const f = fixture(), a = f.authority.getAIActorSnapshot(), off = f.authority.subscribeAIActor(() => {})
  const caller = new AbortController(), request = f.authority.beginAIActorRequest(caller.signal)
  const held = deferred(), pending = request.wait(held.promise), expected = assert.rejects(pending, cancellation)
  await tick(); f.setActor(f.userB); f.setActor(f.userA); await expected
  assert.equal(f.auth.currentUser, f.userA)
  assert.equal(f.authority.isCurrentAIActorSnapshot(a), false)
  assert.equal(caller.signal.aborted, false)
  held.resolve('late'); request.dispose(); off(); await tick()
  assert.equal(f.listeners.size, 0)
})

test('guest sign-in changes snapshot; guest request is not externally admitted', async () => {
  const f = fixture({ user: false }), guest = f.authority.getAIActorSnapshot()
  assert.equal(guest.actor, null)
  assert.equal(f.authority.beginAIActorRequest(new AbortController().signal), null)
  const off = f.authority.subscribeAIActor(() => {})
  f.setActor(f.userA); await tick()
  assert.notEqual(f.authority.getAIActorSnapshot(), guest); off()
})

test('observer setup failure is denied without transport or retained listener', () => {
  const f = fixture(); f.setSdkThrow(true)
  assert.equal(f.authority.beginAIActorRequest(new AbortController().signal), null)
  assert.equal(f.requests.length, 0); assert.equal(f.listeners.size, 0)
})

test('late reject after actor cancellation is consumed without unhandled rejection', async () => {
  const f = fixture(), lease = f.authority.beginAIActorRequest(new AbortController().signal), held = deferred()
  const errors = [], listener = e => errors.push(e); process.on('unhandledRejection', listener)
  try {
    const expected = assert.rejects(lease.wait(held.promise), cancellation)
    f.setActor(f.userB); await expected; held.reject(new Error('Synthetic late failure'))
    await tick(); assert.equal(errors.length, 0)
  } finally { lease.dispose(); process.off('unhandledRejection', listener) }
})

for (const kind of ['council', 'orb']) {
  test('client: ' + kind + ' settles before an ignored token promise releases', async () => {
    const f = fixture({ phase: 'token' }), input = f.input()
    let outcome
    const pending = f.request(kind)(input).then(value => { outcome = { value } }, error => { outcome = { error } })
    await f.reached.promise; f.setActor(f.userB); await tick()
    try {
      assert.ok(cancellation(outcome?.error), 'actor cancellation must settle without releasing credentials')
      assert.equal(f.requests.length, 0); assert.equal(f.listeners.size, 0)
    } finally { f.token.resolve('synthetic-late-token'); await pending }
  })
  test('client: ' + kind + ' consumes late headers without awaiting hung body cleanup', async () => {
    const f = fixture({ phase: 'headers', lateCancelNever: true }), input = f.input()
    const pending = f.request(kind)(input), expected = assert.rejects(pending, cancellation)
    await f.reached.promise; f.setActor(f.userB)
    setImmediate(() => f.headers.resolve(f.makeResponse(kind)))
    await expected; await tick()
    assert.equal(f.cancelCount(), 1); assert.equal(f.events.length, 0); assert.equal(f.listeners.size, 0)
  })
  test('client: ' + kind + ' honors caller cancellation without a late dispatch', async () => {
    const f = fixture({ phase: 'token' }), caller = new AbortController(), input = { ...f.input(), signal: caller.signal }
    const pending = f.request(kind)(input), expected = assert.rejects(pending, cancellation)
    await f.reached.promise; caller.abort()
    setImmediate(() => f.token.resolve('synthetic-late-token'))
    await expected; await tick()
    assert.equal(f.requests.length, 0); assert.equal(f.listeners.size, 0)
  })
  test('client: ' + kind + ' rejects mutation of captured SDK UID', async () => {
    const f = fixture({ phase: 'token' }), pending = f.request(kind)(f.input())
    const expected = assert.rejects(pending, cancellation)
    await f.reached.promise; f.userA.uid = f.userB.uid; f.emit(f.userA)
    setImmediate(() => f.token.resolve('synthetic-late-token'))
    await expected; assert.equal(f.requests.length, 0)
  })
  test('client: ' + kind + ' preserves pre-dispatch denial and definite versus uncertain errors', async () => {
    for (const [code, status, expectedName] of kind === 'council'
      ? [['CONSENT_POLICY_REQUIRED', 403, null], ['ANTHROPIC_REQUEST_FAILED', 502, 'CouncilExternalProviderAttemptError'], ['UNKNOWN_SYNTHETIC', 502, 'CouncilExternalProviderAttemptUncertainError']]
      : [['CONSENT_POLICY_REQUIRED', 403, null], ['OPENAI_REQUEST_FAILED', 502, 'OrbProviderAttemptError'], ['UNKNOWN_SYNTHETIC', 502, 'OrbProviderAttemptUncertainError']]) {
      const f = fixture({ code, status })
      if (expectedName) await assert.rejects(f.request(kind)(f.input()), error => error.name === expectedName)
      else assert.equal(await f.request(kind)(f.input()), null)
      assert.equal(f.requests.length, 1); assert.equal(f.listeners.size, 0)
    }
  })
}

test('Orb checks actor again after a synchronous event callback before the next same-chunk event', async () => {
  const lines = JSON.stringify({ type: 'delta', text: 'Fictional first fragment', locale: 'en-US' }) + '\n'
    + JSON.stringify({ type: 'done', provider: 'openai', message: 'Fictional owner-A answer', caption: 'Fictional answer', disclosure: 'Synthetic only', suggestedActions: [], locale: 'en-US' }) + '\n'
  const f = fixture({ lines }), input = f.input()
  input.onEvent = event => { f.events.push(event); f.setActor(f.userB, false) }
  await assert.rejects(f.request('orb')(input), cancellation)
  assert.equal(f.events.length, 1); assert.equal(f.events[0].type, 'delta')
  assert.equal(f.listeners.size, 0)
})

test('Orb checks current SDK actor at EOF even without an SDK notification', async () => {
  const f = fixture({ phase: 'eof' })
  await assert.rejects(f.request('orb')(f.input()), cancellation)
  assert.equal(f.events.length, 0); assert.equal(f.listeners.size, 0)
})

test('observer error denies actor snapshots and requests until a trusted SDK event recovers', async () => {
  const f = fixture(), before = f.authority.getAIActorSnapshot(), off = f.authority.subscribeAIActor(() => {})
  await tick()
  for (const listener of [...f.listeners]) listener.error(new Error('Synthetic SDK observer error'))
  assert.equal(f.authority.getAIActorSnapshot().actor, null)
  assert.equal(f.authority.isCurrentAIActorSnapshot(before), false)
  assert.equal(f.authority.beginAIActorRequest(new AbortController().signal), null)
  f.emit(f.userA); await tick()
  assert.equal(f.authority.getAIActorSnapshot().actor, f.userA)
  off(); assert.equal(f.listeners.size, 0)
})

test('private lease disposal consumes late values and preserves mutable SDK and caller objects', async () => {
  const f = fixture(), caller = new AbortController(), lease = f.authority.beginAIActorRequest(caller.signal), held = deferred()
  const cleaned = [], expected = assert.rejects(lease.wait(held.promise, value => { cleaned.push(value); return new Promise(() => {}) }), cancellation)
  lease.dispose(); await expected; held.resolve('late-synthetic-value'); await tick()
  assert.deepEqual(cleaned, ['late-synthetic-value'])
  assert.equal(Object.isFrozen(f.userA), false)
  assert.equal(caller.signal.aborted, false); assert.equal(f.listeners.size, 0)
  lease.dispose(); assert.equal(f.listeners.size, 0)
})

for (const [name, lines] of [
  ['malformed JSON', '{'],
  ['invalid shape', JSON.stringify({ provider: 'anthropic', message: 'Synthetic incomplete answer' })],
  ['null JSON shape', 'null'],
]) test('client: council preserves uncertain processing for HTTP200 ' + name, async () => {
  const f = fixture({ lines }), input = f.input()
  await assert.rejects(f.request('council')(input), error => {
    assert.equal(f.requests.length, 1)
    assert.equal(f.events.length, 0)
    assert.equal(f.listeners.size, 0)
    assert.equal(input.signal.aborted, false)
    return error?.name === 'CouncilExternalProviderAttemptUncertainError' && error.provider === input.provider
  })
  assert.equal(f.requests[0].signal.aborted, true)
})

test('client: council gives actor cancellation priority over malformed HTTP200 JSON', async () => {
  const f = fixture({ phase: 'headers', lines: '{' }), input = f.input()
  const pending = f.request('council')(input), expected = assert.rejects(pending, cancellation)
  await f.reached.promise
  const response = f.makeResponse('council'), json = response.json.bind(response)
  let parses = 0
  response.json = () => { parses++; f.setActor(f.userB, false); return json() }
  f.headers.resolve(response)
  await expected; await tick()
  assert.equal(parses, 1)
  assert.equal(f.requests.length, 1); assert.equal(f.events.length, 0); assert.equal(f.listeners.size, 0)
  assert.equal(input.signal.aborted, false); assert.equal(f.requests[0].signal.aborted, true)
})
