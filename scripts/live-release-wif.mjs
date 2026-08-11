#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import {
  copyFileSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  discoverCurrentLiveRelease,
  restoreDiscoveredVersion,
  verifyRestoredVersion,
} from './firebase-hosting-recovery.mjs'

const authorityDirectory = path.dirname(fileURLToPath(import.meta.url))
const authorityRoot = path.resolve(authorityDirectory, '..')
const postDeploySmoke = path.join(authorityDirectory, 'urai-post-deploy-smoke.mjs')
const hostingRecoveryTool = path.join(authorityDirectory, 'firebase-hosting-recovery.mjs')
const writeReleaseFingerprint = path.join(authorityDirectory, 'write-release-fingerprint.mjs')
const prebuiltDeploy = process.argv.includes('--deploy-prebuilt')
const verifyPrebuilt = process.argv.includes('--verify-prebuilt')
const checkOnly = process.argv.includes('--check') || (!prebuiltDeploy && !verifyPrebuilt)
const project = process.env.FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT || process.env.GCLOUD_PROJECT || ''
const expectedProject = process.env.URAI_EXPECTED_FIREBASE_PROJECT || 'urai-4dc1d'
const liveUrl = process.env.URAI_LIVE_BASE_URL || process.env.LIVE_URL || 'https://urai.app'
const rollbackSha = (process.env.ROLLBACK_SHA || process.env.URAI_ROLLBACK_SHA || '').trim()
const releaseOperation = process.env.URAI_RELEASE_OPERATION || 'verify'
const expectedCurrentMain = (process.env.CURRENT_MAIN_SHA || '').trim()
const runnerTemp = (process.env.RUNNER_TEMP || '').trim()
const liveRollbackProvenancePath = runnerTemp
  ? path.join(runnerTemp, 'release-control-evidence', 'live-rollback-provenance.json')
  : ''
const hostingRecoveryReceiptPath = runnerTemp
  ? path.join(runnerTemp, 'hosting-recovery', 'legacy-live-release.json')
  : ''
const firebaseCliPath = (process.env.URAI_FIREBASE_CLI || '').trim()
const releaseBundleDirectory = path.resolve(process.env.URAI_RELEASE_BUNDLE_DIR || path.join(authorityRoot, 'release-bundle'))
const canonicalWorkflow = 'URAI Canonical Production Release'
const canonicalRepository = 'LifeLoggerAI/urai-spatial'

function childEnvironment(extraEnv = {}) {
  const env = { ...process.env, ...extraEnv }
  delete env.FIREBASE_SERVICE_ACCOUNT_JSON
  delete env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  delete env.GOOGLE_CREDENTIALS_JSON
  return env
}

function run(command, args, extraEnv = {}) {
  console.log(`[URAI release] $ ${command} ${args.join(' ')}`)
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: childEnvironment(extraEnv),
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

function runChecked(command, args, extraEnv = {}) {
  console.log(`[URAI release] $ ${command} ${args.join(' ')}`)
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: childEnvironment(extraEnv),
  })
  if (result.status !== 0) {
    const error = new Error(`${command} ${args.join(' ')} failed with status ${result.status ?? 'unknown'}`)
    error.exitCode = result.status ?? 1
    throw error
  }
}

function output(command, args, extraEnv = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    shell: process.platform === 'win32',
    env: childEnvironment(extraEnv),
  })
  if (result.status !== 0) {
    const detail = String(result.stderr || '').trim()
    throw new Error(`${command} ${args.join(' ')} failed${detail ? `: ${detail}` : ''}`)
  }
  return String(result.stdout || '').trim()
}

function requireFile(file) {
  if (!existsSync(file)) throw new Error(`Required release file missing: ${file}`)
}

function requireFullSha(label, value) {
  if (!/^[0-9a-f]{40}$/.test(value)) throw new Error(`${label} must be a full lowercase 40-character commit SHA`)
}

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex')
}

function isFirebaseIgnoredPath(relative) {
  return relative.split('/').some((segment) => segment.startsWith('.'))
}

function walkRegularFiles(directory, prefix = '') {
  if (!existsSync(directory)) throw new Error(`Required release directory missing: ${directory}`)
  const entries = readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))
  const files = []
  for (const entry of entries) {
    const relative = path.posix.join(prefix, entry.name)
    const absolute = path.join(directory, entry.name)
    const stats = lstatSync(absolute)
    if (stats.isSymbolicLink()) throw new Error(`Release surface must not contain symlinks: ${relative}`)
    if (stats.isDirectory()) {
      files.push(...walkRegularFiles(absolute, relative))
      continue
    }
    if (!stats.isFile()) throw new Error(`Release surface contains a non-regular entry: ${relative}`)
    if (isFirebaseIgnoredPath(relative)) throw new Error(`Release surface contains a Firebase-ignored dot path: ${relative}`)
    files.push({ absolute, relative, bytes: stats.size, sha256: sha256(absolute) })
  }
  return files.sort((left, right) => left.relative.localeCompare(right.relative))
}

function resolveAuthoritySha() {
  const authoritySha = output('git', ['rev-parse', 'HEAD'])
  requireFullSha('Authority SHA', authoritySha)
  if (verifyPrebuilt || prebuiltDeploy) {
    requireFullSha('CURRENT_MAIN_SHA', expectedCurrentMain)
    if (authoritySha !== expectedCurrentMain) {
      throw new Error(`Current authority SHA ${authoritySha} does not match dispatch main ${expectedCurrentMain}`)
    }
    if (output('git', ['status', '--porcelain'])) throw new Error('Current authority checkout must be clean before prebuilt release operations')
  }
  return authoritySha
}

function resolveTargetSha(authoritySha) {
  const candidate = (
    process.env.NEXT_PUBLIC_URAI_BUILD_SHA ||
    process.env.URAI_TARGET_SHA ||
    process.env.GITHUB_SHA ||
    authoritySha
  ).trim()
  requireFullSha('Release SHA', candidate)
  if (checkOnly && authoritySha !== candidate) {
    throw new Error(`Checked-out SHA ${authoritySha} does not match release SHA ${candidate}`)
  }
  return candidate
}

function resolveRemoteMainSha() {
  const result = output('git', ['ls-remote', '--exit-code', 'origin', 'refs/heads/main'])
  const [sha, ref, ...extra] = result.split(/\s+/)
  if (extra.length > 0 || ref !== 'refs/heads/main' || !/^[0-9a-f]{40}$/.test(sha || '')) {
    throw new Error('Unable to resolve a single exact remote refs/heads/main SHA')
  }
  return sha
}

function assertRemoteMainUnchanged(targetSha) {
  requireFullSha('CURRENT_MAIN_SHA', expectedCurrentMain)
  const remoteMainSha = resolveRemoteMainSha()
  if (remoteMainSha !== expectedCurrentMain) {
    throw new Error(`Remote main changed after dispatch or approval: expected ${expectedCurrentMain}, found ${remoteMainSha}`)
  }
  if (releaseOperation === 'deploy' && targetSha !== remoteMainSha) {
    throw new Error(`Deploy target ${targetSha} is not the current remote main ${remoteMainSha}`)
  }
  if (releaseOperation === 'rollback') {
    if (targetSha === remoteMainSha) throw new Error(`Rollback target ${targetSha} cannot be the current remote main ${remoteMainSha}`)
    if (rollbackSha !== remoteMainSha) throw new Error(`Rollback recovery SHA ${rollbackSha} must be the current remote main ${remoteMainSha}`)
  }
  return remoteMainSha
}

function assertStaticConfig() {
  requireFile('firebase.static.json')
  const config = JSON.parse(readFileSync('firebase.static.json', 'utf8'))
  if (config.hosting?.public !== 'urai-tier1/out') throw new Error('firebase.static.json must publish urai-tier1/out')
  if (config.hosting?.cleanUrls !== true || config.hosting?.trailingSlash !== true) throw new Error('Static hosting must use clean URLs and trailing slashes')
  if (!Array.isArray(config.hosting?.rewrites) || config.hosting.rewrites.length !== 0) throw new Error('Static hosting must not mask routes with rewrites')
}

function assertReleaseSurface() {
  for (const file of [
    'package.json',
    'pnpm-lock.yaml',
    'firebase.static.json',
    'release/urai-spatial-live-manifest.json',
    'release/tier-xr-release-matrix.json',
    'docs/URAI_SPATIAL_DONE_DONE_LOCK.md',
    'docs/contracts/URAI_STUDIO_SPATIAL_HANDOFF.md',
    'urai-tier1/src/app/layout.tsx',
  ]) requireFile(file)
  requireFile(postDeploySmoke)
  requireFile(hostingRecoveryTool)
  requireFile(writeReleaseFingerprint)
  assertStaticConfig()
}

function assertCanonicalWorkflowContext() {
  if (process.env.GITHUB_ACTIONS !== 'true') throw new Error('Production release verification is allowed only inside GitHub Actions')
  if (process.env.GITHUB_EVENT_NAME !== 'workflow_dispatch') throw new Error('Production release verification is allowed only from workflow_dispatch')
  if (process.env.GITHUB_WORKFLOW !== canonicalWorkflow) throw new Error(`Production release verification requires workflow ${canonicalWorkflow}`)
  if (process.env.GITHUB_REPOSITORY !== canonicalRepository) throw new Error(`Production release verification requires repository ${canonicalRepository}`)
  if (process.env.GITHUB_REF !== 'refs/heads/main') throw new Error('Production release verification requires refs/heads/main')
  if (process.env.GITHUB_JOB !== 'deploy') throw new Error('Production release mutation requires the protected deploy job')
  if (!['deploy', 'rollback'].includes(releaseOperation)) throw new Error(`Unsupported release operation: ${releaseOperation}`)
}

function resolveAuthorityFirebaseCli() {
  if (!firebaseCliPath) throw new Error('URAI_FIREBASE_CLI must point to the current-authority Firebase executable')
  requireFile(firebaseCliPath)
  const resolvedAuthorityRoot = realpathSync(authorityRoot)
  const resolvedCli = realpathSync(firebaseCliPath)
  if (!resolvedCli.startsWith(`${resolvedAuthorityRoot}${path.sep}`)) {
    throw new Error(`Firebase CLI must resolve inside current authority: ${resolvedCli}`)
  }
  return resolvedCli
}

function assertFederatedCredentialContext() {
  assertCanonicalWorkflowContext()
  if (!prebuiltDeploy) throw new Error('Canonical production deployment requires --deploy-prebuilt')
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is forbidden for canonical production deployment')
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || process.env.GOOGLE_CREDENTIALS_JSON) {
    throw new Error('Raw Google credential JSON is forbidden for canonical production deployment')
  }
  const provider = String(process.env.GCP_WIF_PROVIDER || '').trim()
  const expectedAccount = String(process.env.GCP_DEPLOY_SERVICE_ACCOUNT || '').trim()
  const credentialsPath = String(process.env.GOOGLE_APPLICATION_CREDENTIALS || '').trim()
  const ghaCredentialsPath = String(process.env.GOOGLE_GHA_CREDS_PATH || '').trim()
  if (!provider) throw new Error('GCP_WIF_PROVIDER is required for canonical production deployment')
  if (!expectedAccount) throw new Error('GCP_DEPLOY_SERVICE_ACCOUNT is required for canonical production deployment')
  if (!credentialsPath || !ghaCredentialsPath) throw new Error('google-github-actions/auth must export federated Application Default Credentials')
  if (path.resolve(credentialsPath) !== path.resolve(ghaCredentialsPath)) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS must equal GOOGLE_GHA_CREDS_PATH')
  }
  requireFile(credentialsPath)
  const stats = lstatSync(credentialsPath)
  if (!stats.isFile() || stats.isSymbolicLink()) throw new Error('Federated credential file must be a regular non-symlinked file')
  let config
  try {
    config = JSON.parse(readFileSync(credentialsPath, 'utf8'))
  } catch {
    throw new Error('Federated credential file must contain valid JSON')
  }
  if (config?.type !== 'external_account') throw new Error('Production credentials must use external_account Workload Identity Federation')
  if (String(config?.audience || '') !== `//iam.googleapis.com/${provider}` && String(config?.audience || '') !== provider) {
    throw new Error('Federated credential audience does not match GCP_WIF_PROVIDER')
  }
  const serialized = JSON.stringify(config)
  if (/private_key|client_secret|credentials_json/i.test(serialized)) {
    throw new Error('Federated credential configuration contains forbidden long-lived credential material')
  }
  const impersonationUrl = String(config?.service_account_impersonation_url || '')
  if (!impersonationUrl.includes(expectedAccount) && !impersonationUrl.includes(encodeURIComponent(expectedAccount))) {
    throw new Error('Federated credentials do not impersonate the dedicated production service account')
  }
  const activeProject = output('gcloud', ['config', 'get-value', 'project'])
  if (activeProject !== expectedProject) throw new Error(`Active gcloud project mismatch: ${activeProject || 'missing'}`)
  const activeAccount = output('gcloud', ['auth', 'list', '--filter=status:ACTIVE', '--format=value(account)'])
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean)[0]
  if (activeAccount !== expectedAccount) throw new Error('Active gcloud account does not match the dedicated production service account')
  return { provider, expectedAccount, credentialsPath }
}

function configureHostingRecoveryEnvironment() {
  if (!runnerTemp) throw new Error('RUNNER_TEMP is required for exact Firebase Hosting recovery')
  if (!hostingRecoveryReceiptPath) throw new Error('Hosting recovery receipt path is unavailable')
  process.env.FIREBASE_SITE_ID = expectedProject
  process.env.URAI_HOSTING_RECOVERY_RECEIPT = hostingRecoveryReceiptPath
}

function clearHostingRecoveryEnvironment() {
  delete process.env.FIREBASE_SITE_ID
  delete process.env.URAI_HOSTING_RESTORE_CONFIRM
}

function copyHostingRecoveryEvidence(destinationRoot) {
  const sourceDirectory = runnerTemp ? path.join(runnerTemp, 'hosting-recovery') : ''
  if (!sourceDirectory || !existsSync(sourceDirectory)) return null
  const destination = path.join(destinationRoot, 'hosting-recovery')
  rmSync(destination, { recursive: true, force: true })
  mkdirSync(path.dirname(destination), { recursive: true })
  cpSync(sourceDirectory, destination, { recursive: true, dereference: false, errorOnExist: true, force: false })
  return destination
}

async function recoverExactHostingVersion({ phase, originalError, targetSha }) {
  let restoreError = null
  let verification = null
  try {
    process.env.URAI_HOSTING_RESTORE_CONFIRM = 'RESTORE_EXACT_HOSTING_VERSION'
    await restoreDiscoveredVersion()
    verification = await verifyRestoredVersion()
  } catch (error) {
    restoreError = error
  }

  const evidenceRoot = path.join('release-control-evidence', 'hosting-recovery')
  mkdirSync(evidenceRoot, { recursive: true })
  copyHostingRecoveryEvidence('release-control-evidence')
  const summary = {
    schemaVersion: 'urai-protected-hosting-recovery-2',
    recordedAt: new Date().toISOString(),
    repository: process.env.GITHUB_REPOSITORY || canonicalRepository,
    workflowRunId: process.env.GITHUB_RUN_ID || null,
    authoritySha: expectedCurrentMain || null,
    targetSha,
    rollbackSha,
    releaseOperation,
    authMode: 'wif',
    credentialClass: 'github-oidc-wif',
    failurePhase: phase,
    originalError: String(originalError?.stack || originalError),
    restoreSucceeded: !restoreError,
    restoreVerificationPath: verification?.resultPath || null,
    restoreError: restoreError ? String(restoreError?.stack || restoreError) : null,
  }
  writeFileSync(path.join(evidenceRoot, 'operator-recovery.json'), `${JSON.stringify(summary, null, 2)}\n`)
  const finalStateDirectory = path.join('deployment-receipt', targetSha)
  mkdirSync(finalStateDirectory, { recursive: true })
  writeFileSync(path.join(finalStateDirectory, 'recovery-final-state.json'), `${JSON.stringify({
    ...summary,
    finalState: restoreError ? 'recovery-failed' : 'restored-previous-hosting-version',
    expectedRestoredVersionName: verification?.result?.expectedVersionName || null,
    observedRestoredVersionName: verification?.result?.observedVersionName || null,
  }, null, 2)}\n`)

  if (restoreError) {
    throw new AggregateError([originalError, restoreError], `URAI production ${phase} failed and exact Firebase Hosting recovery also failed`)
  }
  throw new AggregateError([originalError], `URAI production ${phase} failed; the exact previously live Firebase Hosting version was restored and verified`)
}

function validateAndMaterializePrebuiltBundle(targetSha, authoritySha, materialize = true) {
  const manifestPath = path.join(releaseBundleDirectory, 'manifest.json')
  const bundleOutputDirectory = path.join(releaseBundleDirectory, 'urai-tier1', 'out')
  requireFile(manifestPath)
  const manifestStats = lstatSync(manifestPath)
  if (!manifestStats.isFile() || manifestStats.isSymbolicLink()) throw new Error('Release bundle manifest must be a regular file')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))

  if (
    manifest.schemaVersion !== 'urai-static-release-bundle-1' ||
    manifest.repository !== canonicalRepository ||
    manifest.authoritySha !== authoritySha ||
    manifest.targetSha !== targetSha ||
    manifest.rollbackSha !== rollbackSha ||
    manifest.firebaseProject !== project ||
    manifest.liveUrl !== 'https://urai.app' ||
    manifest.deploymentScope !== 'hosting-only'
  ) throw new Error('Release bundle manifest authority does not match the protected deployment inputs')
  if (!Array.isArray(manifest.files) || manifest.files.length === 0) throw new Error('Release bundle manifest has no files')

  const expectedFiles = manifest.files.map((entry) => {
    if (
      !entry ||
      typeof entry.path !== 'string' ||
      entry.path.startsWith('/') ||
      entry.path.includes('\\') ||
      entry.path.split('/').some((segment) => !segment || segment === '.' || segment === '..') ||
      isFirebaseIgnoredPath(entry.path) ||
      !Number.isSafeInteger(entry.bytes) || entry.bytes < 0 ||
      !/^[0-9a-f]{64}$/.test(entry.sha256 || '')
    ) throw new Error(`Invalid release bundle manifest entry: ${JSON.stringify(entry)}`)
    return entry
  })
  const expectedPaths = expectedFiles.map((entry) => entry.path)
  if (new Set(expectedPaths).size !== expectedPaths.length) throw new Error('Release bundle manifest contains duplicate paths')
  if (JSON.stringify(expectedPaths) !== JSON.stringify([...expectedPaths].sort((left, right) => left.localeCompare(right)))) {
    throw new Error('Release bundle manifest paths must be sorted')
  }

  const actualFiles = walkRegularFiles(bundleOutputDirectory).map(({ relative, bytes, sha256: digest }) => ({ path: relative, bytes, sha256: digest }))
  if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) throw new Error('Release bundle file set, sizes, or hashes do not match the manifest')
  const totalBytes = actualFiles.reduce((total, entry) => total + entry.bytes, 0)
  if (manifest.fileCount !== actualFiles.length || manifest.totalBytes !== totalBytes) throw new Error('Release bundle manifest totals do not match the verified files')
  if (!actualFiles.some((entry) => entry.path === 'index.html')) throw new Error('Release bundle is missing index.html')
  if (!actualFiles.some((entry) => entry.path === 'release-fingerprint.json')) throw new Error('Release bundle is missing release-fingerprint.json')

  const fingerprintPath = path.join(bundleOutputDirectory, 'release-fingerprint.json')
  if (manifest.fingerprintSha256 !== sha256(fingerprintPath)) throw new Error('Release bundle fingerprint hash does not match the manifest')
  const fingerprint = JSON.parse(readFileSync(fingerprintPath, 'utf8'))
  if (
    fingerprint.schemaVersion !== 'urai-release-fingerprint-1' ||
    fingerprint.repository !== canonicalRepository ||
    fingerprint.authoritySha !== authoritySha ||
    fingerprint.releaseSha !== targetSha ||
    fingerprint.rollbackSha !== rollbackSha ||
    fingerprint.firebaseProject !== project ||
    fingerprint.liveUrl !== 'https://urai.app' ||
    fingerprint.deploymentScope !== 'hosting-only'
  ) throw new Error('Verified bundle fingerprint does not match protected deployment inputs')

  const htmlFiles = actualFiles.filter((entry) => entry.path.endsWith('.html'))
  if (!htmlFiles.some((entry) => readFileSync(path.join(bundleOutputDirectory, ...entry.path.split('/')), 'utf8').includes(targetSha))) {
    throw new Error('Verified bundle HTML does not contain the exact release SHA')
  }
  if (!materialize) return { manifest, files: actualFiles, totalBytes }

  rmSync('urai-tier1/out', { recursive: true, force: true })
  mkdirSync('urai-tier1', { recursive: true })
  cpSync(bundleOutputDirectory, 'urai-tier1/out', { recursive: true, dereference: false, errorOnExist: true, force: false })
  const materializedFiles = walkRegularFiles('urai-tier1/out').map(({ relative, bytes, sha256: digest }) => ({ path: relative, bytes, sha256: digest }))
  if (JSON.stringify(materializedFiles) !== JSON.stringify(expectedFiles)) throw new Error('Materialized hosting output does not match the verified release bundle')
  return { manifest, files: materializedFiles, totalBytes }
}

function deployHostingWithFederatedCredentials() {
  assertFederatedCredentialContext()
  const authorityFirebaseCli = resolveAuthorityFirebaseCli()
  console.log(`[URAI release] $ ${authorityFirebaseCli} deploy --config firebase.static.json --only hosting --project ${project}`)
  const result = spawnSync(
    authorityFirebaseCli,
    ['deploy', '--config', 'firebase.static.json', '--only', 'hosting', '--project', project],
    { stdio: 'inherit', shell: false, env: childEnvironment() },
  )
  if (result.status !== 0) {
    const error = new Error(`Firebase Hosting deployment failed with status ${result.status ?? 'unknown'}`)
    error.exitCode = result.status ?? 1
    throw error
  }
}

function resolvePreDeployReceiptRoot() {
  if (!runnerTemp) throw new Error('RUNNER_TEMP is required for pre-deploy receipt evidence')
  const receiptRoot = path.resolve(runnerTemp, 'deployment-receipt')
  const resolvedAuthorityRoot = realpathSync(authorityRoot)
  if (receiptRoot === resolvedAuthorityRoot || receiptRoot.startsWith(`${resolvedAuthorityRoot}${path.sep}`)) {
    throw new Error('Pre-deploy receipt evidence must remain outside the authority checkout')
  }
  return receiptRoot
}

function writeReceipt(targetSha, status, details = {}, { rootDirectory = 'deployment-receipt', includeLiveRollbackProvenance = true } = {}) {
  const directory = path.join(rootDirectory, targetSha)
  mkdirSync(directory, { recursive: true })
  const receipt = {
    schemaVersion: 'urai-static-release-receipt-3',
    generatedAt: new Date().toISOString(),
    repository: process.env.GITHUB_REPOSITORY || canonicalRepository,
    targetSha,
    rollbackSha: rollbackSha || null,
    releaseOperation,
    firebaseProject: project || null,
    liveUrl: liveUrl || null,
    status,
    deploymentScope: 'hosting-only',
    productionAuthority: '.github/workflows/spatial-live-deploy.yml',
    operator: 'scripts/live-release-wif.mjs',
    authMode: prebuiltDeploy ? 'wif' : 'none',
    credentialClass: prebuiltDeploy ? 'github-oidc-wif' : 'none',
    workflowRunId: process.env.GITHUB_RUN_ID || null,
    ...details,
  }
  const receiptPath = path.join(directory, 'receipt.json')
  writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`)
  if (includeLiveRollbackProvenance && liveRollbackProvenancePath && existsSync(liveRollbackProvenancePath)) {
    copyFileSync(liveRollbackProvenancePath, path.join(directory, 'live-rollback-provenance.json'))
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    const summary = `\n## URAI static release\n\n- SHA: \`${targetSha}\`\n- Recovery SHA: \`${rollbackSha || 'not set'}\`\n- Operation: \`${releaseOperation}\`\n- Project: \`${project || 'not set'}\`\n- Scope: Hosting only\n- Auth: \`${receipt.authMode}\`\n- Status: **${status}**\n- Receipt: \`${receiptPath}\`\n`
    writeFileSync(process.env.GITHUB_STEP_SUMMARY, summary, { flag: 'a' })
  }
  return receiptPath
}

const authoritySha = resolveAuthoritySha()
const targetSha = resolveTargetSha(authoritySha)
assertReleaseSurface()

if (verifyPrebuilt) {
  assertCanonicalWorkflowContext()
  if (!project) throw new Error('FIREBASE_PROJECT_ID is required')
  if (project !== expectedProject) throw new Error(`Refusing project ${project}; expected ${expectedProject}`)
  requireFullSha('ROLLBACK_SHA', rollbackSha)
  if (rollbackSha === targetSha) throw new Error('ROLLBACK_SHA must be distinct from the release SHA')
  const authorizedMainSha = assertRemoteMainUnchanged(targetSha)
  const verifiedBundle = validateAndMaterializePrebuiltBundle(targetSha, authoritySha, false)
  console.log(JSON.stringify({
    schemaVersion: 'urai-prebuilt-release-verification-2',
    ok: true,
    authoritySha,
    authorizedMainSha,
    targetSha,
    rollbackSha,
    credentialState: 'not-authenticated',
    bundleSchemaVersion: verifiedBundle.manifest.schemaVersion,
    bundleWorkflowRunId: verifiedBundle.manifest.workflowRunId,
    bundleFileCount: verifiedBundle.files.length,
    bundleTotalBytes: verifiedBundle.totalBytes,
    bundleManifestSha256: sha256(path.join(releaseBundleDirectory, 'manifest.json')),
  }, null, 2))
  console.log('[URAI release] Prebuilt bundle verification passed before production authentication. No deployment requested.')
  process.exit(0)
}

if (checkOnly) {
  run('pnpm', ['verify:release:critical'], { NEXT_PUBLIC_URAI_BUILD_SHA: targetSha })
  writeReceipt(targetSha, 'verified-no-deploy', { releaseOperation: 'verify', authoritySha })
  console.log('[URAI release] Verification passed. No deployment requested.')
  process.exit(0)
}

assertFederatedCredentialContext()
if (process.env.URAI_DEPLOY_CONFIRM !== 'DEPLOY_STATIC_URAI') throw new Error('Static deployment requires URAI_DEPLOY_CONFIRM=DEPLOY_STATIC_URAI')
if (!project) throw new Error('FIREBASE_PROJECT_ID is required')
if (project !== expectedProject) throw new Error(`Refusing project ${project}; expected ${expectedProject}`)
requireFullSha('ROLLBACK_SHA', rollbackSha)
if (rollbackSha === targetSha) throw new Error('ROLLBACK_SHA must be distinct from the release SHA')
const authorizedMainSha = assertRemoteMainUnchanged(targetSha)

const verifiedBundle = validateAndMaterializePrebuiltBundle(targetSha, authoritySha)
const releaseFiles = verifiedBundle.files
const outputDetails = {
  bundleSchemaVersion: verifiedBundle.manifest.schemaVersion,
  bundleWorkflowRunId: verifiedBundle.manifest.workflowRunId,
  bundleFileCount: verifiedBundle.files.length,
  bundleTotalBytes: verifiedBundle.totalBytes,
  bundleManifestSha256: sha256(path.join(releaseBundleDirectory, 'manifest.json')),
}
requireFile('urai-tier1/out/index.html')
requireFile('urai-tier1/out/release-fingerprint.json')

const htmlFiles = releaseFiles.filter((entry) => entry.path.endsWith('.html'))
const preDeployReceiptRoot = resolvePreDeployReceiptRoot()
const receiptPath = writeReceipt(targetSha, 'built-awaiting-deploy', {
  authorizedMainSha,
  authoritySha,
  outputFileCount: releaseFiles.length,
  htmlFileCount: htmlFiles.length,
  indexSha256: sha256('urai-tier1/out/index.html'),
  fingerprintSha256: sha256('urai-tier1/out/release-fingerprint.json'),
  ...outputDetails,
}, { rootDirectory: preDeployReceiptRoot, includeLiveRollbackProvenance: false })
if (output('git', ['status', '--porcelain', '--untracked-files=all'])) {
  throw new Error('Current authority checkout must remain clean immediately before deployment')
}

const preDeployMainSha = assertRemoteMainUnchanged(targetSha)
assertFederatedCredentialContext()
configureHostingRecoveryEnvironment()
const hostingCapture = await discoverCurrentLiveRelease()
let deploymentCompleted = false
try {
  deployHostingWithFederatedCredentials()
  deploymentCompleted = true
  if (liveUrl) runChecked('node', [postDeploySmoke], {
    URAI_DEPLOY_URL: liveUrl,
    URAI_EXPECTED_DEPLOYED_SHA: targetSha,
    URAI_EXPECTED_ROLLBACK_SHA: rollbackSha,
  })
} catch (error) {
  await recoverExactHostingVersion({ phase: deploymentCompleted ? 'post-deploy-smoke' : 'firebase-deploy', originalError: error, targetSha })
} finally {
  clearHostingRecoveryEnvironment()
}

const finalReceiptPath = writeReceipt(targetSha, 'deployed', {
  authorizedMainSha,
  preDeployMainSha,
  authoritySha,
  outputFileCount: releaseFiles.length,
  htmlFileCount: htmlFiles.length,
  indexSha256: sha256('urai-tier1/out/index.html'),
  fingerprintSha256: sha256('urai-tier1/out/release-fingerprint.json'),
  previousReceipt: receiptPath,
  hostingRecoverySchemaVersion: hostingCapture.receipt.schemaVersion,
  hostingRecoveryReleaseName: hostingCapture.receipt.releaseName,
  hostingRecoveryVersionName: hostingCapture.receipt.versionName,
  hostingRecoveryReceipt: hostingCapture.receiptPath,
  federatedCredentialAvailableForStrictSmoke: true,
  longLivedServiceAccountKeyUsed: false,
  ...outputDetails,
})
copyFileSync(receiptPath, path.join(path.dirname(finalReceiptPath), 'predeploy-receipt.json'))
copyHostingRecoveryEvidence(path.dirname(finalReceiptPath))
console.log('[URAI release] Static Hosting deployment and first protected smoke completed under GitHub OIDC/WIF; exact prior Hosting version remains available for strict-smoke recovery.')
