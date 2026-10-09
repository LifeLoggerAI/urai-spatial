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

// Execute the actual production callbacks, rather than a duplicate Escape policy.
// Both registration orders matter: the persistent shell uses a layout effect,
// while Consent Sanctuary installs its listener in a passive effect.
const controllerPath = 'src/spatial/world/WorldTransitionController.tsx'
const sanctuaryPath = 'src/app/privacy-controls/ConsentSanctuaryClient.tsx'

function sourceCallback(relative, name, bindings, declaration = false) {
  const source = ts.createSourceFile(relative, read(relative), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const matches = []
  const visit = (node) => {
    if (declaration && ts.isFunctionDeclaration(node) && node.name?.text === name) matches.push(node)
    if (!declaration && ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name && node.initializer) matches.push(node.initializer)
    ts.forEachChild(node, visit)
  }
  visit(source)
  assert.equal(matches.length, 1, `${relative} must expose one actual ${name} callback`)
  const compiled = ts.transpileModule(`(${matches[0].getText(source)})`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    reportDiagnostics: true,
  })
  assert.equal(compiled.diagnostics?.length ?? 0, 0)
  return vm.runInNewContext(compiled.outputText, bindings)
}

class TestElement {
  constructor(editable = false) { this.isContentEditable = editable }
  matches() { return this.isContentEditable }
  closest() { return this.isContentEditable ? this : null }
}

function escapeHarness({ pending = null, showAudit = false, historyLength = 2, destination = 'privacy-controls', phase = 'idle' } = {}) {
  const effects = { pending: [], mutations: [], audit: [], historyBack: 0, locations: [], reverseTravel: 0, domains: [], focus: 0 }
  const reverseTravel = () => { effects.reverseTravel += 1 }
  const elementBindings = { HTMLElement: TestElement, Element: TestElement }
  const global = sourceCallback(controllerPath, 'onKeyDown', {
    worldRef: { current: { destination } }, phaseRef: { current: phase }, reverseTravel,
    isEditableTarget: sourceCallback(controllerPath, 'isEditableTarget', elementBindings, true),
  })
  const consent = sourceCallback(sanctuaryPath, 'onKeyDown', {
    ...elementBindings, pending, showAudit,
    setPending: value => effects.pending.push(value),
    setMutationState: value => effects.mutations.push(value),
    setShowAudit: value => effects.audit.push(value),
    setSelectedDomain: value => effects.domains.push(value),
    document: { getElementById: () => ({ focus: () => { effects.focus += 1 } }) },
    window: {
      history: { length: historyLength, back: () => { effects.historyBack += 1 } },
      location: { assign: value => effects.locations.push(value) },
    },
  })
  const event = {
    key: 'Escape', defaultPrevented: false, target: null,
    altKey: false, ctrlKey: false, metaKey: false, shiftKey: false,
    preventDefault() { this.defaultPrevented = true },
  }
  return { global, consent, event, effects, reverseTravel }
}

for (const order of ['global-first', 'consent-first']) {
  test(`audit Escape closes receipts without leaving Consent Sanctuary (${order})`, () => {
    const { global, consent, event, effects } = escapeHarness({ showAudit: true })
    for (const handler of order === 'global-first' ? [global, consent] : [consent, global]) handler(event)
    assert.deepEqual(effects.audit, [false])
    assert.equal(effects.reverseTravel, 0)
    assert.equal(effects.historyBack, 0)
    assert.deepEqual(effects.locations, [])
    assert.equal(event.defaultPrevented, true)
  })
}

test('pending-consent Escape cancels only the preview, before audit dismissal or navigation', () => {
  const { global, consent, event, effects } = escapeHarness({ pending: { domain: 'memory' }, showAudit: true })
  global(event)
  consent(event)
  assert.deepEqual(effects.pending, [null])
  assert.deepEqual(effects.mutations, ['idle'])
  assert.deepEqual(effects.audit, [])
  assert.equal(effects.reverseTravel, 0)
  assert.equal(effects.historyBack, 0)
  assert.deepEqual(effects.locations, [])
  assert.equal(event.defaultPrevented, true)
})

test('unhandled sanctuary Escape preserves the existing history return exactly once', () => {
  const { global, consent, event, effects } = escapeHarness({ historyLength: 2 })
  global(event)
  consent(event)
  assert.equal(effects.historyBack, 1)
  assert.equal(effects.reverseTravel, 0)
  assert.deepEqual(effects.locations, [])
  assert.equal(event.defaultPrevented, true)
})

test('direct-entry sanctuary Escape preserves the existing Passport return exactly once', () => {
  const { global, consent, event, effects } = escapeHarness({ historyLength: 1 })
  global(event)
  consent(event)
  assert.equal(effects.historyBack, 0)
  assert.equal(effects.reverseTravel, 0)
  assert.deepEqual(effects.locations, ['/passport'])
  assert.equal(event.defaultPrevented, true)
})

test('an already claimed Escape neither cancels consent nor adds a second return', () => {
  const { global, consent, event, effects } = escapeHarness({ pending: { domain: 'location' }, showAudit: true })
  event.preventDefault()
  global(event)
  consent(event)
  assert.deepEqual(effects.pending, [])
  assert.deepEqual(effects.mutations, [])
  assert.deepEqual(effects.audit, [])
  assert.equal(effects.historyBack, 0)
  assert.equal(effects.reverseTravel, 0)
})

test('global Escape still defers to all existing realm-owned contracts', () => {
  for (const destination of ['life-map', 'location-map', 'privacy-controls']) {
    const { global, event, effects } = escapeHarness({ destination })
    global(event)
    assert.equal(effects.reverseTravel, 0, destination)
    assert.equal(event.defaultPrevented, false, destination)
  }
})

test('global Escape still reverses non-owned realms and preserves input safeguards', () => {
  for (const destination of ['focus', 'replay', 'infrastructure-hub', 'mirror']) {
    const { global, event, effects } = escapeHarness({ destination })
    global(event)
    assert.equal(effects.reverseTravel, 1, destination)
    assert.equal(event.defaultPrevented, true, destination)
  }
  for (const patch of [{ key: 'Enter' }, { target: new TestElement(true) }, { defaultPrevented: true }]) {
    const { global, event, effects } = escapeHarness({ destination: 'focus' })
    global(Object.assign(event, patch))
    assert.equal(effects.reverseTravel, 0)
  }
  const { global, event, effects } = escapeHarness({ destination: 'home' })
  global(event)
  assert.equal(effects.reverseTravel, 0)
  assert.equal(event.defaultPrevented, false)
})

test('consent Home key remains operable and preserves modifier/editable ownership', () => {
  const { consent, event, effects } = escapeHarness()
  event.key = 'Home'
  consent(event)
  assert.deepEqual(effects.domains, ['memory'])
  assert.equal(effects.focus, 1)
  assert.equal(event.defaultPrevented, true)
  for (const patch of [{ altKey: true }, { ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { defaultPrevented: true }, { target: new TestElement(true) }]) {
    const harness = escapeHarness()
    harness.consent(Object.assign(harness.event, { key: 'Home' }, patch))
    assert.deepEqual(harness.effects.domains, [])
    assert.equal(harness.effects.focus, 0)
  }
})

test('explicit world return events remain available from Consent Sanctuary', () => {
  const { effects, reverseTravel } = escapeHarness()
  const onReturn = sourceCallback(controllerPath, 'onReturn', { reverseTravel })
  onReturn()
  assert.equal(effects.reverseTravel, 1)
})
