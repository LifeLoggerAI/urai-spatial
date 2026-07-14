#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const sourceDirectory = path.resolve(root, process.env.URAI_STATIC_OUTPUT_DIR || 'urai-tier1/out')
const bundleDirectory = path.resolve(root, process.env.URAI_RELEASE_BUNDLE_DIR || 'release-bundle')
const bundleOutputDirectory = path.join(bundleDirectory, 'urai-tier1', 'out')
const manifestPath = path.join(bundleDirectory, 'manifest.json')
const fingerprintPath = path.join(sourceDirectory, 'release-fingerprint.json')
const targetSha = (process.env.NEXT_PUBLIC_URAI_BUILD_SHA || process.env.URAI_TARGET_SHA || '').trim()
const rollbackSha = (process.env.ROLLBACK_SHA || process.env.URAI_ROLLBACK_SHA || '').trim()
const authoritySha = (process.env.CURRENT_MAIN_SHA || process.env.URAI_AUTHORITY_SHA || '').trim()
const project = (process.env.URAI_EXPECTED_FIREBASE_PROJECT || process.env.FIREBASE_PROJECT_ID || '').trim()
const liveUrl = (process.env.URAI_LIVE_BASE_URL || process.env.LIVE_URL || '').trim()
const canonicalRepository = 'LifeLoggerAI/urai-spatial'
const repository = (process.env.GITHUB_REPOSITORY || canonicalRepository).trim()
const workflowRunId = String(process.env.GITHUB_RUN_ID || '').trim()

function requireFullSha(label, value) {
  if (!/^[0-9a-f]{40}$/.test(value)) throw new Error(`${label} must be a full lowercase 40-character commit SHA`)
}

function parseLiveUrl(value) {
  try {
    return new URL(value)
  } catch {
    throw new Error(`Release bundle live URL is invalid or missing: ${value}`)
  }
}

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex')
}

function isFirebaseIgnoredPath(relative) {
  return relative.split('/').some((segment) => segment.startsWith('.'))
}

function walkRegularFiles(directory, prefix = '') {
  const entries = readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))
  const files = []
  for (const entry of entries) {
    const relative = path.posix.join(prefix, entry.name)
    const absolute = path.join(directory, entry.name)
    const stats = lstatSync(absolute)
    if (stats.isSymbolicLink()) throw new Error(`Release bundle source must not contain symlinks: ${relative}`)
    if (stats.isDirectory()) {
      files.push(...walkRegularFiles(absolute, relative))
      continue
    }
    if (!stats.isFile()) throw new Error(`Release bundle source contains a non-regular entry: ${relative}`)
    if (isFirebaseIgnoredPath(relative)) {
      throw new Error(`Static output contains a Firebase-ignored dot path: ${relative}`)
    }
    files.push({ absolute, relative, bytes: stats.size, sha256: sha256(absolute) })
  }
  return files
}

function assertCleanAuthorityCheckout() {
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  const status = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim()
  requireFullSha('Current authority checkout SHA', head)
  if (head !== authoritySha) throw new Error(`Current authority checkout ${head} does not match ${authoritySha}`)
  if (status) throw new Error('Current authority checkout must be clean before bundle attestation')
}

function writeAuthoritativeFingerprint() {
  if (existsSync(fingerprintPath)) {
    const stats = lstatSync(fingerprintPath)
    if (stats.isSymbolicLink() || !stats.isFile()) {
      throw new Error('Existing release-fingerprint.json must be a regular file before authority overwrite')
    }
  }

  const fingerprint = {
    schemaVersion: 'urai-release-fingerprint-1',
    generatedAt: new Date().toISOString(),
    repository: canonicalRepository,
    authoritySha,
    releaseSha: targetSha,
    rollbackSha,
    firebaseProject: project,
    liveUrl: 'https://urai.app',
    deploymentScope: 'hosting-only',
    certification: 'pending-post-deploy-smoke',
    workflowRunId,
    attestedBy: 'scripts/create-static-release-bundle.mjs',
  }
  writeFileSync(fingerprintPath, `${JSON.stringify(fingerprint, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o644,
    flag: 'w',
  })
  return fingerprint
}

requireFullSha('Release SHA', targetSha)
requireFullSha('Rollback SHA', rollbackSha)
requireFullSha('Authority SHA', authoritySha)
if (!/^\d+$/.test(workflowRunId)) throw new Error('GITHUB_RUN_ID must be a numeric GitHub Actions run identifier')
if (targetSha === rollbackSha) throw new Error('Release and rollback SHAs must be distinct')
if (repository !== canonicalRepository) throw new Error(`Release bundle repository mismatch: ${repository || 'missing'}`)
if (project !== 'urai-4dc1d') throw new Error(`Release bundle project mismatch: ${project || 'missing'}`)
if (parseLiveUrl(liveUrl).origin !== 'https://urai.app') throw new Error(`Release bundle live URL mismatch: ${liveUrl}`)
if (!existsSync(sourceDirectory)) throw new Error(`Static output directory is missing: ${sourceDirectory}`)
const sourceStats = lstatSync(sourceDirectory)
if (sourceStats.isSymbolicLink() || !sourceStats.isDirectory()) {
  throw new Error('Static output root must be a regular directory, not a symlink')
}

assertCleanAuthorityCheckout()
const fingerprint = writeAuthoritativeFingerprint()
const sourceFiles = walkRegularFiles(sourceDirectory)
if (!sourceFiles.length) throw new Error('Static output directory is empty')
if (!sourceFiles.some((entry) => entry.relative === 'index.html')) throw new Error('Static output is missing index.html')
if (!sourceFiles.some((entry) => entry.relative === 'release-fingerprint.json')) {
  throw new Error('Static output is missing release-fingerprint.json')
}
const htmlFiles = sourceFiles.filter((entry) => entry.relative.endsWith('.html'))
if (!htmlFiles.some((entry) => readFileSync(entry.absolute, 'utf8').includes(targetSha))) {
  throw new Error('Static output HTML does not contain the exact release SHA')
}
if (
  fingerprint.schemaVersion !== 'urai-release-fingerprint-1' ||
  fingerprint.repository !== canonicalRepository ||
  fingerprint.authoritySha !== authoritySha ||
  fingerprint.releaseSha !== targetSha ||
  fingerprint.rollbackSha !== rollbackSha ||
  fingerprint.firebaseProject !== project ||
  fingerprint.liveUrl !== 'https://urai.app' ||
  fingerprint.deploymentScope !== 'hosting-only' ||
  fingerprint.certification !== 'pending-post-deploy-smoke' ||
  fingerprint.workflowRunId !== workflowRunId
) {
  throw new Error('Authority-created release fingerprint does not match the bundle inputs')
}

rmSync(bundleDirectory, { recursive: true, force: true })
for (const entry of sourceFiles) {
  const destination = path.join(bundleOutputDirectory, ...entry.relative.split('/'))
  mkdirSync(path.dirname(destination), { recursive: true })
  copyFileSync(entry.absolute, destination)
}

const copiedFiles = walkRegularFiles(bundleOutputDirectory).map(({ relative, bytes, sha256: digest }) => ({
  path: relative,
  bytes,
  sha256: digest,
}))
const expectedFiles = sourceFiles.map(({ relative, bytes, sha256: digest }) => ({
  path: relative,
  bytes,
  sha256: digest,
}))
if (JSON.stringify(copiedFiles) !== JSON.stringify(expectedFiles)) {
  throw new Error('Copied release bundle bytes do not match the source output')
}

const manifest = {
  schemaVersion: 'urai-static-release-bundle-1',
  generatedAt: new Date().toISOString(),
  repository: canonicalRepository,
  workflowRunId,
  authoritySha,
  targetSha,
  rollbackSha,
  firebaseProject: project,
  liveUrl: 'https://urai.app',
  deploymentScope: 'hosting-only',
  fingerprintSha256: sha256(path.join(bundleOutputDirectory, 'release-fingerprint.json')),
  fileCount: copiedFiles.length,
  totalBytes: copiedFiles.reduce((total, entry) => total + entry.bytes, 0),
  files: copiedFiles,
}
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 })

console.log(JSON.stringify({
  manifestPath,
  bundleOutputDirectory,
  targetSha,
  rollbackSha,
  authoritySha,
  workflowRunId,
  fileCount: manifest.fileCount,
  totalBytes: manifest.totalBytes,
  fingerprintSha256: manifest.fingerprintSha256,
}, null, 2))
