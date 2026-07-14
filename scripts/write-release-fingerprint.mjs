#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const releaseSha = (process.env.NEXT_PUBLIC_URAI_BUILD_SHA || process.env.URAI_TARGET_SHA || process.env.GITHUB_SHA || '').trim()
const rollbackSha = (process.env.ROLLBACK_SHA || process.env.URAI_ROLLBACK_SHA || '').trim()
const authoritySha = (process.env.CURRENT_MAIN_SHA || process.env.URAI_AUTHORITY_SHA || '').trim()
const project = (process.env.URAI_EXPECTED_FIREBASE_PROJECT || process.env.FIREBASE_PROJECT_ID || 'urai-4dc1d').trim()
const liveUrl = (process.env.URAI_LIVE_BASE_URL || process.env.LIVE_URL || 'https://urai.app').trim()
const canonicalRepository = 'LifeLoggerAI/urai-spatial'
const repository = (process.env.GITHUB_REPOSITORY || canonicalRepository).trim()

if (!/^[0-9a-f]{40}$/.test(releaseSha)) throw new Error('Release fingerprint requires a full lowercase release SHA')
if (!/^[0-9a-f]{40}$/.test(rollbackSha)) throw new Error('Release fingerprint requires a full lowercase rollback SHA')
if (!/^[0-9a-f]{40}$/.test(authoritySha)) throw new Error('Release fingerprint requires a full lowercase authority SHA')
if (releaseSha === rollbackSha) throw new Error('Release and rollback SHAs must be distinct')
if (repository !== canonicalRepository) throw new Error(`Release fingerprint repository mismatch: ${repository || 'missing'}`)
if (project !== 'urai-4dc1d') throw new Error(`Release fingerprint project mismatch: ${project}`)
let parsedLiveUrl
try {
  parsedLiveUrl = new URL(liveUrl)
} catch {
  throw new Error(`Release fingerprint live URL is invalid or missing: ${liveUrl}`)
}
if (parsedLiveUrl.origin !== 'https://urai.app') throw new Error(`Release fingerprint live URL mismatch: ${liveUrl}`)

const fingerprint = {
  schemaVersion: 'urai-release-fingerprint-1',
  generatedAt: new Date().toISOString(),
  repository: canonicalRepository,
  authoritySha,
  releaseSha,
  rollbackSha,
  firebaseProject: project,
  liveUrl: 'https://urai.app',
  deploymentScope: 'hosting-only',
  certification: 'pending-post-deploy-smoke',
  workflowRunId: process.env.GITHUB_RUN_ID || null,
}

const destination = path.join('urai-tier1', 'public', 'release-fingerprint.json')
mkdirSync(path.dirname(destination), { recursive: true })
writeFileSync(destination, `${JSON.stringify(fingerprint, null, 2)}\n`)
console.log(JSON.stringify({ destination, authoritySha, releaseSha, rollbackSha }, null, 2))
