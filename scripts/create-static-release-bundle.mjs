#!/usr/bin/env node
import { createHash } from 'node:crypto'
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
const targetSha = (process.env.NEXT_PUBLIC_URAI_BUILD_SHA || process.env.URAI_TARGET_SHA || '').trim()
const rollbackSha = (process.env.ROLLBACK_SHA || process.env.URAI_ROLLBACK_SHA || '').trim()
const authoritySha = (process.env.CURRENT_MAIN_SHA || process.env.URAI_AUTHORITY_SHA || '').trim()
const project = (process.env.URAI_EXPECTED_FIREBASE_PROJECT || process.env.FIREBASE_PROJECT_ID || '').trim()
const liveUrl = (process.env.URAI_LIVE_BASE_URL || process.env.LIVE_URL || '').trim()

function requireFullSha(label, value) {
  if (!/^[0-9a-f]{40}$/.test(value)) throw new Error(`${label} must be a full lowercase 40-character commit SHA`)
}

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex')
}

function walkRegularFiles(directory, prefix = '') {
  const entries = readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))
  const files = []
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name)
    const relative = path.posix.join(prefix, entry.name)
    const stats = lstatSync(absolute)
    if (stats.isSymbolicLink()) throw new Error(`Release bundle source must not contain symlinks: ${relative}`)
    if (stats.isDirectory()) {
      files.push(...walkRegularFiles(absolute, relative))
      continue
    }
    if (!stats.isFile()) throw new Error(`Release bundle source contains a non-regular entry: ${relative}`)
    files.push({ absolute, relative, bytes: stats.size, sha256: sha256(absolute) })
  }
  return files
}

requireFullSha('Release SHA', targetSha)
requireFullSha('Rollback SHA', rollbackSha)
requireFullSha('Authority SHA', authoritySha)
if (targetSha === rollbackSha) throw new Error('Release and rollback SHAs must be distinct')
if (project !== 'urai-4dc1d') throw new Error(`Release bundle project mismatch: ${project || 'missing'}`)
if (new URL(liveUrl).origin !== 'https://urai.app') throw new Error(`Release bundle live URL mismatch: ${liveUrl}`)
if (!existsSync(sourceDirectory)) throw new Error(`Static output directory is missing: ${sourceDirectory}`)

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

const fingerprint = JSON.parse(readFileSync(path.join(sourceDirectory, 'release-fingerprint.json'), 'utf8'))
if (
  fingerprint.schemaVersion !== 'urai-release-fingerprint-1' ||
  fingerprint.releaseSha !== targetSha ||
  fingerprint.rollbackSha !== rollbackSha ||
  fingerprint.firebaseProject !== project ||
  fingerprint.liveUrl !== 'https://urai.app' ||
  fingerprint.deploymentScope !== 'hosting-only'
) {
  throw new Error('Static release fingerprint does not match the bundle authority inputs')
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
if (JSON.stringify(copiedFiles) !== JSON.stringify(sourceFiles.map(({ relative, bytes, sha256: digest }) => ({ path: relative, bytes, sha256: digest })))) {
  throw new Error('Copied release bundle bytes do not match the source output')
}

const manifest = {
  schemaVersion: 'urai-static-release-bundle-1',
  generatedAt: new Date().toISOString(),
  repository: process.env.GITHUB_REPOSITORY || 'LifeLoggerAI/urai-spatial',
  workflowRunId: process.env.GITHUB_RUN_ID || null,
  authoritySha,
  targetSha,
  rollbackSha,
  firebaseProject: project,
  liveUrl: 'https://urai.app',
  deploymentScope: 'hosting-only',
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
  fileCount: manifest.fileCount,
  totalBytes: manifest.totalBytes,
}, null, 2))
