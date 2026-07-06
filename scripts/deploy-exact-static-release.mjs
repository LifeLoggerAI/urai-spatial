#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const CONFIRMATION = 'DEPLOY VERIFIED URAI'
const CANONICAL_PROJECT = 'urai-4dc1d'
const CANONICAL_URL = 'https://urai.app'
const GENERATED_RECEIPT = 'urai-tier1/src/data/release-receipt.json'
const commitPattern = /^[0-9a-f]{40}$/

const confirmation = process.env.URAI_DEPLOY_CONFIRM || ''
const targetSha = process.env.URAI_TARGET_SHA || ''
const rollbackSha = process.env.URAI_ROLLBACK_SHA || ''
const firebaseProject = process.env.URAI_FIREBASE_PROJECT || CANONICAL_PROJECT
const liveBaseUrl = (process.env.URAI_LIVE_BASE_URL || CANONICAL_URL).replace(/\/$/, '')
const receiptDirectory = resolve(
  process.cwd(),
  process.env.URAI_DEPLOY_RECEIPT_DIR || `deployment-receipt/production-release-${targetSha || 'invalid'}`,
)
const receiptPath = join(receiptDirectory, 'deployment.json')
const artifactManifestPath = join(receiptDirectory, 'static-artifact-manifest.json')

function fail(message) {
  throw new Error(message)
}

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    env: { ...process.env, ...options.env },
  })
}

function git(...args) {
  return run('git', args, { capture: true }).trim()
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function fileSha256(file) {
  return sha256(readFileSync(file))
}

function dirtyPaths() {
  const output = git('status', '--porcelain')
  if (!output) return []
  return output.split('\n').filter(Boolean).map((line) => {
    const raw = line.slice(3).trim()
    return raw.includes(' -> ') ? raw.split(' -> ').at(-1) : raw
  })
}

function validateAuthority() {
  if (confirmation !== CONFIRMATION) fail('URAI_DEPLOY_CONFIRM must equal DEPLOY VERIFIED URAI')
  if (!commitPattern.test(targetSha)) fail('URAI_TARGET_SHA must be a full lowercase 40-character SHA')
  if (!commitPattern.test(rollbackSha)) fail('URAI_ROLLBACK_SHA must be a full lowercase 40-character SHA')
  if (targetSha === rollbackSha) fail('Target and rollback SHAs must differ')
  if (firebaseProject !== CANONICAL_PROJECT) fail(`URAI_FIREBASE_PROJECT must equal ${CANONICAL_PROJECT}`)

  const parsedLiveUrl = new URL(liveBaseUrl)
  if (parsedLiveUrl.origin !== CANONICAL_URL || parsedLiveUrl.pathname !== '/') {
    fail(`URAI_LIVE_BASE_URL must equal ${CANONICAL_URL}`)
  }

  const head = git('rev-parse', 'HEAD')
  if (head !== targetSha) fail(`Checked-out SHA ${head} does not equal target ${targetSha}`)

  const dirty = dirtyPaths()
  const unexpected = dirty.filter((entry) => entry !== GENERATED_RECEIPT)
  if (unexpected.length) fail(`Release workspace contains unauthorized changes: ${unexpected.join(', ')}`)

  git('cat-file', '-e', `${rollbackSha}^{commit}`)
  git('fetch', 'origin', 'main', '--depth=200')
  run('git', ['merge-base', '--is-ancestor', targetSha, 'origin/main'])
  run('git', ['merge-base', '--is-ancestor', rollbackSha, targetSha])

  return dirty
}

const contracts = [
  { path: '/', required: ['You are standing at the threshold', 'Ground', 'Life Map'] },
  { path: '/ground/', required: ['Your private floor is open', 'Privacy sanctuary', 'Logistics bay'] },
  { path: '/life-map/', required: ['Your memory constellation is online', 'The Quiet Reset', 'Enter Focus'] },
  { path: '/focus/?memoryId=quiet-reset', required: ['Selected memory chamber', 'The Quiet Reset', 'Enter Replay'] },
  { path: '/replay/?memoryId=quiet-reset&manifestId=replay-recovery-thread', required: ['Cinematic memory film', 'Replay the thread'] },
  { path: '/mirror/', required: ['See the pattern clearly', 'Pattern intelligence', 'Consent layer'] },
  { path: '/passport/', required: ['Your life stays yours', 'Identity', 'Provenance', 'Portability'] },
  {
    path: '/privacy-controls/',
    required: ['URAI Privacy Controls', 'Choose what the world can hold', 'Model access'],
    forbidden: ['Home threshold', 'The ground opens your private real-life world'],
  },
  {
    path: '/status/',
    required: ['Evidence Control Room', 'Production certification pending', 'Certification boundary'],
    forbidden: ['World online. Route matrix visible', 'Primary Live'],
  },
]

function variants(pathname) {
  const parsed = new URL(pathname, `${CANONICAL_URL}/`)
  if (parsed.pathname === '/') return [parsed]
  const noSlash = new URL(parsed)
  noSlash.pathname = noSlash.pathname.replace(/\/$/, '')
  const slash = new URL(noSlash)
  slash.pathname = `${noSlash.pathname}/`
  return [noSlash, slash]
}

function readDeployedSha(response, html) {
  const header = response.headers.get('x-urai-commit-sha') || response.headers.get('x-deployed-sha')
  const metadata = html.match(/(?:data-deployed-sha|name=["']urai-deployed-sha["']\s+content)=["']([0-9a-f]{40})["']/i)?.[1]
  return (header || metadata || '').toLowerCase()
}

async function inspect(url, contract) {
  const response = await fetch(url, {
    redirect: 'follow',
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
    headers: {
      accept: 'text/html,application/xhtml+xml',
      'cache-control': 'no-cache',
      'user-agent': 'urai-exact-static-release/1.1',
    },
  })
  const html = await response.text()
  const finalUrl = new URL(response.url)
  const expectedUrl = new URL(url)
  const deployedSha = readDeployedSha(response, html)
  const missing = contract.required.filter((marker) => !html.includes(marker))
  const forbidden = (contract.forbidden || []).filter((marker) => html.includes(marker))
  const pathPreserved = finalUrl.pathname.replace(/\/$/, '') === expectedUrl.pathname.replace(/\/$/, '')
  const queryPreserved = finalUrl.search === expectedUrl.search
  const sameOrigin = finalUrl.origin === CANONICAL_URL
  const htmlResponse = (response.headers.get('content-type') || '').toLowerCase().includes('text/html')
  const shaMatches = deployedSha === targetSha
  const passed = response.ok && response.status === 200 && sameOrigin && pathPreserved && queryPreserved && htmlResponse && missing.length === 0 && forbidden.length === 0 && shaMatches

  return {
    requestedUrl: url.toString(),
    finalUrl: finalUrl.toString(),
    status: response.status,
    contentType: response.headers.get('content-type'),
    contentSha256: sha256(html),
    bytes: Buffer.byteLength(html),
    deployedSha: deployedSha || null,
    expectedSha: targetSha,
    shaMatches,
    sameOrigin,
    pathPreserved,
    queryPreserved,
    missing,
    forbidden,
    passed,
  }
}

async function verifyLive() {
  const results = []
  for (const contract of contracts) {
    for (const url of variants(contract.path)) results.push(await inspect(url, contract))
  }
  return {
    passed: results.every((result) => result.passed),
    checkedAt: new Date().toISOString(),
    results,
  }
}

function requiredStaticFiles() {
  return [
    'index.html',
    'ground/index.html',
    'life-map/index.html',
    'focus/index.html',
    'replay/index.html',
    'mirror/index.html',
    'passport/index.html',
    'privacy-controls/index.html',
    'status/index.html',
  ]
}

function walkFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = join(directory, entry.name)
    return entry.isDirectory() ? walkFiles(absolute) : entry.isFile() ? [absolute] : []
  })
}

function createStaticManifest() {
  const outRoot = resolve(process.cwd(), 'urai-tier1/out')
  for (const file of requiredStaticFiles()) readFileSync(join(outRoot, file))
  const files = walkFiles(outRoot).sort().map((file) => ({
    path: relative(outRoot, file).replaceAll('\\', '/'),
    bytes: statSync(file).size,
    sha256: fileSha256(file),
  }))
  const payload = {
    schemaVersion: 'urai-static-artifact-manifest-1',
    sourceSha: targetSha,
    generatedAt: new Date().toISOString(),
    fileCount: files.length,
    files,
  }
  const serialized = `${JSON.stringify(payload, null, 2)}\n`
  writeFileSync(artifactManifestPath, serialized)
  return { fileCount: files.length, sha256: sha256(serialized), path: artifactManifestPath }
}

async function main() {
  mkdirSync(receiptDirectory, { recursive: true })
  const receipt = {
    schemaVersion: 'urai-exact-static-release-1',
    releaseId: `production-release-${targetSha}`,
    repository: process.env.GITHUB_REPOSITORY || 'LifeLoggerAI/urai-spatial',
    workflowRun: process.env.GITHUB_RUN_ID || null,
    firebaseProject,
    liveBaseUrl,
    targetSha,
    rollbackSha,
    startedAt: new Date().toISOString(),
    status: 'running',
    generatedInputs: null,
    staticArtifact: null,
    deployment: null,
    verification: null,
    rollbackCommand: `git checkout ${rollbackSha} && pnpm exec firebase deploy --project ${firebaseProject} --config firebase.static.json --only hosting`,
  }
  writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`)

  try {
    const allowedDirtyPaths = validateAuthority()
    receipt.generatedInputs = {
      allowedDirtyPaths,
      releaseReceiptPath: GENERATED_RECEIPT,
      releaseReceiptSha256: fileSha256(resolve(process.cwd(), GENERATED_RECEIPT)),
    }

    run('pnpm', ['install', '--frozen-lockfile'])
    run('pnpm', ['lock:static'])
    run('pnpm', ['typecheck'])
    run('pnpm', ['build:static'], {
      env: {
        NEXT_PUBLIC_URAI_BUILD_SHA: targetSha,
        URAI_FIREBASE_STATIC_EXPORT: 'true',
      },
    })
    receipt.staticArtifact = createStaticManifest()

    run('pnpm', ['exec', 'firebase', 'deploy', '--project', firebaseProject, '--config', 'firebase.static.json', '--only', 'hosting'])
    receipt.deployment = {
      completedAt: new Date().toISOString(),
      target: firebaseProject,
      config: 'firebase.static.json',
      service: 'hosting',
    }

    let verification
    for (let attempt = 1; attempt <= 12; attempt += 1) {
      verification = await verifyLive()
      verification.attempt = attempt
      if (verification.passed) break
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 5_000))
    }
    receipt.verification = verification
    if (!verification?.passed) fail('Post-deploy live content or SHA verification failed')

    receipt.status = 'verified-live'
    receipt.completedAt = new Date().toISOString()
    writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`)
    console.log(JSON.stringify(receipt, null, 2))
  } catch (error) {
    receipt.status = 'failed'
    receipt.completedAt = new Date().toISOString()
    receipt.error = error instanceof Error ? error.message : String(error)
    writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`)
    console.error(JSON.stringify(receipt, null, 2))
    process.exitCode = 1
  }
}

await main()
