#!/usr/bin/env node

import { existsSync, lstatSync, readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const deployRequested = process.argv.includes('--deploy') || process.argv.includes('--deploy-prebuilt')
const prebuiltRequested = process.argv.includes('--deploy-prebuilt')
const checkRequested = process.argv.includes('--check') || !deployRequested

const forbiddenCredentialEnv = [
  'FIREBASE_SERVICE_ACCOUNT_JSON',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_TOKEN',
]

for (const name of forbiddenCredentialEnv) {
  if (String(process.env[name] || '').trim()) {
    throw new Error(`Refusing long-lived Firebase credential environment variable: ${name}`)
  }
}

function requireValue(name) {
  const value = String(process.env[name] || '').trim()
  if (!value) throw new Error(`Missing required governed release value: ${name}`)
  return value
}

function assertExternalAccountAdc() {
  const credentialPath = requireValue('GOOGLE_APPLICATION_CREDENTIALS')
  const stats = lstatSync(credentialPath)
  if (!stats.isFile() || stats.isSymbolicLink()) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS must be a regular non-symlinked file')
  }
  const record = JSON.parse(readFileSync(credentialPath, 'utf8'))
  if (!record || typeof record !== 'object' || Array.isArray(record) || record.type !== 'external_account') {
    throw new Error('Production deployment requires short-lived external_account WIF ADC')
  }
  for (const field of ['private_key', 'private_key_id', 'client_email']) {
    if (record[field]) throw new Error(`Long-lived service-account field is prohibited in release ADC: ${field}`)
  }
}

if (deployRequested) {
  if (!prebuiltRequested) throw new Error('Production deployment accepts only --deploy-prebuilt')
  if (process.env.GITHUB_ACTIONS !== 'true') throw new Error('Production deployment is restricted to GitHub Actions')
  if (process.env.GITHUB_REF !== 'refs/heads/main') throw new Error('Production deployment is restricted to main')
  if (requireValue('URAI_GOVERNED_DEPLOY_AUTHORIZED') !== 'DEPLOY_URAI_APP') {
    throw new Error('Production deployment requires URAI_GOVERNED_DEPLOY_AUTHORIZED=DEPLOY_URAI_APP')
  }

  const releaseSha = requireValue('URAI_RELEASE_SHA')
  if (!/^[0-9a-f]{40}$/.test(releaseSha)) throw new Error('URAI_RELEASE_SHA must be a 40-character commit SHA')
  if (releaseSha !== requireValue('GITHUB_SHA')) throw new Error('Release SHA must equal the exact GitHub workflow SHA')

  const rollbackReceipt = requireValue('URAI_HOSTING_RECOVERY_RECEIPT')
  if (!existsSync(rollbackReceipt)) throw new Error('Hosting rollback receipt must exist before deployment')
  if (!existsSync('urai-tier1/out/index.html')) throw new Error('Prebuilt static output is missing')

  assertExternalAccountAdc()

  const command = [
    'pnpm',
    'exec',
    'firebase',
    'deploy',
    '--config',
    'firebase.static.json',
    '--only',
    'hosting',
    '--project',
    'urai-4dc1d',
    '--non-interactive',
  ]

  const result = spawnSync('corepack', command, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`Firebase Hosting deployment failed with exit status ${result.status}`)

  console.log(`URAI governed Firebase Hosting deployment completed for ${releaseSha}`)
}

if (checkRequested) {
  console.log('URAI Spatial production release operator: PREPARED / fail-closed')
  console.log('Deployment requires exact-main GitHub Actions authority, green governance, WIF ADC, prebuilt output, and rollback receipt.')
}
