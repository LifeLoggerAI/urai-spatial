#!/usr/bin/env node
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Reserve 1 MiB for the native ZIP wrapper around each individually uploaded part.
export const PART_BYTES = 23 * 1024 * 1024
export const ARTIFACT_BYTES = 24 * 1024 * 1024
export const MAX_PARTS = 8
export const REPOSITORY = 'LifeLoggerAI/urai-spatial'
const SCHEMA = 'urai-visual-proof-transport-v1'
const GROUPS = ['visual', 'desktop', 'mobile', 'portal-fallback', 'accessibility-performance']
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const requireValue = (ok, message) => { if (!ok) throw new Error(message) }
const digest = value => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value)
const positiveId = value => typeof value === 'string' && /^[1-9][0-9]{0,15}$/.test(value)
const archiveName = binding => binding.proofGroup === 'accessibility-performance' ? 'accessibility-performance.zip' : 'visual-proof.zip'
const originalArtifactName = binding => binding.proofGroup === 'accessibility-performance'
  ? `accessibility-performance-evidence-${binding.sourceSha}`
  : `continuous-spatial-visual-proof-${binding.proofGroup}-${binding.sourceSha}`
const partName = (index, binding) => `${archiveName(binding)}.part-${String(index).padStart(2, '0')}`
const prefix = binding => binding.proofGroup === 'accessibility-performance'
  ? `accessibility-performance-transport-${binding.sourceSha}-${binding.runId}-${binding.runAttempt}`
  : `continuous-spatial-visual-transport-${binding.proofGroup}-${binding.sourceSha}-${binding.runId}-${binding.runAttempt}`

function validateBinding(binding) {
  requireValue(binding?.repository === REPOSITORY, 'Unexpected evidence repository')
  requireValue(/^[0-9a-f]{40}$/.test(binding.sourceSha || ''), 'Exact source SHA required')
  requireValue(GROUPS.includes(binding.proofGroup), 'Unknown visual proof group')
  requireValue(positiveId(binding.runId) && positiveId(binding.runAttempt) && positiveId(binding.artifactId), 'Native run/attempt/artifact identities required')
  requireValue(digest(binding.archiveSha256), 'Expected native archive digest required')
}

export function validateManifest(manifest, expected) {
  validateBinding(expected)
  requireValue(manifest?.schemaVersion === SCHEMA && manifest.validationScope === 'archive-transport-only', 'Unsupported transport manifest')
  validateBinding(manifest)
  for (const key of ['repository', 'sourceSha', 'proofGroup', 'runId', 'runAttempt', 'artifactId', 'archiveSha256']) {
    requireValue(manifest[key] === expected[key], `Archive binding mismatch: ${key}`)
  }
  requireValue(manifest.originalArtifactName === originalArtifactName(manifest), 'Original artifact name mismatch')
  requireValue(manifest.archiveName === archiveName(manifest) && manifest.partBytes === PART_BYTES, 'Archive partition format mismatch')
  requireValue(Number.isSafeInteger(manifest.archiveBytes) && manifest.archiveBytes > 0 && manifest.archiveBytes <= PART_BYTES * MAX_PARTS, 'Archive exceeds bounded transport size')
  const count = Math.ceil(manifest.archiveBytes / PART_BYTES)
  requireValue(manifest.partCount === count && Array.isArray(manifest.parts) && manifest.parts.length === count, 'Missing or extra archive parts')
  for (const [offset, part] of manifest.parts.entries()) {
    const index = offset + 1
    const bytes = Math.min(PART_BYTES, manifest.archiveBytes - offset * PART_BYTES)
    requireValue(part?.index === index && part.name === partName(index, manifest), 'Archive part order/name mismatch')
    requireValue(part.bytes === bytes && digest(part.sha256), 'Invalid archive part size/digest')
    requireValue(part.artifactName === `${prefix(manifest)}-part-${String(index).padStart(2, '0')}`, 'Native part artifact name mismatch')
  }
  requireValue(manifest.manifestArtifactName === `${prefix(manifest)}-manifest`, 'Native manifest artifact name mismatch')
  return manifest
}

function readExact(fd, bytes) {
  const result = Buffer.allocUnsafe(bytes)
  let offset = 0
  while (offset < bytes) {
    const count = fs.readSync(fd, result, offset, bytes - offset, null)
    requireValue(count > 0, 'Archive or part was truncated')
    offset += count
  }
  return result
}

export function splitArchive({ archivePath, outputDirectory, binding }) {
  validateBinding(binding)
  let fd
  let created = false
  try {
    fd = fs.openSync(archivePath, 'r')
    const before = fs.fstatSync(fd)
    requireValue(before.isFile() && before.size > 0 && before.size <= PART_BYTES * MAX_PARTS, 'Archive exceeds bounded transport size')
    fs.mkdirSync(outputDirectory) // Never replace an existing candidate's transport.
    created = true
    const manifest = {
      schemaVersion: SCHEMA, validationScope: 'archive-transport-only', ...binding,
      originalArtifactName: originalArtifactName(binding),
      archiveName: archiveName(binding), archiveBytes: before.size, partBytes: PART_BYTES,
      partCount: Math.ceil(before.size / PART_BYTES), manifestArtifactName: `${prefix(binding)}-manifest`, parts: [],
    }
    const whole = createHash('sha256')
    for (let index = 1; index <= manifest.partCount; index++) {
      const bytes = readExact(fd, Math.min(PART_BYTES, before.size - (index - 1) * PART_BYTES))
      if (index === 1) requireValue(bytes.length >= 4 && bytes.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])), 'Original native ZIP header missing')
      whole.update(bytes)
      const name = partName(index, binding)
      fs.writeFileSync(path.join(outputDirectory, name), bytes, { flag: 'wx' })
      manifest.parts.push({ index, name, bytes: bytes.length, sha256: sha(bytes), artifactName: `${prefix(binding)}-part-${String(index).padStart(2, '0')}` })
    }
    const after = fs.fstatSync(fd)
    requireValue(after.size === before.size && after.mtimeMs === before.mtimeMs && fs.readSync(fd, Buffer.alloc(1), 0, 1, null) === 0, 'Source archive changed while partitioning')
    requireValue(whole.digest('hex') === binding.archiveSha256, 'Original native archive digest mismatch')
    validateManifest(manifest, binding)
    fs.writeFileSync(path.join(outputDirectory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' })
    return manifest
  } catch (error) {
    if (created) fs.rmSync(outputDirectory, { recursive: true, force: true })
    throw error
  } finally {
    if (fd !== undefined) fs.closeSync(fd)
  }
}

export function reconstructArchive({ manifestPath, partPaths, outputPath, expected }) {
  requireValue(fs.statSync(manifestPath).size <= 64 * 1024, 'Manifest exceeds bounded size')
  const manifest = validateManifest(JSON.parse(fs.readFileSync(manifestPath, 'utf8')), expected)
  requireValue(Array.isArray(partPaths) && partPaths.length === manifest.partCount && new Set(partPaths.map(file => path.resolve(file))).size === partPaths.length, 'Missing, extra, or duplicate part paths')
  for (const [index, file] of partPaths.entries()) requireValue(path.basename(file) === manifest.parts[index].name, 'Supplied archive parts are reordered')
  let output
  let created = false
  try {
    output = fs.openSync(outputPath, 'wx')
    created = true
    const whole = createHash('sha256')
    for (const [index, file] of partPaths.entries()) {
      const part = manifest.parts[index]
      const fd = fs.openSync(file, 'r')
      try {
        requireValue(fs.fstatSync(fd).isFile() && fs.fstatSync(fd).size === part.bytes, 'Archive part byte count mismatch')
        const bytes = readExact(fd, part.bytes)
        requireValue(fs.readSync(fd, Buffer.alloc(1), 0, 1, null) === 0 && sha(bytes) === part.sha256, 'Archive part digest mismatch')
        whole.update(bytes)
        fs.writeFileSync(output, bytes)
      } finally { fs.closeSync(fd) }
    }
    requireValue(fs.fstatSync(output).size === manifest.archiveBytes && whole.digest('hex') === expected.archiveSha256, 'Reassembled native archive digest/size mismatch')
    return { archiveBytes: manifest.archiveBytes, archiveSha256: manifest.archiveSha256 }
  } catch (error) {
    if (created) fs.rmSync(outputPath, { force: true })
    throw error
  } finally { if (output !== undefined) fs.closeSync(output) }
}

function nativeBinding(env) {
  const binding = { repository: env.GITHUB_REPOSITORY, sourceSha: env.URAI_EXACT_HEAD, proofGroup: env.URAI_PROOF_GROUP,
    runId: env.GITHUB_RUN_ID, runAttempt: env.GITHUB_RUN_ATTEMPT, artifactId: env.URAI_ORIGINAL_ARTIFACT_ID, archiveSha256: env.URAI_ORIGINAL_ARTIFACT_DIGEST }
  validateBinding(binding)
  requireValue(typeof env.GITHUB_TOKEN === 'string' && env.GITHUB_TOKEN.length > 0, 'Native read-only Actions token required')
  return binding
}

async function githubRequest(endpoint, token, fetchImpl) {
  const response = await fetchImpl(`https://api.github.com/repos/${REPOSITORY}/actions/artifacts/${endpoint}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
    redirect: 'manual', signal: AbortSignal.timeout(60_000),
  })
  return response
}

export function validateNativeArtifact(metadata, binding, { id, name, archiveDigest, maxBytes = PART_BYTES * MAX_PARTS }) {
  requireValue(positiveId(id) && digest(archiveDigest), 'Native uploaded artifact identity/digest missing')
  requireValue(String(metadata?.id) === id && metadata.name === name && metadata.expired === false, 'Native uploaded artifact identity/name/expiry mismatch')
  requireValue(String(metadata.workflow_run?.id) === binding.runId, 'Native artifact belongs to another run')
  requireValue(metadata.digest === `sha256:${archiveDigest}`, 'Native uploaded artifact digest mismatch')
  requireValue(Number.isSafeInteger(metadata.size_in_bytes) && metadata.size_in_bytes > 0 && metadata.size_in_bytes <= maxBytes, 'Native artifact exceeds transport byte limit')
  return metadata
}

async function getArtifact(binding, spec, token, fetchImpl) {
  requireValue(positiveId(spec.id) && digest(spec.archiveDigest), 'Native uploaded artifact identity/digest missing')
  const response = await githubRequest(spec.id, token, fetchImpl)
  requireValue(response.status === 200, `Native artifact metadata unavailable (HTTP ${response.status})`)
  return validateNativeArtifact(await response.json(), binding, spec)
}

export async function prepareNativeArchive({ outputDirectory, env = process.env, fetchImpl = fetch }) {
  const binding = nativeBinding(env)
  const metadata = await getArtifact(binding, { id: binding.artifactId, name: originalArtifactName(binding), archiveDigest: binding.archiveSha256 }, env.GITHUB_TOKEN, fetchImpl)
  const response = await githubRequest(`${binding.artifactId}/zip`, env.GITHUB_TOKEN, fetchImpl)
  requireValue(response.status === 302, `Native archive redirect unavailable (HTTP ${response.status})`)
  const location = new URL(response.headers.get('location'))
  requireValue(location.protocol === 'https:' && !location.username && !location.password && location.hostname !== 'api.github.com', 'Unsafe native archive redirect')
  // Signed archive URLs receive no repository token and cannot redirect again.
  const archive = await fetchImpl(location.href, { redirect: 'error', signal: AbortSignal.timeout(120_000) })
  requireValue(archive.status === 200 && archive.body, `Native archive download unavailable (HTTP ${archive.status})`)
  const temporaryPath = `${outputDirectory}.original.zip`
  let fd
  let created = false
  try {
    fd = fs.openSync(temporaryPath, 'wx')
    created = true
    const whole = createHash('sha256')
    let bytes = 0
    for await (const chunk of archive.body) {
      bytes += chunk.length
      requireValue(bytes <= metadata.size_in_bytes && bytes <= PART_BYTES * MAX_PARTS, 'Native archive exceeds declared byte count')
      whole.update(chunk)
      fs.writeFileSync(fd, chunk)
    }
    requireValue(bytes === metadata.size_in_bytes && whole.digest('hex') === binding.archiveSha256, 'Downloaded native archive bytes/digest mismatch')
    fs.closeSync(fd)
    fd = undefined
    return splitArchive({ archivePath: temporaryPath, outputDirectory, binding })
  } finally {
    if (fd !== undefined) fs.closeSync(fd)
    if (created) fs.rmSync(temporaryPath, { force: true })
  }
}

export async function verifyNativeUploads({ manifestPath, outputPath, env = process.env, fetchImpl = fetch }) {
  const binding = nativeBinding(env)
  requireValue(fs.statSync(manifestPath).size <= 64 * 1024, 'Manifest exceeds bounded size')
  const manifest = validateManifest(JSON.parse(fs.readFileSync(manifestPath, 'utf8')), binding)
  const artifacts = []
  const specs = [{ id: env.URAI_MANIFEST_ID, name: manifest.manifestArtifactName, archiveDigest: env.URAI_MANIFEST_DIGEST, maxBytes: ARTIFACT_BYTES }]
  for (let index = 1; index <= MAX_PARTS; index++) {
    const suffix = String(index).padStart(2, '0')
    if (index <= manifest.partCount) specs.push({ id: env[`URAI_PART_${suffix}_ID`], name: manifest.parts[index - 1].artifactName, archiveDigest: env[`URAI_PART_${suffix}_DIGEST`], maxBytes: ARTIFACT_BYTES })
    else requireValue(!env[`URAI_PART_${suffix}_ID`] && !env[`URAI_PART_${suffix}_DIGEST`], 'Unexpected extra native part upload')
  }
  requireValue(new Set(specs.map(spec => spec.id)).size === specs.length, 'Duplicate native artifact identities')
  for (const spec of specs) {
    const metadata = await getArtifact(binding, spec, env.GITHUB_TOKEN, fetchImpl)
    artifacts.push({ artifactId: spec.id, name: spec.name, archiveBytes: metadata.size_in_bytes, archiveSha256: spec.archiveDigest })
  }
  const receipt = { schemaVersion: 'urai-visual-proof-upload-receipt-v1', validationScope: 'archive-transport-only', ...binding, partCount: manifest.partCount, artifactByteLimit: ARTIFACT_BYTES, artifacts }
  fs.writeFileSync(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, { flag: 'wx' })
  return receipt
}

function options(args, allowed) {
  const result = { part: [] }
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index]?.replace(/^--/, '')
    requireValue(args[index]?.startsWith('--') && allowed.includes(key) && args[index + 1] && !args[index + 1].startsWith('--'), 'Unknown or incomplete transport argument')
    if (key === 'part') result.part.push(args[index + 1])
    else { requireValue(result[key] === undefined, 'Duplicate transport argument'); result[key] = args[index + 1] }
  }
  return result
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [command, ...args] = process.argv.slice(2)
    if (command === 'prepare-native') {
      const opts = options(args, ['output'])
      requireValue(opts.output, 'Output directory required')
      const manifest = await prepareNativeArchive({ outputDirectory: opts.output })
      if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `part_count=${manifest.partCount}\n`)
      console.log(`Native visual archive partitioned: ${manifest.partCount} parts, ${manifest.archiveBytes} bytes; transport scope only`)
    } else if (command === 'verify-native-uploads') {
      const opts = options(args, ['manifest', 'output'])
      requireValue(opts.manifest && opts.output, 'Manifest and receipt output required')
      await verifyNativeUploads({ manifestPath: opts.manifest, outputPath: opts.output })
      console.log('Native visual part and manifest artifacts verified within 24 MiB each; transport scope only')
    } else if (command === 'reconstruct') {
      const opts = options(args, ['manifest', 'output', 'source-sha', 'archive-sha256', 'group', 'run-id', 'run-attempt', 'artifact-id', 'part'])
      requireValue(opts.manifest && opts.output, 'Manifest and archive output required')
      reconstructArchive({ manifestPath: opts.manifest, partPaths: opts.part, outputPath: opts.output, expected: { repository: REPOSITORY, sourceSha: opts['source-sha'], archiveSha256: opts['archive-sha256'], proofGroup: opts.group, runId: opts['run-id'], runAttempt: opts['run-attempt'], artifactId: opts['artifact-id'] } })
      console.log('Original native visual archive reassembled and digest verified; transport scope only')
    } else throw new Error('Expected prepare-native, verify-native-uploads, or reconstruct')
  } catch (error) {
    // Avoid rendering signed storage URLs, credentials, or fetch error internals.
    console.error(`VISUAL_TRANSPORT_FAILED: ${error instanceof TypeError ? 'Invalid transport input or network response' : error.message}`)
    process.exitCode = 1
  }
}
