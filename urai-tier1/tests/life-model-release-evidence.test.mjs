import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import {
  canonicalJson, evidenceClassFor, receiptBundleHash, reviewMessage,
  reviewerKeyFromSsh, terminalGates, validateReleaseReceipt,
} from '../../scripts/validate-life-model-release-receipt.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const sha = 'a'.repeat(40)
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex')

// These disposable bytes and a fresh test-only key exercise the contract. They are
// never release evidence; the production CLI rejects their unregistered signer.
function fixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'urai-life-evidence-test-'))
  const keys = crypto.generateKeyPairSync('ed25519')
  const repositories = [{ repo: 'LifeLoggerAI/urai-spatial', sha, branch: 'fixture', pr: null, role: 'primary-runtime' }]
  const componentHash = digest(canonicalJson(repositories))
  const context = { strict: true, evidenceRoot: directory, expectedSha: sha, componentHash, releaseAuthor: 'ReleaseAuthor', trustedReviewerKey: keys.publicKey }
  const write = (name, data) => {
    const bytes = Buffer.isBuffer(data) ? data : Buffer.from(JSON.stringify(data))
    fs.writeFileSync(path.join(directory, name), bytes)
    return { path: name, sha256: digest(bytes), byteLength: bytes.length }
  }
  const receipt = {
    schemaVersion: 'urai-life-model-release-receipt-v1', candidateSha: sha, certified: true,
    componentEnvelopeSha256: componentHash,
    componentEnvelopeRef: write('component.json', { schemaVersion: 'urai-system-candidate-v1', componentHash, repositories }),
    gates: { ...terminalGates }, receiptRefs: [], humanApprovalRefs: [],
  }
  const artifact = write('execution.bin', Buffer.from('DISPOSABLE CONTRACT TEST BYTES; NOT PRIVATE ACCEPTANCE'))
  const gateData = gate => ({
    schemaVersion: 'urai-life-model-gate-evidence-v1', gateId: gate, candidateSha: sha,
    componentEnvelopeSha256: componentHash, result: terminalGates[gate],
    evidenceClass: evidenceClassFor(gate), synthetic: false, candidateAcceptance: true,
    producer: { repository: 'LifeLoggerAI/urai-spatial', sourceSha: sha, identity: 'fixture-runner',
      runtimeRevision: 'fixture-revision', executionId: `fixture-${gate}`, executionUri: `https://example.invalid/fixture/${gate}` },
    artifactRefs: [artifact],
  })
  const replaceGate = (gate, mutate = () => {}) => {
    const data = gateData(gate)
    mutate(data)
    const ref = { ...write(`${gate}.json`, data), gateId: gate }
    const index = receipt.receiptRefs.findIndex(item => item.gateId === gate)
    if (index < 0) receipt.receiptRefs.push(ref)
    else receipt.receiptRefs[index] = ref
    if (gate === 'deployment') receipt.deploymentRef = { ...ref }
    return data
  }
  for (const gate of Object.keys(terminalGates)) replaceGate(gate)
  const fingerprintArtifact = write('fingerprint.bin', Buffer.from('DISPOSABLE FINGERPRINT CONTRACT TEST BYTES'))
  receipt.productionFingerprint = write('fingerprint.json', {
    schemaVersion: 'urai-life-model-production-fingerprint-v1', candidateSha: sha,
    componentEnvelopeSha256: componentHash, runtimeRevision: 'fixture-revision',
    project: 'fixture-project', service: 'fixture-service', observedAt: '2026-10-07T00:00:00Z',
    fingerprintSha256: fingerprintArtifact.sha256, artifactRef: fingerprintArtifact,
  })
  const sign = (mutate = () => {}, key = keys.privateKey) => {
    const approval = {
      schemaVersion: 'urai-life-model-independent-review-v1', repository: 'LifeLoggerAI/urai-spatial',
      candidateSha: receipt.candidateSha, componentEnvelopeSha256: receipt.componentEnvelopeSha256,
      receiptBundleSha256: receiptBundleHash(receipt), reviewerId: 'LimberNutz0', reviewerKind: 'independent-human',
      releaseAuthor: context.releaseAuthor, decision: 'APPROVED', reviewedAt: '2026-10-07T00:00:00Z', witness: 'ContractTestWitness',
    }
    mutate(approval)
    approval.signature = { format: 'ed25519', value: crypto.sign(null, reviewMessage(approval), key).toString('base64') }
    receipt.humanApprovalRefs = [write('approval.json', approval)]
    return approval
  }
  sign()
  return { directory, receipt, context, write, replaceGate, sign,
    validate: () => validateReleaseReceipt(receipt, context),
    close: () => fs.rmSync(directory, { recursive: true, force: true }) }
}
function withFixture(action) {
  const data = fixture()
  try { action(data) } finally { data.close() }
}
function rejects(data, pattern) {
  const result = data.validate()
  assert.equal(result.evidenceValidated, false)
  assert.match(result.errors.join('\n'), pattern)
}

test('retained evidence contract can validate with a test-only registered identity, without granting certification', () => withFixture(data => {
  assert.deepEqual(data.validate(), { errors: [], evidenceValidated: true })
  const file = path.join(data.directory, 'receipt.json')
  fs.writeFileSync(file, JSON.stringify(data.receipt))
  const cli = spawnSync(process.execPath, ['scripts/validate-life-model-release-receipt.mjs', file, '--strict'], {
    cwd: root, encoding: 'utf8', env: { ...process.env, GITHUB_SHA: sha, CANDIDATE_SHA: sha,
      COMPONENT_ENVELOPE_SHA256: data.context.componentHash, RELEASE_AUTHOR: data.context.releaseAuthor },
  })
  assert.equal(cli.status, 1)
  assert.match(cli.stderr, /trusted reviewer signature is invalid/)
  assert.doesNotMatch(cli.stdout, /CERTIFIED/)
}))

test('original arbitrary-reference bypass fails with and without --strict', () => withFixture(data => {
  data.receipt.receiptRefs = ['nonempty-fake-ref']
  data.receipt.humanApprovalRefs = ['nonempty-fake-human-ref']
  rejects(data, /retained evidence is required/)
  data.context.strict = false
  rejects(data, /retained evidence is required/)
}))

test('each of the 22 terminal gates needs distinct bound retained evidence', () => withFixture(data => {
  const refs = [...data.receipt.receiptRefs]
  for (const gate of Object.keys(terminalGates)) {
    data.receipt.receiptRefs = refs.filter(ref => ref.gateId !== gate)
    data.sign()
    rejects(data, new RegExp(`gate ${gate}: retained evidence is required`))
  }
}))

for (const [name, mutate, expected] of [
  ['wrong candidate', data => { data.candidateSha = 'b'.repeat(40) }, /candidate SHA mismatch/],
  ['wrong component', data => { data.componentEnvelopeSha256 = 'b'.repeat(64) }, /component envelope mismatch/],
  ['wrong gate', data => { data.gateId = 'privacy' }, /schema or gate binding mismatch/],
  ['wrong producer source SHA', data => { data.producer.sourceSha = 'b'.repeat(40) }, /producer repository\/source SHA/],
  ['ineligible producer', data => { data.producer.repository = 'LifeLoggerAI/urai-marketing' }, /producer repository\/source SHA/],
  ['missing runtime identity', data => { delete data.producer.runtimeRevision }, /execution identity\/provenance is missing/],
  ['synthetic evidence', data => { data.synthetic = true }, /diagnostic, synthetic or wrong evidence class/],
  ['candidate generation diagnostics', data => { data.candidateAcceptance = false }, /diagnostic, synthetic or wrong evidence class/],
  ['source-only evidence', data => { data.evidenceClass = 'source-contract' }, /diagnostic, synthetic or wrong evidence class/],
  ['missing artifacts', data => { data.artifactRefs = [] }, /real retained execution artifact refs are required/],
]) test(`rejects ${name} even when bad evidence bytes are rehashed and signed`, () => withFixture(data => {
  data.replaceGate('sourceIngestionE2E', mutate)
  data.sign()
  rejects(data, expected)
}))

test('captured engine diagnostic schemas cannot serve as terminal lifecycle acceptance', () => withFixture(data => {
  for (const schema of ['urai-camera-solve-v1', 'urai-reconstruction-training-v1', 'urai-source-reconstruction-review-v1',
    'captured-reality-camera-receipt-v1', 'captured-reality-training-receipt-v1', 'captured-reality-source-comparison-v1']) {
    data.replaceGate('capturedRealityBinding', item => { item.schemaVersion = schema; item.candidateAcceptance = false })
    data.sign()
    rejects(data, /schema or gate binding mismatch/)
  }
}))

test('retained hashes and byte counts are checked, including nested execution bytes', () => withFixture(data => {
  const ref = data.receipt.receiptRefs[0]
  const originalHash = ref.sha256
  ref.sha256 = '0'.repeat(64)
  data.sign()
  rejects(data, /retained SHA-256 mismatch/)
  ref.sha256 = originalHash
  ref.byteLength += 1
  data.sign()
  rejects(data, /retained byteLength mismatch/)
  ref.byteLength -= 1
  fs.appendFileSync(path.join(data.directory, 'execution.bin'), 'tampered')
  rejects(data, /artifact 0: retained (byteLength|SHA-256) mismatch/)
}))

test('missing files, path escapes and symlink escapes fail closed', () => withFixture(data => {
  const ref = data.receipt.receiptRefs[0]
  const original = ref.path
  for (const bad of ['missing.json', '../missing.json', '/tmp/missing.json', `../${path.basename(data.directory)}/${original}`]) {
    ref.path = bad; data.sign(); rejects(data, /retained bytes unavailable|structured retained/)
  }
  const external = fs.mkdtempSync(path.join(os.tmpdir(), 'urai-life-external-test-'))
  try {
    fs.copyFileSync(path.join(data.directory, original), path.join(external, 'copy.json'))
    fs.symlinkSync(path.join(external, 'copy.json'), path.join(data.directory, 'escape.json'))
    ref.path = 'escape.json'; data.sign(); rejects(data, /outside evidence root/)
  } finally { fs.rmSync(external, { recursive: true, force: true }) }
}))

test('invalid gate JSON cannot become evidence by updating its retained hash and reviewer bundle', () => withFixture(data => {
  const invalid = data.write('sourceIngestionE2E.json', Buffer.from('UNPARSEABLE PRIVATE CONTENT MUST NOT BE PRINTED'))
  data.receipt.receiptRefs[0] = { ...invalid, gateId: 'sourceIngestionE2E' }
  data.sign(); rejects(data, /retained JSON object is invalid/)
  assert.doesNotMatch(data.validate().errors.join('\n'), /UNPARSEABLE PRIVATE CONTENT/)
}))

test('component envelope actual bytes and canonical ordered repository hash are independently checked', () => withFixture(data => {
  const envelope = JSON.parse(fs.readFileSync(path.join(data.directory, 'component.json'), 'utf8'))
  envelope.repositories[0].sha = 'b'.repeat(40)
  data.receipt.componentEnvelopeRef = data.write('component.json', envelope)
  data.sign()
  rejects(data, /canonical repositories hash mismatch/)
  rejects(data, /Spatial candidate SHA mismatch/)
}))

test('duplicate and unknown gates cannot stand in for required evidence', () => withFixture(data => {
  data.receipt.receiptRefs.push({ ...data.receipt.receiptRefs[0] })
  data.sign(); rejects(data, /duplicate evidence reference/)
  data.receipt.receiptRefs.pop()
  data.receipt.receiptRefs.push({ ...data.receipt.receiptRefs[0], gateId: 'inventedGate' })
  data.sign(); rejects(data, /missing or unknown gate ID/)
}))

test('test bytes cannot self-promote by refreshing hashes after a reviewer signed', () => withFixture(data => {
  data.replaceGate('sourceIngestionE2E', item => { item.producer.executionId = 'new-run' })
  rejects(data, /exact evidence bundle hash mismatch/)
}))

for (const [name, mutate] of [
  ['unknown reviewer', approval => { approval.reviewerId = 'UnknownReviewer' }],
  ['machine reviewer', approval => { approval.reviewerKind = 'automation' }],
  ['missing witness', approval => { delete approval.witness }],
  ['reviewer as witness', approval => { approval.witness = approval.reviewerId }],
  ['wrong author', approval => { approval.releaseAuthor = 'OtherAuthor' }],
  ['missing timestamp', approval => { delete approval.reviewedAt }],
  ['wrong decision', approval => { approval.decision = 'PENDING' }],
]) test(`rejects ${name} despite a valid cryptographic signature`, () => withFixture(data => {
  data.sign(mutate); rejects(data, /ineligible reviewer, author or provenance/)
}))

test('reviewer cannot approve their own release declaration', () => withFixture(data => {
  data.context.releaseAuthor = 'LimberNutz0'
  data.sign(); rejects(data, /ineligible reviewer, author or provenance/)
}))

test('signature, signer trust, candidate, component and evidence bundle are all bound', () => withFixture(data => {
  data.sign(() => {}, crypto.generateKeyPairSync('ed25519').privateKey)
  rejects(data, /trusted reviewer signature is invalid/)
  data.sign(approval => { approval.candidateSha = 'b'.repeat(40) })
  rejects(data, /independent approval: candidate SHA mismatch/)
  data.sign(approval => { approval.componentEnvelopeSha256 = 'b'.repeat(64) })
  rejects(data, /independent approval: component envelope mismatch/)
  data.sign(); data.context.trustedReviewerKey = undefined
  rejects(data, /trusted reviewer signature is invalid or unavailable/)
}))

test('fingerprint binds real retained deployment and production runtime revision', () => withFixture(data => {
  data.replaceGate('productionReverification', item => { item.producer.runtimeRevision = 'wrong-revision' })
  data.sign(); rejects(data, /productionReverification runtime revision mismatch/)
  data.receipt.deploymentRef = { ...data.receipt.receiptRefs[0] }
  data.sign(); rejects(data, /must be the retained deployment gate reference/)
}))

test('production fingerprint cannot substitute an arbitrary hash for observed retained bytes', () => withFixture(data => {
  const fingerprint = JSON.parse(fs.readFileSync(path.join(data.directory, 'fingerprint.json'), 'utf8'))
  fingerprint.fingerprintSha256 = '0'.repeat(64)
  data.receipt.productionFingerprint = data.write('fingerprint.json', fingerprint)
  data.sign(); rejects(data, /observed bytes hash mismatch/)
  delete fingerprint.artifactRef
  data.receipt.productionFingerprint = data.write('fingerprint.json', fingerprint)
  data.sign(); rejects(data, /production fingerprint artifact: structured retained/)
}))

test('terminal evidence cannot choose its own external candidate/component/author authority', () => withFixture(data => {
  for (const key of ['expectedSha', 'componentHash', 'releaseAuthor']) {
    const original = data.context[key]; delete data.context[key]
    rejects(data, /requires exact|requires external/)
    data.context[key] = original
  }
}))

test('a partial terminal gate also requires proof when certified is false and strict is off', () => withFixture(data => {
  data.receipt.certified = false; data.context.strict = false
  data.receipt.gates = Object.fromEntries(Object.keys(terminalGates).map(gate => [gate, gate === 'sourceIngestionE2E' ? 'ACCEPTED' : 'PENDING']))
  data.receipt.receiptRefs = []; data.receipt.humanApprovalRefs = []
  rejects(data, /gate sourceIngestionE2E: retained evidence is required/)
}))

test('trusted registered SSH identity parses, unrelated key formats fail closed', () => {
  const key = fs.readFileSync(path.join(root, 'docs/release-governance/reviewers/LimberNutz0-public.ssh'))
  assert.equal(reviewerKeyFromSsh(key).asymmetricKeyType, 'ed25519')
  assert.throws(() => reviewerKeyFromSsh(Buffer.from('ssh-rsa invalid')), /ssh-ed25519/)
})
