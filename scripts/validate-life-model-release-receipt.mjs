import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const repository = 'LifeLoggerAI/urai-spatial'
const shaPattern = /^[0-9a-f]{40}$/
const hashPattern = /^[0-9a-f]{64}$/
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const text = value => typeof value === 'string' && value.trim().length > 0 && !/[\r\n]/.test(value)
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex')

export const terminalGates = Object.freeze({
  sourceIngestionE2E: 'ACCEPTED',
  lifeCausalGraph: 'ACCEPTED',
  personWorldCompilation: 'ACCEPTED',
  replayBinding: 'ACCEPTED',
  lifeMovieBinding: 'ACCEPTED',
  capturedRealityBinding: 'ACCEPTED',
  personPresence: 'ACCEPTED',
  syntheticMemoryFirewall: 'ACCEPTED',
  correctionPropagation: 'ACCEPTED',
  consentRevocation: 'ACCEPTED',
  exportDeletion: 'ACCEPTED',
  privacy: 'ACCEPTED',
  security: 'ACCEPTED',
  accessibility: 'ACCEPTED',
  localization: 'ACCEPTED',
  device: 'ACCEPTED',
  xr: 'ACCEPTED',
  literalQuality: 'ACCEPTED',
  identityAcceptance: 'ACCEPTED',
  independentApproval: 'APPROVED',
  deployment: 'DEPLOYED_EXACT_SHA',
  productionReverification: 'ACCEPTED',
})

// Eligible source producers do not assert that a runtime executed.
const producers = {
  sourceIngestionE2E: ['urai-jobs', 'urai-spatial'],
  lifeCausalGraph: ['urai-jobs', 'urai-spatial'],
  personWorldCompilation: ['urai-jobs', 'urai-spatial'],
  replayBinding: ['urai-spatial'],
  lifeMovieBinding: ['urai-studio', 'urai-jobs', 'urai-spatial'],
  capturedRealityBinding: ['urai-jobs', 'urai-spatial'],
  personPresence: ['urai-spatial', 'urai-communications'],
  syntheticMemoryFirewall: ['urai-spatial', 'urai-privacy', 'urai-jobs'],
  correctionPropagation: ['urai-spatial', 'urai-privacy', 'urai-jobs'],
  consentRevocation: ['urai-privacy', 'urai-spatial', 'urai-jobs'],
  exportDeletion: ['urai-privacy', 'urai-spatial', 'urai-jobs'],
  privacy: ['urai-privacy', 'urai-spatial', 'urai-staging'],
  security: ['urai-spatial', 'urai-privacy', 'urai-staging'],
  accessibility: ['urai-spatial', 'urai-staging'],
  localization: ['urai-spatial', 'urai-communications', 'urai-staging'],
  device: ['urai-spatial', 'urai-staging'],
  xr: ['urai-spatial', 'urai-staging'],
  literalQuality: ['urai-spatial', 'urai-studio', 'asset-factory'],
  identityAcceptance: ['urai-spatial', 'urai-studio', 'urai-jobs'],
  independentApproval: ['urai-spatial'],
  deployment: ['urai-spatial', 'urai-staging'],
  productionReverification: ['urai-spatial', 'urai-staging'],
}
const privateGates = new Set([
  'sourceIngestionE2E', 'lifeCausalGraph', 'personWorldCompilation', 'replayBinding',
  'lifeMovieBinding', 'capturedRealityBinding', 'personPresence', 'syntheticMemoryFirewall',
  'correctionPropagation', 'consentRevocation', 'exportDeletion', 'privacy', 'security',
])
export function evidenceClassFor(gate) {
  if (privateGates.has(gate)) return 'private-lifecycle'
  return ({ device: 'physical-device', xr: 'physical-xr', literalQuality: 'owner-review',
    identityAcceptance: 'owner-review', independentApproval: 'signed-independent-review',
    deployment: 'protected-deployment', productionReverification: 'protected-production' })[gate] || 'protected-runtime'
}

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (object(value)) return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`
  return JSON.stringify(value)
}

// Exclude only signature references to avoid a circular digest. All gate evidence,
// retained artifact hashes, deployment, fingerprint and component refs stay bound.
export function receiptBundleHash(receipt) {
  const { humanApprovalRefs, ...bundle } = receipt
  return hash(canonicalJson(bundle))
}

export function reviewMessage(approval) {
  return Buffer.from([
    'URAI-LIFE-MODEL-RECEIPT-REVIEW-V1',
    `repository=${approval.repository}`,
    `exact_sha=${approval.candidateSha}`,
    `component_envelope_sha256=${approval.componentEnvelopeSha256}`,
    `receipt_bundle_sha256=${approval.receiptBundleSha256}`,
    `reviewer=${approval.reviewerId}`,
    `reviewer_kind=${approval.reviewerKind}`,
    `release_author=${approval.releaseAuthor}`,
    `decision=${approval.decision}`,
    `reviewed_at=${approval.reviewedAt}`,
    `witness=${approval.witness}`,
    '',
  ].join('\n'))
}

export function reviewerKeyFromSsh(bytes) {
  const fields = bytes.toString('utf8').trim().split(/\s+/)
  if (fields[0] !== 'ssh-ed25519') throw new Error('trusted reviewer key must be ssh-ed25519')
  const encoded = Buffer.from(fields[1] || '', 'base64')
  if (encoded.length !== 51 || encoded.readUInt32BE(0) !== 11 || encoded.subarray(4, 15).toString() !== 'ssh-ed25519'
      || encoded.readUInt32BE(15) !== 32) throw new Error('invalid trusted reviewer key')
  return crypto.createPublicKey({ key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), encoded.subarray(19)]), format: 'der', type: 'spki' })
}

export function validateReleaseReceipt(receipt, context) {
  const errors = []
  const fail = message => errors.push(message)
  if (!object(receipt)) return { errors: ['release receipt must be an object'], evidenceValidated: false }
  if (receipt.schemaVersion !== 'urai-life-model-release-receipt-v1') fail('unsupported release receipt schema')
  if (typeof receipt.certified !== 'boolean') fail('certified must be a boolean declaration')
  for (const gate of Object.keys(terminalGates)) {
    if (!text(receipt.gates?.[gate])) fail(`missing gate: ${gate}`)
  }
  if (!Array.isArray(receipt.receiptRefs) || !Array.isArray(receipt.humanApprovalRefs)) fail('receipt references are invalid')

  const claimedGates = Object.keys(terminalGates).filter(gate => receipt.gates?.[gate] === terminalGates[gate])
  const requireAll = context.strict || receipt.certified === true
  if (!requireAll && !claimedGates.length) return { errors, evidenceValidated: false }
  const requiredGates = requireAll ? Object.keys(terminalGates) : claimedGates
  if (!shaPattern.test(context.expectedSha || '')) fail('evidence validation requires exact GITHUB_SHA/CANDIDATE_SHA')
  if (receipt.candidateSha !== context.expectedSha) fail('receipt candidate SHA does not match exact validated SHA')
  if (!hashPattern.test(context.componentHash || '')) fail('evidence validation requires external COMPONENT_ENVELOPE_SHA256')
  if (receipt.componentEnvelopeSha256 !== context.componentHash) fail('receipt component envelope does not match external component hash')
  if (!text(context.releaseAuthor)) fail('evidence validation requires external RELEASE_AUTHOR')
  if (requireAll) {
    if (receipt.certified !== true) fail('strict terminal receipt validation requires certified=true declaration; this is not certification')
    for (const [gate, expected] of Object.entries(terminalGates)) {
      if (receipt.gates?.[gate] !== expected) fail(`gate ${gate} is ${receipt.gates?.[gate] ?? 'missing'}; expected ${expected}`)
    }
  }

  const root = fs.realpathSync(context.evidenceRoot)
  function retained(ref, label, readJson = false) {
    if (!object(ref) || !text(ref.path) || path.isAbsolute(ref.path) || !hashPattern.test(ref.sha256 || '')
        || ref.path.split(/[\\/]/).includes('..')
        || !Number.isSafeInteger(ref.byteLength) || ref.byteLength <= 0) {
      fail(`${label}: structured retained path, SHA-256 and positive byteLength are required`)
      return null
    }
    try {
      const file = fs.realpathSync(path.resolve(root, ref.path))
      const relative = path.relative(root, file)
      if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error('outside evidence root')
      const stat = fs.statSync(file)
      if (!stat.isFile()) throw new Error('not a retained file')
      if (stat.size !== ref.byteLength) { fail(`${label}: retained byteLength mismatch`); return null }
      if (readJson) {
        if (stat.size > 16 * 1024 * 1024) { fail(`${label}: retained JSON exceeds 16 MiB`); return null }
        const bytes = fs.readFileSync(file)
        if (bytes.length !== ref.byteLength || hash(bytes) !== ref.sha256) fail(`${label}: retained SHA-256 mismatch`)
        return bytes
      }
      const fd = fs.openSync(file, 'r')
      const buffer = Buffer.alloc(64 * 1024)
      const digest = crypto.createHash('sha256')
      let count = 0
      try {
        for (let read; (read = fs.readSync(fd, buffer)) > 0;) { count += read; digest.update(buffer.subarray(0, read)) }
      } finally { fs.closeSync(fd) }
      const sha256 = digest.digest('hex')
      if (count !== ref.byteLength) fail(`${label}: retained byteLength mismatch`)
      if (sha256 !== ref.sha256) fail(`${label}: retained SHA-256 mismatch`)
      return { sha256, byteLength: count }
    } catch { fail(`${label}: retained bytes unavailable or outside evidence root`); return null }
  }
  function jsonRef(ref, label) {
    const bytes = retained(ref, label, true)
    if (!bytes) return null
    try {
      const data = JSON.parse(bytes.toString('utf8'))
      if (!object(data)) throw new Error('not object')
      return data
    } catch { fail(`${label}: retained JSON object is invalid`); return null }
  }
  function binding(data, label) {
    if (data.candidateSha !== context.expectedSha) fail(`${label}: candidate SHA mismatch`)
    if (data.componentEnvelopeSha256 !== context.componentHash) fail(`${label}: component envelope mismatch`)
  }

  const components = new Map()
  const envelope = jsonRef(receipt.componentEnvelopeRef, 'component envelope')
  if (envelope) {
    if (envelope.schemaVersion !== 'urai-system-candidate-v1' || !Array.isArray(envelope.repositories) || !envelope.repositories.length) {
      fail('component envelope: unsupported schema or missing repositories')
    } else {
      const calculated = hash(canonicalJson(envelope.repositories))
      if (calculated !== context.componentHash || envelope.componentHash !== calculated) fail('component envelope: canonical repositories hash mismatch')
      for (const component of envelope.repositories) {
        if (!object(component) || !text(component.repo) || !shaPattern.test(component.sha || '') || components.has(component.repo)) {
          fail('component envelope: invalid or duplicate producer entry')
        } else components.set(component.repo, component.sha)
      }
      if (components.get(repository) !== context.expectedSha) fail('component envelope: Spatial candidate SHA mismatch')
    }
  }

  const refs = Array.isArray(receipt.receiptRefs) ? receipt.receiptRefs : []
  const gateEvidence = new Map()
  for (const ref of refs) {
    if (!object(ref) || !Object.hasOwn(terminalGates, ref.gateId)) { fail('gate evidence: missing or unknown gate ID'); continue }
    if (gateEvidence.has(ref.gateId)) { fail(`gate ${ref.gateId}: duplicate evidence reference`); continue }
    const data = jsonRef(ref, `gate ${ref.gateId}`)
    gateEvidence.set(ref.gateId, data)
    if (!data) continue
    if (data.schemaVersion !== 'urai-life-model-gate-evidence-v1' || data.gateId !== ref.gateId) fail(`gate ${ref.gateId}: schema or gate binding mismatch`)
    binding(data, `gate ${ref.gateId}`)
    if (data.result !== terminalGates[ref.gateId]) fail(`gate ${ref.gateId}: evidence result is not terminal`)
    if (data.evidenceClass !== evidenceClassFor(ref.gateId) || data.synthetic !== false || data.candidateAcceptance !== true) {
      fail(`gate ${ref.gateId}: diagnostic, synthetic or wrong evidence class cannot satisfy acceptance`)
    }
    const producer = data.producer
    if (!object(producer) || !producers[ref.gateId].some(name => producer.repository === `LifeLoggerAI/${name}`)
        || components.get(producer.repository) !== producer.sourceSha || !shaPattern.test(producer.sourceSha || '')) {
      fail(`gate ${ref.gateId}: producer repository/source SHA does not match eligible component`)
    }
    if (!object(producer) || !['identity', 'runtimeRevision', 'executionId', 'executionUri'].every(key => text(producer[key]))) {
      fail(`gate ${ref.gateId}: producer execution identity/provenance is missing`)
    }
    if (!Array.isArray(data.artifactRefs) || !data.artifactRefs.length) fail(`gate ${ref.gateId}: real retained execution artifact refs are required`)
    else for (const [index, artifact] of data.artifactRefs.entries()) retained(artifact, `gate ${ref.gateId} artifact ${index}`)
  }
  for (const gate of requiredGates) if (!gateEvidence.get(gate)) fail(`gate ${gate}: retained evidence is required`)

  if (requiredGates.includes('deployment') || requiredGates.includes('productionReverification')) {
    const deployment = jsonRef(receipt.deploymentRef, 'deployment reference')
    if (deployment) {
      binding(deployment, 'deployment reference')
      if (deployment.gateId !== 'deployment' || deployment.result !== 'DEPLOYED_EXACT_SHA'
          || canonicalJson(receipt.deploymentRef) !== canonicalJson(refs.find(ref => ref?.gateId === 'deployment'))) fail('deployment reference: must be the retained deployment gate reference')
    }
    const fingerprint = jsonRef(receipt.productionFingerprint, 'production fingerprint')
    if (fingerprint) {
      binding(fingerprint, 'production fingerprint')
      if (fingerprint.schemaVersion !== 'urai-life-model-production-fingerprint-v1' || !text(fingerprint.runtimeRevision)
          || !text(fingerprint.project) || !text(fingerprint.service) || !text(fingerprint.observedAt)
          || !hashPattern.test(fingerprint.fingerprintSha256 || '')) fail('production fingerprint: identity is incomplete')
      const fingerprintFixity = retained(fingerprint.artifactRef, 'production fingerprint artifact')
      if (fingerprintFixity && fingerprintFixity.sha256 !== fingerprint.fingerprintSha256) fail('production fingerprint: observed bytes hash mismatch')
      for (const gate of ['deployment', 'productionReverification']) {
        if (gateEvidence.get(gate)?.producer?.runtimeRevision !== fingerprint.runtimeRevision) fail(`production fingerprint: ${gate} runtime revision mismatch`)
      }
    }
  }

  const approvals = Array.isArray(receipt.humanApprovalRefs) ? receipt.humanApprovalRefs : []
  if (!approvals.length) fail('terminal evidence requires retained signed independent approval refs')
  for (const ref of approvals) {
    const approval = jsonRef(ref, 'independent approval')
    if (!approval) continue
    binding(approval, 'independent approval')
    if (approval.schemaVersion !== 'urai-life-model-independent-review-v1' || approval.repository !== repository
        || approval.reviewerId !== 'LimberNutz0' || approval.reviewerKind !== 'independent-human'
        || approval.releaseAuthor !== context.releaseAuthor || approval.reviewerId === context.releaseAuthor
        || approval.decision !== 'APPROVED' || !text(approval.witness) || approval.witness === approval.reviewerId
        || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(approval.reviewedAt || '')
        || !Number.isFinite(Date.parse(approval.reviewedAt))) fail('independent approval: ineligible reviewer, author or provenance')
    if (approval.receiptBundleSha256 !== receiptBundleHash(receipt)) fail('independent approval: exact evidence bundle hash mismatch')
    try {
      const signature = approval.signature
      if (!object(signature) || signature.format !== 'ed25519' || !/^[A-Za-z0-9+/]{86}==$/.test(signature.value || '')
          || !context.trustedReviewerKey || !crypto.verify(null, reviewMessage(approval), context.trustedReviewerKey, Buffer.from(signature.value, 'base64'))) {
        throw new Error('signature not verified')
      }
    } catch { fail('independent approval: trusted reviewer signature is invalid or unavailable') }
  }
  return { errors, evidenceValidated: errors.length === 0 }
}

export function main(args = process.argv.slice(2), env = process.env) {
  const unknownFlags = args.filter(arg => arg.startsWith('--') && arg !== '--strict')
  const paths = args.filter(arg => !arg.startsWith('--'))
  if (unknownFlags.length || paths.length > 1 || args.filter(arg => arg === '--strict').length > 1) {
    console.error('[FAIL] Usage: validate-life-model-release-receipt.mjs [receipt-path] [--strict]')
    return 1
  }
  try {
    const receiptPath = path.resolve(paths[0] || 'operations/life-model/release-receipt-v1.json')
    let trustedReviewerKey
    try {
      trustedReviewerKey = reviewerKeyFromSsh(fs.readFileSync(new URL('../docs/release-governance/reviewers/LimberNutz0-public.ssh', import.meta.url)))
    } catch { /* Missing trusted identity fails whenever terminal evidence is claimed. */ }
    const result = validateReleaseReceipt(JSON.parse(fs.readFileSync(receiptPath, 'utf8')), {
      strict: args.includes('--strict'), evidenceRoot: path.dirname(receiptPath),
      expectedSha: env.GITHUB_SHA || env.CANDIDATE_SHA || '', componentHash: env.COMPONENT_ENVELOPE_SHA256 || '',
      releaseAuthor: env.RELEASE_AUTHOR || '', trustedReviewerKey,
    })
    if (env.GITHUB_SHA && env.CANDIDATE_SHA && env.GITHUB_SHA !== env.CANDIDATE_SHA) result.errors.push('GITHUB_SHA and CANDIDATE_SHA disagree')
    for (const error of result.errors) console.error(`[FAIL] ${error}`)
    if (result.errors.length) return 1
    console.log(`[PASS] LIFE_MODEL_RELEASE_RECEIPT_CONTRACT${result.evidenceValidated ? '_WITH_RETAINED_EVIDENCE' : ''}`)
    console.log('[SCOPE] Receipt bytes, bindings and reviewer signature only; runtime truth and release certification require separate governed acceptance.')
    return 0
  } catch { console.error('[FAIL] release receipt is unreadable or invalid'); return 1 }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main()
