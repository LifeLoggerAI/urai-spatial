import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const authorityDirectory = path.dirname(fileURLToPath(import.meta.url))
const postDeploySmoke = path.join(authorityDirectory, 'urai-post-deploy-smoke.mjs')
const writeReleaseFingerprint = path.join(authorityDirectory, 'write-release-fingerprint.mjs')
const deploy = process.argv.includes('--deploy')
const project = process.env.FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT || process.env.GCLOUD_PROJECT || ''
const expectedProject = process.env.URAI_EXPECTED_FIREBASE_PROJECT || 'urai-4dc1d'
const liveUrl = process.env.URAI_LIVE_BASE_URL || process.env.LIVE_URL || 'https://urai.app'
const rollbackSha = (process.env.ROLLBACK_SHA || process.env.URAI_ROLLBACK_SHA || '').trim()
const releaseOperation = process.env.URAI_RELEASE_OPERATION || 'verify'
const expectedCurrentMain = process.env.CURRENT_MAIN_SHA || ''
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || ''
const credentialsPath = (process.env.GOOGLE_APPLICATION_CREDENTIALS || '').trim()
const canonicalWorkflow = 'URAI Canonical Production Release'
const canonicalRepository = 'LifeLoggerAI/urai-spatial'

function childEnvironment(extraEnv = {}, allowCredentialPath = false) {
  const env = { ...process.env, ...extraEnv }
  delete env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (!allowCredentialPath) delete env.GOOGLE_APPLICATION_CREDENTIALS
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

function output(command, args) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    shell: process.platform === 'win32',
    env: childEnvironment(),
  })
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed`)
  return result.stdout.trim()
}

function requireFile(file) {
  if (!existsSync(file)) throw new Error(`Required release file missing: ${file}`)
}

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex')
}

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(absolute) : entry.isFile() ? [absolute] : []
  })
}

function resolveTargetSha() {
  const candidate = (
    process.env.NEXT_PUBLIC_URAI_BUILD_SHA ||
    process.env.URAI_TARGET_SHA ||
    process.env.GITHUB_SHA ||
    output('git', ['rev-parse', 'HEAD'])
  ).trim()
  if (!/^[0-9a-f]{40}$/.test(candidate)) throw new Error('Release SHA must be a full lowercase 40-character commit SHA')
  const head = output('git', ['rev-parse', 'HEAD'])
  if (head !== candidate) throw new Error(`Checked-out SHA ${head} does not match release SHA ${candidate}`)
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
  if (!/^[0-9a-f]{40}$/.test(expectedCurrentMain)) {
    throw new Error('CURRENT_MAIN_SHA must be the full dispatch-time main SHA')
  }
  const remoteMainSha = resolveRemoteMainSha()
  if (remoteMainSha !== expectedCurrentMain) {
    throw new Error(`Remote main changed after dispatch or approval: expected ${expectedCurrentMain}, found ${remoteMainSha}`)
  }
  if (releaseOperation === 'deploy' && targetSha !== remoteMainSha) {
    throw new Error(`Deploy target ${targetSha} is not the current remote main ${remoteMainSha}`)
  }
  if (releaseOperation === 'rollback') {
    if (targetSha === remoteMainSha) {
      throw new Error(`Rollback target ${targetSha} cannot be the current remote main ${remoteMainSha}`)
    }
    if (rollbackSha !== remoteMainSha) {
      throw new Error(`Rollback recovery SHA ${rollbackSha} must be the current remote main ${remoteMainSha}`)
    }
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
  requireFile(writeReleaseFingerprint)
  assertStaticConfig()
}

function assertCanonicalDeployContext() {
  if (process.env.GITHUB_ACTIONS !== 'true') throw new Error('Production deployment is allowed only inside GitHub Actions')
  if (process.env.GITHUB_EVENT_NAME !== 'workflow_dispatch') throw new Error('Production deployment is allowed only from workflow_dispatch')
  if (process.env.GITHUB_WORKFLOW !== canonicalWorkflow) throw new Error(`Production deployment requires workflow ${canonicalWorkflow}`)
  if (process.env.GITHUB_REPOSITORY !== canonicalRepository) throw new Error(`Production deployment requires repository ${canonicalRepository}`)
  if (process.env.GITHUB_REF !== 'refs/heads/main') throw new Error('Production deployment requires refs/heads/main')
  if (!['deploy', 'rollback'].includes(releaseOperation)) throw new Error(`Unsupported release operation: ${releaseOperation}`)
}

function writeTemporaryServiceAccount() {
  if (!credentialsPath) throw new Error('GOOGLE_APPLICATION_CREDENTIALS must point to a temporary runner path')
  if (!serviceAccountJson.trim()) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is required only for the canonical deploy step')

  let serviceAccount
  try {
    serviceAccount = JSON.parse(serviceAccountJson)
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON must be valid JSON')
  }
  if (serviceAccount?.project_id !== expectedProject) {
    throw new Error(`Service-account project mismatch: ${serviceAccount?.project_id || 'missing'}`)
  }

  mkdirSync(path.dirname(credentialsPath), { recursive: true })
  writeFileSync(credentialsPath, `${JSON.stringify(serviceAccount)}\n`, { encoding: 'utf8', mode: 0o600 })
  chmodSync(credentialsPath, 0o600)
  return credentialsPath
}

function removeTemporaryServiceAccount() {
  if (credentialsPath) rmSync(credentialsPath, { force: true })
}

function deployHostingWithTemporaryCredentials() {
  const credentialFile = writeTemporaryServiceAccount()
  let result
  try {
    console.log(`[URAI release] $ pnpm exec firebase deploy --config firebase.static.json --only hosting --project ${project}`)
    result = spawnSync(
      'pnpm',
      ['exec', 'firebase', 'deploy', '--config', 'firebase.static.json', '--only', 'hosting', '--project', project],
      {
        stdio: 'inherit',
        shell: process.platform === 'win32',
        env: childEnvironment({ GOOGLE_APPLICATION_CREDENTIALS: credentialFile }, true),
      },
    )
  } finally {
    removeTemporaryServiceAccount()
  }
  if (result?.status !== 0) process.exit(result?.status ?? 1)
}

function writeReceipt(targetSha, status, details = {}) {
  const directory = path.join('deployment-receipt', targetSha)
  mkdirSync(directory, { recursive: true })
  const receipt = {
    schemaVersion: 'urai-static-release-receipt-2',
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
    authorityDirectory,
    postDeploySmoke,
    writeReleaseFingerprint,
    workflowRunId: process.env.GITHUB_RUN_ID || null,
    ...details,
  }
  const receiptPath = path.join(directory, 'receipt.json')
  writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`)
  if (process.env.GITHUB_STEP_SUMMARY) {
    const summary = `\n## URAI static release\n\n- SHA: \`${targetSha}\`\n- Recovery SHA: \`${rollbackSha || 'not set'}\`\n- Operation: \`${releaseOperation}\`\n- Project: \`${project || 'not set'}\`\n- Scope: Hosting only\n- Status: **${status}**\n- Receipt: \`${receiptPath}\`\n`
    writeFileSync(process.env.GITHUB_STEP_SUMMARY, summary, { flag: 'a' })
  }
  return receiptPath
}

const targetSha = resolveTargetSha()
assertReleaseSurface()
run('pnpm', ['verify:release:critical'], { NEXT_PUBLIC_URAI_BUILD_SHA: targetSha })

if (!deploy) {
  writeReceipt(targetSha, 'verified-no-deploy', { releaseOperation: 'verify' })
  console.log('[URAI release] Verification passed. No deployment requested.')
  process.exit(0)
}

assertCanonicalDeployContext()
removeTemporaryServiceAccount()
if (process.env.URAI_DEPLOY_CONFIRM !== 'DEPLOY_STATIC_URAI') {
  throw new Error('Static deployment requires URAI_DEPLOY_CONFIRM=DEPLOY_STATIC_URAI')
}
if (!project) throw new Error('FIREBASE_PROJECT_ID is required')
if (project !== expectedProject) throw new Error(`Refusing project ${project}; expected ${expectedProject}`)
if (!/^[0-9a-f]{40}$/.test(rollbackSha)) throw new Error('ROLLBACK_SHA must be a full lowercase 40-character commit SHA')
if (rollbackSha === targetSha) throw new Error('ROLLBACK_SHA must be distinct from the release SHA')
const authorizedMainSha = assertRemoteMainUnchanged(targetSha)

run('node', [writeReleaseFingerprint], {
  NEXT_PUBLIC_URAI_BUILD_SHA: targetSha,
  URAI_TARGET_SHA: targetSha,
  ROLLBACK_SHA: rollbackSha,
  FIREBASE_PROJECT_ID: project,
  URAI_EXPECTED_FIREBASE_PROJECT: expectedProject,
  URAI_LIVE_BASE_URL: liveUrl,
})
run('pnpm', ['build:static'], { NEXT_PUBLIC_URAI_BUILD_SHA: targetSha, ROLLBACK_SHA: rollbackSha })
requireFile('urai-tier1/out/index.html')
requireFile('urai-tier1/out/release-fingerprint.json')
const files = walk('urai-tier1/out')
const htmlFiles = files.filter((file) => file.endsWith('.html'))
if (!htmlFiles.some((file) => readFileSync(file, 'utf8').includes(targetSha))) {
  throw new Error('Static output does not contain the exact release SHA')
}
const fingerprint = JSON.parse(readFileSync('urai-tier1/out/release-fingerprint.json', 'utf8'))
if (fingerprint.releaseSha !== targetSha || fingerprint.rollbackSha !== rollbackSha) {
  throw new Error('Static release fingerprint does not match release and rollback SHAs')
}
const receiptPath = writeReceipt(targetSha, 'built-awaiting-deploy', {
  authorizedMainSha,
  outputFileCount: files.length,
  htmlFileCount: htmlFiles.length,
  indexSha256: sha256('urai-tier1/out/index.html'),
  fingerprintSha256: sha256('urai-tier1/out/release-fingerprint.json'),
})

const preDeployMainSha = assertRemoteMainUnchanged(targetSha)
deployHostingWithTemporaryCredentials()
if (liveUrl) run('node', [postDeploySmoke], {
  URAI_DEPLOY_URL: liveUrl,
  URAI_EXPECTED_DEPLOYED_SHA: targetSha,
  URAI_EXPECTED_ROLLBACK_SHA: rollbackSha,
})
writeReceipt(targetSha, 'deployed', {
  authorizedMainSha,
  preDeployMainSha,
  outputFileCount: files.length,
  htmlFileCount: htmlFiles.length,
  indexSha256: sha256('urai-tier1/out/index.html'),
  fingerprintSha256: sha256('urai-tier1/out/release-fingerprint.json'),
  previousReceipt: receiptPath,
})
console.log('[URAI release] Static Hosting deployment completed.')
