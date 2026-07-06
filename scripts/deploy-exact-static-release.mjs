#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const targetSha = (process.env.URAI_TARGET_SHA || '').trim()
const rollbackSha = (process.env.URAI_ROLLBACK_SHA || '').trim()
const buildSha = (process.env.NEXT_PUBLIC_URAI_BUILD_SHA || '').trim()
const projectId = (process.env.FIREBASE_PROJECT_ID || '').trim()
const liveUrl = (process.env.LIVE_URL || 'https://urai.app').replace(/\/$/, '')
const confirmation = process.env.URAI_DEPLOY_CONFIRM || ''
const receiptDir = path.join(root, 'release', 'receipts')
const receiptPath = path.join(receiptDir, `production-release-${targetSha || 'invalid'}.json`)
const shaPattern = /^[0-9a-f]{40}$/

const routeContracts = [
  ['index.html', ['Own your life.', 'Ground', 'Life Map']],
  ['home/index.html', ['Own your life.']],
  ['ground/index.html', ['Your private floor is open.']],
  ['life-map/index.html', ['Your memory constellation is online.']],
  ['focus/index.html', ['Selected memory chamber', 'The Quiet Reset']],
  ['replay/index.html', ['Cinematic memory film', 'Replay the thread.']],
  ['mirror/index.html', ['URAI Mirror', 'See the pattern clearly.']],
  ['passport/index.html', ['URAI Passport', 'Your life stays yours.']],
  ['privacy-controls/index.html', ['URAI Privacy Controls', 'Choose what the world can hold.']],
  ['status/index.html', ['URAI Status · Evidence Control Room', 'Production certification pending.']],
]

function fail(message) {
  throw new Error(message)
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: { ...process.env, ...(options.env || {}) },
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  })
  if (result.stdout) process.stdout.write(result.stdout)
  if (result.stderr) process.stderr.write(result.stderr)
  if (result.error) throw result.error
  if (result.status !== 0) fail(`${command} ${args.join(' ')} failed with exit code ${result.status}`)
  return `${result.stdout || ''}${result.stderr || ''}`
}

function git(...args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
}

function assertAuthority() {
  if (confirmation !== 'DEPLOY VERIFIED URAI') fail('URAI_DEPLOY_CONFIRM must equal DEPLOY VERIFIED URAI')
  if (!shaPattern.test(targetSha)) fail('URAI_TARGET_SHA must be a full lowercase 40-character SHA')
  if (!shaPattern.test(rollbackSha)) fail('URAI_ROLLBACK_SHA must be a full lowercase 40-character SHA')
  if (!shaPattern.test(buildSha)) fail('NEXT_PUBLIC_URAI_BUILD_SHA must be a full lowercase 40-character SHA')
  if (!projectId) fail('FIREBASE_PROJECT_ID is required')
  if (targetSha !== buildSha) fail('NEXT_PUBLIC_URAI_BUILD_SHA must equal URAI_TARGET_SHA')
  if (targetSha === rollbackSha) fail('Rollback SHA must differ from target SHA')

  const head = git('rev-parse', 'HEAD')
  if (head !== targetSha) fail(`Checked-out HEAD ${head} does not match target ${targetSha}`)
  if (git('status', '--porcelain')) fail('Working tree must be clean before production deploy')

  run('git', ['cat-file', '-e', `${rollbackSha}^{commit}`])
  run('git', ['merge-base', '--is-ancestor', rollbackSha, targetSha])
}

function walkFiles(directory) {
  const files = []
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...walkFiles(absolute))
    else if (entry.isFile()) files.push(absolute)
  }
  return files.sort()
}

function digestDirectory(directory) {
  const hash = createHash('sha256')
  for (const file of walkFiles(directory)) {
    const relative = path.relative(directory, file).replaceAll(path.sep, '/')
    hash.update(relative)
    hash.update('\0')
    hash.update(fs.readFileSync(file))
    hash.update('\0')
  }
  return hash.digest('hex')
}

function assertStaticArtifact() {
  const out = path.join(root, 'urai-tier1', 'out')
  if (!fs.existsSync(out)) fail('Static export directory urai-tier1/out is missing')

  const failures = []
  for (const [relative, markers] of routeContracts) {
    const file = path.join(out, relative)
    if (!fs.existsSync(file)) {
      failures.push(`${relative}: missing`)
      continue
    }
    const html = fs.readFileSync(file, 'utf8')
    for (const marker of markers) {
      if (!html.includes(marker)) failures.push(`${relative}: missing marker ${marker}`)
    }
    if (!html.includes(targetSha)) failures.push(`${relative}: missing embedded target SHA`)
  }

  if (failures.length) fail(`Static artifact validation failed:\n- ${failures.join('\n- ')}`)
  return { out, artifactSha256: digestDirectory(out), fileCount: walkFiles(out).length }
}

async function verifyLive() {
  const results = []
  for (const [relative, markers] of routeContracts) {
    const route = relative === 'index.html' ? '/' : `/${relative.replace(/\/index\.html$/, '')}/`
    const url = `${liveUrl}${route}`
    const response = await fetch(url, {
      redirect: 'follow',
      cache: 'no-store',
      signal: AbortSignal.timeout(20_000),
      headers: { 'user-agent': 'urai-exact-release-verifier/1.0', 'cache-control': 'no-cache' },
    })
    const html = await response.text()
    const missingMarkers = markers.filter((marker) => !html.includes(marker))
    const deployedSha =
      response.headers.get('x-urai-commit-sha') ||
      response.headers.get('x-deployed-sha') ||
      html.match(/data-deployed-sha=["']([0-9a-f]{40})["']/i)?.[1] ||
      html.match(/name=["']urai-deployed-sha["'][^>]*content=["']([0-9a-f]{40})["']/i)?.[1] ||
      null
    const passed = response.ok && response.url.startsWith(liveUrl) && missingMarkers.length === 0 && deployedSha === targetSha
    results.push({ url, finalUrl: response.url, status: response.status, missingMarkers, deployedSha, passed })
  }
  if (!results.every((result) => result.passed)) fail('Post-deploy live content or SHA verification failed')
  return results
}

function writeReceipt(receipt) {
  fs.mkdirSync(receiptDir, { recursive: true })
  fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8')
}

async function main() {
  assertAuthority()
  const startedAt = new Date().toISOString()
  const receipt = {
    schemaVersion: 'urai-production-release-1',
    receiptId: `urai-spatial-${targetSha.slice(0, 12)}`,
    startedAt,
    repository: 'LifeLoggerAI/urai-spatial',
    branch: process.env.GITHUB_REF_NAME || 'unknown',
    targetSha,
    rollbackSha,
    firebaseProject: projectId,
    environment: 'production',
    publicUrl: liveUrl,
    status: 'started',
    commands: [],
    caveats: [],
  }
  writeReceipt(receipt)

  try {
    receipt.commands.push('pnpm live:check')
    run('pnpm', ['live:check'], { env: { NEXT_PUBLIC_URAI_BUILD_SHA: targetSha, NEXT_PUBLIC_URAI_ROLLBACK_SHA: rollbackSha } })

    receipt.commands.push('pnpm build:static')
    run('pnpm', ['build:static'], { env: { NEXT_PUBLIC_URAI_BUILD_SHA: targetSha, NEXT_PUBLIC_URAI_ROLLBACK_SHA: rollbackSha } })
    Object.assign(receipt, assertStaticArtifact())
    receipt.status = 'artifact-verified'
    writeReceipt(receipt)

    receipt.commands.push(`firebase deploy --config firebase.static.json --only hosting --project ${projectId}`)
    receipt.hostingProviderOutput = run('firebase', ['deploy', '--non-interactive', '--config', 'firebase.static.json', '--only', 'hosting', '--project', projectId])

    receipt.commands.push(`firebase deploy --config firebase.json --only firestore:rules,firestore:indexes,functions --project ${projectId}`)
    receipt.backendProviderOutput = run('firebase', ['deploy', '--non-interactive', '--config', 'firebase.json', '--only', 'firestore:rules,firestore:indexes,functions', '--project', projectId])

    receipt.liveResults = await verifyLive()
    receipt.status = 'verified-live'
    receipt.completedAt = new Date().toISOString()
    receipt.rollbackCommand = `git checkout ${rollbackSha} && NEXT_PUBLIC_URAI_BUILD_SHA=${rollbackSha} NEXT_PUBLIC_URAI_ROLLBACK_SHA=${targetSha} pnpm build:static && firebase deploy --non-interactive --config firebase.static.json --only hosting --project ${projectId}`
    writeReceipt(receipt)
    console.log(`Production release verified. Receipt: ${receiptPath}`)
  } catch (error) {
    receipt.status = 'failed'
    receipt.failedAt = new Date().toISOString()
    receipt.error = error instanceof Error ? error.message : String(error)
    writeReceipt(receipt)
    throw error
  }
}

main().catch((error) => {
  console.error(`[URAI exact release] ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
