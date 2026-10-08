import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import test from 'node:test'
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'

const require = createRequire(import.meta.url), ts = require('typescript')
const root = process.env.CONSENT_SOURCE_ROOT ? path.resolve(process.env.CONSENT_SOURCE_ROOT) : path.resolve(import.meta.dirname, '..')
const modelSource = fs.readFileSync(path.join(root, 'src/app/privacy-controls/consentModel.ts'), 'utf8')
const clientSource = fs.readFileSync(path.join(root, 'src/app/privacy-controls/ConsentSanctuaryClient.tsx'), 'utf8')
const compile = source => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
const model = {}
vm.runInNewContext(compile(modelSource), { exports: model })
const owner = 'synthetic-policy-owner'
const valid = () => JSON.parse(JSON.stringify(model.defaultConsentPolicy(owner)))

test('canonical valid policies preserve every authority mode, retention choice and permission value', () => {
  for (const mode of ['granted', 'limited', 'paused', 'denied']) for (const retentionDays of [null, 30, 90, 365]) for (const enabled of [false, true]) {
    const policy = valid()
    for (const domain of model.DOMAIN_ORDER) policy.domains[domain] = { mode, retentionDays, precise: enabled, replayVisible: enabled, lifeMapVisible: enabled, modelContext: enabled, sharingEnabled: enabled, automationEnabled: enabled, likenessEnabled: enabled }
    assert.equal(model.isConsentPolicy(policy, owner), true)
  }
  for (const state of ['pending', 'partially-enforced', 'fully-enforced', 'failed', 'conflicted']) for (const providerState of ['not-applicable', 'pending', 'partial', 'complete', 'failed']) {
    const policy = valid(); policy.enforcement = { state, providerState, jobId: 'actual-shaped-job', affectedTargets: ['privacy-authority', 'provider-revocation'] }
    policy.updatedAt = { seconds: 1770000000, nanoseconds: 1 }
    assert.equal(model.isConsentPolicy(policy, owner), true)
  }
})

const malformed = [
  ['missing enforcement targets', p => delete p.enforcement.affectedTargets],
  ['null enforcement targets', p => p.enforcement.affectedTargets = null],
  ['string enforcement', p => p.enforcement = 'fully-enforced'],
  ['full enforcement without provider shape', p => p.enforcement = { state: 'fully-enforced', affectedTargets: [] }],
  ['unknown enforcement', p => p.enforcement.state = 'certified'],
  ['negative revision', p => p.revision = -1], ['fractional revision', p => p.revision = .5],
  ['NaN revision', p => p.revision = NaN], ['infinite revision', p => p.revision = Infinity],
  ['missing permission booleans', p => p.domains.memory = { mode: 'granted' }],
  ['truthy false string permission', p => p.domains.models.modelContext = 'false'],
  ['invalid retention', p => p.domains.memory.retentionDays = 'forever'],
  ['invalid target values', p => p.enforcement.affectedTargets = [{}, 42]],
  ['wrong owner', p => p.ownerId = 'other-owner'], ['unknown mode', p => p.domains.exports.mode = 'other'],
  ['unknown provider state', p => p.enforcement.providerState = 'verified'],
  ['unknown domain', p => p.domains.newAuthority = p.domains.memory],
  ['unknown permission', p => p.domains.memory.autoGrant = true],
  ['unknown authority property', p => p.approved = true],
  ['unknown enforcement property', p => p.enforcement.approved = true],
  ['array domain record', p => p.domains.memory = Object.assign([], p.domains.memory)],
  ['inherited complete domains', p => p.domains = Object.create(p.domains)],
  ['inherited complete authority', p => { const next = Object.create(p); return next }],
  ['unsafe integer revision', p => p.revision = Number.MAX_SAFE_INTEGER + 1],
  ['null permission', p => p.domains.memory.replayVisible = null],
  ['sparse targets', p => p.enforcement.affectedTargets = Array(1)],
  ['duplicate targets', p => p.enforcement.affectedTargets = ['privacy-authority', 'privacy-authority']],
  ['unknown array target property', p => p.enforcement.affectedTargets.extra = true],
  ['invalid job ID', p => p.enforcement.jobId = { job: 'unknown' }],
]
for (const [name, mutate] of malformed) test('actual policy gate rejects ' + name, () => {
  const policy = valid(), candidate = mutate(policy)
  assert.equal(model.isConsentPolicy(candidate && typeof candidate === 'object' && name === 'inherited complete authority' ? candidate : policy, owner), false)
})

test('actual policy gate rejects accessors and typed objects without executing their code', () => {
  let calls = 0
  for (const location of ['revision', 'permission', 'target', 'mode', 'retention']) {
    const policy = valid()
    if (location === 'revision') Object.defineProperty(policy, 'revision', { enumerable: true, get() { calls++; return 1 } })
    if (location === 'permission') Object.defineProperty(policy.domains.memory, 'replayVisible', { enumerable: true, get() { calls++; return true } })
    if (location === 'target') Object.defineProperty(policy.enforcement.affectedTargets, '0', { enumerable: true, get() { calls++; return 'privacy-authority' } })
    if (location === 'mode') policy.domains.memory.mode = { toString() { calls++; return 'granted' } }
    if (location === 'retention') policy.domains.memory.retentionDays = { valueOf() { calls++; return 365 } }
    assert.equal(model.isConsentPolicy(policy, owner), false, location)
  }
  assert.equal(calls, 0)
})

test('actual trusted apply handler produces accepted pending snapshots without replacing other saved permissions', async () => {
  const source = fs.readFileSync(path.join(root, '../apps/functions/src/privacyOperations.ts'), 'utf8')
  const ast = ts.createSourceFile('privacyOperations.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const declarations = ast.statements.filter(n => ts.isFunctionDeclaration(n) || (ts.isVariableStatement(n) && n.declarationList.declarations.some(d => ['CONSENT_DOMAINS', 'CONSENT_MODES', 'STORED_DOMAIN_KEYS', 'STORED_PERMISSION_KEYS', 'STORED_AUTHORITY_IDENTIFIER', 'applyConsentPolicy'].includes(d.name.getText(ast)))))
  assert.equal(declarations.filter(n => ts.isVariableStatement(n) && n.declarationList.declarations.some(d => d.name.getText(ast) === 'applyConsentPolicy')).length, 1)
  const code = compile(declarations.map(n => n.getText(ast)).join('\n'))
  for (const domain of model.DOMAIN_ORDER) for (const mode of ['granted', 'limited', 'paused', 'denied']) for (const retentionDays of [null, 30, 90, 365]) {
    const policy = valid(); policy.revision = 7
    const next = { ...policy.domains[domain], mode, retentionDays }
    const writes = new Map(), output = {}, ref = p => ({ path: p })
    const tx = { get: async r => r.path.endsWith('/privacyPolicy/current') ? { exists: true, data: () => policy } : { exists: false }, set: (r, v) => writes.set(r.path, v), create: (r, v) => writes.set(r.path, v) }
    const functions = { https: { onCall: fn => fn, HttpsError: class extends Error { constructor(code, message) { super(message); this.code = code } } } }
    vm.runInNewContext(code, { exports: output, functions, db: { doc: ref, runTransaction: fn => fn(tx) }, createHash, fieldValue: { serverTimestamp: () => ({ seconds: 1770000000, nanoseconds: 1 }) } })
    const response = await output.applyConsentPolicy({ operationId: 'synthetic-policy-operation', domain, next, expectedRevision: 7 }, { auth: { uid: owner } })
    assert.equal(response.state, 'requested')
    const snapshot = writes.get('users/' + owner + '/privacyPolicy/current')
    assert.equal(model.isConsentPolicy(snapshot, owner), true)
    assert.equal(snapshot.revision, 8); assert.equal(snapshot.enforcement.state, 'pending'); assert.equal(snapshot.enforcement.providerState, 'pending')
    assert.deepEqual(JSON.parse(JSON.stringify(snapshot.domains[domain])), next)
    for (const other of model.DOMAIN_ORDER.filter(d => d !== domain)) assert.deepEqual(JSON.parse(JSON.stringify(snapshot.domains[other])), policy.domains[other])
  }
})

const handlerBody = clientSource.match(/const onKeyDown = \(event: KeyboardEvent\) => \{([\s\S]*?)\n    \}\n    window\.addEventListener\('keydown'/)?.[1]
assert.ok(handlerBody, 'one actual client keyboard handler')
class Element {
  constructor(tag = 'DIV', role = null) { this.tag = tag; this.role = role }
  closest(selector) { return selector.split(',').some(s => s.trim() === this.tag.toLowerCase() || (this.role && s.trim() === '[role="' + this.role + '"]')) ? this : null }
}
class HTMLElement extends Element { constructor(tag = 'DIV', role = null, rich = false) { super(tag, role); this.isContentEditable = rich } }
const runKey = (event = {}) => {
  const effects = [], state = { pending: null, showAudit: false, Element, HTMLElement, setSelectedDomain: d => effects.push(['selected', d]), setPending: () => effects.push(['pending']), setMutationState: () => effects.push(['mutation']), setShowAudit: () => effects.push(['audit']), document: { getElementById: id => ({ focus: () => effects.push(['focus', id]) }) }, window: { history: { length: 1 }, location: { assign: url => effects.push(['navigate', url]) } }, event: { key: 'Home', target: new HTMLElement(), preventDefault: () => effects.push(['preventDefault']), ...event } }
  vm.runInNewContext(compile('const callback = (event: KeyboardEvent) => {' + handlerBody + '}; callback(event)'), state)
  return effects
}
for (const [name, tag, role] of [['text input','INPUT'],['textarea','TEXTAREA'],['select','SELECT'],['textbox role','DIV','textbox'],['combobox role','DIV','combobox'],['spinbutton role','DIV','spinbutton']]) test('actual Home shortcut preserves ' + name, () => assert.deepEqual(runKey({ target: new HTMLElement(tag,role) }), []))
test('actual Home shortcut preserves inherited contenteditable', () => assert.deepEqual(runKey({ target: new HTMLElement('SPAN',null,true) }), []))
for (const key of ['defaultPrevented', 'altKey', 'ctrlKey', 'metaKey', 'shiftKey']) test('actual Home shortcut preserves ' + key, () => assert.deepEqual(runKey({ [key]: true }), []))
test('plain Home retains canonical direct-controls focus and Escape retains return', () => {
  assert.deepEqual(runKey(), [['preventDefault'], ['selected', 'memory'], ['focus', 'consent-controls']])
  assert.deepEqual(runKey({ key: 'Escape' }), [['navigate', '/passport']])
})
