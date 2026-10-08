#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { lstatSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join, posix, resolve } from 'node:path'

const path = process.env.URAI_RELEASE_FINGERPRINT_PATH || 'urai-tier1/out/release-fingerprint.json'
const expectedSha = (process.env.URAI_EXPECTED_DEPLOYED_SHA || '').trim()
const expectedRollbackSha = (process.env.URAI_EXPECTED_ROLLBACK_SHA || '').trim()
const expectedAuthoritySha = (process.env.URAI_EXPECTED_AUTHORITY_SHA || '').trim()
const expectedFunctionsTreeSha = (process.env.URAI_EXPECTED_FUNCTIONS_TREE_SHA || '').trim()
const expectedStaticConfigSha256 = (process.env.URAI_EXPECTED_STATIC_CONFIG_SHA256 || '').trim()
const runId = String(process.env.GITHUB_RUN_ID || '').trim()
const initialBundleDirectory = resolve(process.env.URAI_RELEASE_BUNDLE_DIR || 'release-bundle')
const initialManifestPath = join(initialBundleDirectory, 'manifest.json')
const certifiedManifestPath = resolve(process.env.URAI_CERTIFIED_BUNDLE_MANIFEST_PATH || 'deployment-receipt/postdeploy/certified-bundle-manifest.json')

const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')
function regularBytes(file) {
  const stats = lstatSync(file)
  if (stats.isSymbolicLink() || !stats.isFile()) throw new Error(`Certified bundle input must be a regular file: ${file}`)
  return readFileSync(file)
}
function inventory(directory, prefix = '') {
  const root = lstatSync(directory)
  if (root.isSymbolicLink() || !root.isDirectory()) throw new Error('Certified bundle root must be a regular directory')
  const files = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const relative = posix.join(prefix, entry.name)
    if (relative.split('/').some((segment) => segment.startsWith('.'))) throw new Error(`Certified bundle contains a Firebase-ignored path: ${relative}`)
    const absolute = join(directory, entry.name)
    const stats = lstatSync(absolute)
    if (stats.isSymbolicLink()) throw new Error(`Certified bundle contains a symlink: ${relative}`)
    if (stats.isDirectory()) files.push(...inventory(absolute, relative))
    else {
      const bytes = regularBytes(absolute)
      files.push({ path: relative, bytes: bytes.length, sha256: digest(bytes) })
    }
  }
  return files.sort((left, right) => left.path.localeCompare(right.path))
}

for (const [label, value] of [
  ['release', expectedSha],
  ['rollback', expectedRollbackSha],
  ['authority', expectedAuthoritySha],
  ['functions tree', expectedFunctionsTreeSha],
]) {
  if (!/^[0-9a-f]{40}$/.test(value)) throw new Error(`Expected ${label} SHA must be a full lowercase SHA`)
}
if (!/^[0-9a-f]{64}$/.test(expectedStaticConfigSha256)) throw new Error('Expected Firebase static config SHA-256 is invalid')
if (!/^[1-9][0-9]*$/.test(runId)) throw new Error('GITHUB_RUN_ID must be numeric')
if (expectedAuthoritySha !== expectedSha || expectedRollbackSha === expectedSha) throw new Error('Certification requires exact release authority and a distinct rollback SHA')

const initialFingerprintBytes = regularBytes(path)
const fingerprint = JSON.parse(initialFingerprintBytes)
const required = {
  schemaVersion: 'urai-release-fingerprint-1',
  repository: 'LifeLoggerAI/urai-spatial',
  authoritySha: expectedAuthoritySha,
  releaseSha: expectedSha,
  rollbackSha: expectedRollbackSha,
  firebaseProject: 'urai-4dc1d',
  liveUrl: 'https://urai.app',
  deploymentScope: 'functions-and-hosting',
  functionsTreeSha: expectedFunctionsTreeSha,
  firebaseStaticConfigSha256: expectedStaticConfigSha256,
  certification: 'pending-post-deploy-smoke',
}
for (const [key, value] of Object.entries(required)) {
  if (fingerprint[key] !== value) throw new Error(`Fingerprint ${key} does not match the governed release`)
}
if (String(fingerprint.workflowRunId) !== runId) throw new Error('Fingerprint workflowRunId does not match this governed deployment run')

const initialManifestBytes = regularBytes(initialManifestPath)
const initialManifest = JSON.parse(initialManifestBytes)
for (const [key, value] of Object.entries({
  schemaVersion: 'urai-static-release-bundle-1',
  repository: required.repository,
  authoritySha: expectedAuthoritySha,
  targetSha: expectedSha,
  rollbackSha: expectedRollbackSha,
  firebaseProject: required.firebaseProject,
  liveUrl: required.liveUrl,
  deploymentScope: required.deploymentScope,
  functionsTreeSha: expectedFunctionsTreeSha,
  firebaseStaticConfigSha256: expectedStaticConfigSha256,
  fingerprintSha256: digest(initialFingerprintBytes),
})) {
  if (initialManifest[key] !== value) throw new Error(`Initial bundle ${key} does not match this governed release`)
}
if (String(initialManifest.workflowRunId) !== runId) throw new Error('Initial bundle workflowRunId does not match this governed deployment run')
const outputDirectory = dirname(resolve(path))
const initialFiles = inventory(outputDirectory)
const preservedFiles = inventory(join(initialBundleDirectory, 'urai-tier1/out'))
if (!initialFiles.some((entry) => entry.path === 'index.html') || !initialFiles.some((entry) => entry.path === 'release-fingerprint.json')) throw new Error('Initial certified bundle is missing required output files')
if (JSON.stringify(initialFiles) !== JSON.stringify(initialManifest.files) || JSON.stringify(preservedFiles) !== JSON.stringify(initialManifest.files)) throw new Error('Initial bundle content changed before certification')
if (initialManifest.fileCount !== initialFiles.length || initialManifest.totalBytes !== initialFiles.reduce((total, entry) => total + entry.bytes, 0)) throw new Error('Initial bundle totals do not match its complete inventory')

fingerprint.certification = 'verified-post-deploy-smoke'
fingerprint.certifiedAt = new Date().toISOString()
fingerprint.certificationRunId = runId
fingerprint.certifiedBy = 'scripts/certify-release-fingerprint.mjs'

const temp = `${path}.tmp`
writeFileSync(temp, `${JSON.stringify(fingerprint, null, 2)}\n`, { encoding: 'utf8', mode: 0o644, flag: 'w' })
renameSync(temp, path)
const finalFiles = inventory(outputDirectory)
const unchanged = (files) => files.filter((entry) => entry.path !== 'release-fingerprint.json')
if (JSON.stringify(unchanged(finalFiles)) !== JSON.stringify(unchanged(initialFiles))) throw new Error('Release content changed during fingerprint certification')
if (digest(regularBytes(initialManifestPath)) !== digest(initialManifestBytes) || JSON.stringify(inventory(join(initialBundleDirectory, 'urai-tier1/out'))) !== JSON.stringify(preservedFiles)) throw new Error('Initial bundle custody changed during certification')
const certifiedManifest = {
  ...initialManifest,
  generatedAt: new Date().toISOString(),
  certification: fingerprint.certification,
  certificationRunId: runId,
  initialManifestSha256: digest(initialManifestBytes),
  initialFingerprintSha256: digest(initialFingerprintBytes),
  fingerprintSha256: digest(regularBytes(path)),
  bundleDigestMethod: 'sha256 of ordered JSON path/bytes/sha256 file inventory',
  bundleDigestSha256: digest(JSON.stringify(finalFiles)),
  fileCount: finalFiles.length,
  totalBytes: finalFiles.reduce((total, entry) => total + entry.bytes, 0),
  files: finalFiles,
}
mkdirSync(dirname(certifiedManifestPath), { recursive: true })
writeFileSync(certifiedManifestPath, `${JSON.stringify(certifiedManifest, null, 2)}\n`, { encoding: 'utf8', mode: 0o600, flag: 'wx' })
console.log(JSON.stringify({
  path,
  releaseSha: fingerprint.releaseSha,
  rollbackSha: fingerprint.rollbackSha,
  certification: fingerprint.certification,
  certificationRunId: fingerprint.certificationRunId,
  certifiedManifestPath,
  certifiedManifestSha256: digest(regularBytes(certifiedManifestPath)),
  initialManifestSha256: certifiedManifest.initialManifestSha256,
  fingerprintSha256: certifiedManifest.fingerprintSha256,
  bundleDigestSha256: certifiedManifest.bundleDigestSha256,
}, null, 2))
