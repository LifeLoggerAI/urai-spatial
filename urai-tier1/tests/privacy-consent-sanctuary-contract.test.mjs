import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

const root = path.resolve(import.meta.dirname, '..')
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8')

test('Privacy Controls has one canonical route owner', () => {
  const page = read('src/app/privacy-controls/page.tsx')
  const legacy = read('src/app/UraiAutonomousV1Layer.tsx')
  assert.match(page, /ConsentSanctuaryClient/)
  assert.match(page, /<ConsentSanctuaryClient\s*\/>/)
  assert.doesNotMatch(legacy, /pathname\.startsWith\("\/privacy-controls"\)/)
  assert.match(legacy, /Privacy Controls[\s\S]*route-owned[\s\S]*excluded from this layer/)
})

test('Consent Sanctuary is spatial and remains directly operable', () => {
  const client = read('src/app/privacy-controls/ConsentSanctuaryClient.tsx')
  const css = read('src/app/privacy-controls/consent-sanctuary.css')
  assert.match(client, /<Canvas/)
  assert.match(client, /OrbitControls/)
  assert.match(client, /DOMAIN_ORDER\.map/)
  assert.match(client, /Skip to direct controls/)
  assert.match(client, /role="dialog"/)
  assert.match(client, /aria-live="polite"/)
  assert.match(client, /DEMONSTRATION — no personal data/)
  assert.match(client, /No private state was replaced with demo data/)
  assert.match(client, /event\.key === 'Home'/)
  assert.match(client, /event\.key !== 'Escape'/)
  assert.match(css, /min-height:48px/)
  assert.match(css, /prefers-reduced-motion/)
  assert.match(css, /forced-colors/)
})

test('Consent Sanctuary fails closed before authentication resolves and exposes demo policy only explicitly', () => {
  const client = read('src/app/privacy-controls/ConsentSanctuaryClient.tsx')
  assert.match(client, /useState<ConsentPolicy>\(\(\) => unresolvedPolicy\(\)\)/)
  assert.match(client, /ownerId: 'unresolved'/)
  assert.match(client, /mode: 'denied'/)
  assert.match(client, /if \(explicitDemo\) \{[\s\S]*setPolicy\(demoPolicy\(\)\)/)
  assert.doesNotMatch(client, /useState<ConsentPolicy>\(\(\) => demoPolicy\(\)\)/)
})

test('Consent mutations use authenticated trusted orchestration and durable enforcement state', () => {
  const client = read('src/app/privacy-controls/ConsentSanctuaryClient.tsx')
  const bridge = read('src/lib/privacy/operationalPrivacyClient.ts')
  const functions = read('../apps/functions/src/privacyOperations.ts')
  const model = read('src/app/privacy-controls/consentModel.ts')
  assert.match(client, /onAuthStateChanged/)
  assert.match(client, /applyOperationalConsentPolicy/)
  assert.doesNotMatch(client, /runTransaction|result: 'enforced'/)
  assert.match(bridge, /httpsCallable/)
  assert.match(functions, /applyConsentPolicy/)
  assert.match(functions, /CONSENT_REVISION_CONFLICT/)
  assert.match(functions, /privacyEnforcementJobs/)
  assert.match(functions, /processPrivacyEnforcementJob/)
  assert.match(functions, /partially-enforced/)
  assert.match(functions, /providerRevocationQueue/)
  assert.match(model, /EnforcementState/)
  assert.match(model, /consequenceSummary/)
})

test('Export and deletion are trusted idempotent owner-scoped lifecycles', () => {
  const client = read('src/app/privacy-controls/ConsentSanctuaryClient.tsx')
  const functions = read('../apps/functions/src/privacyOperations.ts')
  assert.match(client, /createOperationalExportRequest/)
  assert.match(client, /downloadOperationalExportBytes/)
  assert.doesNotMatch(client, /window\.location\.assign\(String\(result\.url\)\)|saveOperationalExportDownload/)
  assert.match(client, /createOperationalDeletionRequest/)
  assert.match(functions, /requireRecentAuthentication/)
  assert.match(functions, /stableId\(uid, operationId, 'export'\)/)
  assert.match(functions, /private-exports\/\$\{uid\}\/\$\{snapshot\.id\}/)
  assert.match(functions, /checksumAlgorithm: 'sha256'/)
  assert.match(functions, /processDeletionQueueItem/)
  assert.match(functions, /recursiveDelete/)
  assert.match(functions, /retainedExceptions/)
  assert.match(functions, /ownerDigest/)
})

test('Client subscriptions remain inside the authenticated owner path', () => {
  const bridge = read('src/lib/privacy/operationalPrivacyClient.ts')
  assert.match(bridge, /collection\(getFirebaseDb\(\), 'users', uid, collectionName\)/)
  assert.doesNotMatch(bridge, /where\('uid'/)
  assert.doesNotMatch(bridge, /collection\(getFirebaseDb\(\), collectionName\)/)
})

// Actual typed keyboard effect, with a disclosed earlier synthetic world listener.
// No React/Firebase runtime, network, provider, or real private state is used.
function keyboardFixture({ pending = null, showAudit = false } = {}) {
  const source = read('src/app/privacy-controls/ConsentSanctuaryClient.tsx')
  const start = source.indexOf('  useEffect(() => {\n    const onKeyDown =')
  const end = source.indexOf('  }, [pending, showAudit])', start)
  assert.ok(start >= 0 && end > start, 'production keyboard effect exists')
  const code = ts.transpileModule(source.slice(start, end + '  }, [pending, showAudit])'.length), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText
  const listeners = [], calls = { worldUnwinds: 0, historyBack: 0, audit: [], pending: [], mutation: [] }
  let cleanup
  const window = {
    history: { length: 2, back: () => { calls.historyBack++ } },
    location: { assign: () => { calls.historyBack++ } },
    addEventListener: (_name, callback, capture = false) => listeners.push({ callback, capture }),
    removeEventListener: (_name, callback, capture = false) => {
      const index = listeners.findIndex(listener => listener.callback === callback && listener.capture === capture)
      assert.ok(index >= 0, 'cleanup removes the exact listener and event phase')
      listeners.splice(index, 1)
    },
  }
  window.addEventListener('keydown', () => { calls.worldUnwinds++ })
  class Element { constructor(foreign = false) { this.foreign = foreign } closest(selector) {
    if (selector === '[role="dialog"]' && this.foreign) return { closest: () => null }
    return null
  } }
  vm.runInNewContext(code, { window, Element, HTMLElement: Element, pending, showAudit,
    useEffect: effect => { cleanup = effect() }, document: { getElementById: () => ({ focus() {} }) },
    setPending: value => calls.pending.push(value), setMutationState: value => calls.mutation.push(value),
    setShowAudit: value => calls.audit.push(value), setSelectedDomain: () => {},
  })
  return { calls, cleanup: () => cleanup(), dispatch({ prevented = false, foreign = false } = {}) {
    let stopped = false
    const event = { key: 'Escape', target: new Element(foreign), defaultPrevented: prevented,
      preventDefault() { this.defaultPrevented = true }, stopImmediatePropagation() { stopped = true } }
    for (const phase of [true, false]) for (const listener of listeners.filter(item => item.capture === phase)) {
      if (stopped) break
      listener.callback(event)
    }
    return event
  } }
}

test('Escape closes audit receipts before an earlier world listener can leave Privacy', () => {
  const f = keyboardFixture({ showAudit: true })
  assert.equal(f.dispatch().defaultPrevented, true)
  assert.deepEqual(f.calls.audit, [false])
  assert.equal(f.calls.worldUnwinds, 0)
  assert.equal(f.calls.historyBack, 0)
  f.cleanup()
})

test('Escape cancels a pending consent preview without routing or dispatching it', () => {
  const f = keyboardFixture({ pending: { domain: 'memory' } })
  f.dispatch()
  assert.deepEqual(f.calls.pending, [null])
  assert.deepEqual(f.calls.mutation, ['idle'])
  assert.equal(f.calls.worldUnwinds, 0)
  assert.equal(f.calls.historyBack, 0)
  f.cleanup()
})

test('Privacy Escape respects an already-consumed key or a foreign dialog', () => {
  for (const options of [{ prevented: true }, { foreign: true }]) {
    const f = keyboardFixture({ showAudit: true }); f.dispatch(options)
    assert.deepEqual(f.calls.audit, [])
    assert.deepEqual(f.calls.pending, [])
    assert.equal(f.calls.historyBack, 0)
    f.cleanup()
  }
})
