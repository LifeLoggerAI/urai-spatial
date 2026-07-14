#!/usr/bin/env node

import { readFileSync } from 'node:fs'

const releaseWorkflows = [
  '.github/workflows/spatial-production-lock.yml',
  '.github/workflows/aaa-final-proof.yml',
  '.github/workflows/urai-spatial-lock.yml',
  '.github/workflows/urai-spatial-release-certification.yml',
  '.github/workflows/spatial-live-deploy.yml',
]

const failures = []

const readRequired = (file) => {
  try {
    return readFileSync(file, 'utf8')
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    failures.push(`Could not read ${file}: ${detail}`)
    return ''
  }
}

const triggerBlockFor = (source) => source.split(/\r?\n\s*jobs\s*:/)[0]
const mergedMainTrigger = /\n\s*push\s*:[\s\S]*?branches\s*:\s*(?:\r?\n\s*-\s*['"]?main['"]?|\[\s*['"]?main['"]?\s*\])/

for (const file of releaseWorkflows) {
  const source = readRequired(file)
  const triggerBlock = triggerBlockFor(source)

  if (!/\n\s*workflow_dispatch\s*:/.test(triggerBlock)) {
    failures.push(`${file} must retain an explicit manual verification or release path`)
  }
  if (!mergedMainTrigger.test(triggerBlock)) {
    failures.push(`${file} must retain merged-main verification`)
  }
  if (!source.includes('pnpm install --frozen-lockfile')) {
    failures.push(`${file} must keep frozen dependency installation`)
  }
  if (source.includes('URAI_SPATIAL_AUTO_DEPLOY')) {
    failures.push(`${file} must not permit automatic production deployment from a repository variable`)
  }
}

const deployPath = '.github/workflows/spatial-live-deploy.yml'
const deploy = readRequired(deployPath)
const productionEnvironment = /environment\s*:\s*(?:['"]?production['"]?|\r?\n\s*name\s*:\s*['"]?production['"]?)/
const deployJobStart = deploy.indexOf('\n  deploy:')
const deployJob = deployJobStart >= 0 ? deploy.slice(deployJobStart) : ''

if (deployJobStart < 0) {
  failures.push('spatial-live-deploy.yml must retain the protected deploy job')
}
if (!deployJob.includes("github.event_name == 'workflow_dispatch'")) {
  failures.push('spatial-live-deploy.yml deploy job must require manual workflow dispatch')
}
if (!deployJob.includes("github.ref == 'refs/heads/main'")) {
  failures.push('spatial-live-deploy.yml deploy job must require refs/heads/main')
}
if (!deployJob.includes("inputs.confirm == 'DEPLOY_URAI_APP'") || !deployJob.includes("inputs.confirm == 'ROLLBACK_URAI_APP'")) {
  failures.push('spatial-live-deploy.yml must retain explicit deploy and rollback confirmations')
}
if (!productionEnvironment.test(deployJob)) {
  failures.push('spatial-live-deploy.yml must use the protected production environment')
}
if (!deployJob.includes('FIREBASE_SERVICE_ACCOUNT_JSON: ${{ secrets.FIREBASE_SERVICE_ACCOUNT_JSON }}')) {
  failures.push('spatial-live-deploy.yml must use the protected service-account secret')
}
if (!deployJob.includes('GOOGLE_APPLICATION_CREDENTIALS: ${{ runner.temp }}/urai-firebase-service-account.json')) {
  failures.push('spatial-live-deploy.yml must isolate credentials in a temporary file')
}
if (deploy.includes('FIREBASE_TOKEN')) {
  failures.push('spatial-live-deploy.yml must not restore legacy Firebase CLI tokens')
}
if (!deploy.includes('Remove temporary credentials')) {
  failures.push('spatial-live-deploy.yml must clean up the temporary service-account file')
}
if (!deploy.includes('persist-credentials: false')) {
  failures.push('spatial-live-deploy.yml must not retain repository checkout credentials')
}

const verifyBundleIndex = deploy.indexOf('node scripts/live-release.mjs --verify-prebuilt')
const credentialIndex = deploy.indexOf('FIREBASE_SERVICE_ACCOUNT_JSON: ${{ secrets.FIREBASE_SERVICE_ACCOUNT_JSON }}')
const deployIndex = deploy.indexOf('node scripts/live-release.mjs --deploy-prebuilt')
const cleanupIndex = deploy.indexOf('Remove temporary credentials')

if (verifyBundleIndex < 0 || credentialIndex <= verifyBundleIndex) {
  failures.push('spatial-live-deploy.yml must verify the release bundle before production credentials exist')
}
if (deployIndex <= credentialIndex) {
  failures.push('spatial-live-deploy.yml must deploy only after ephemeral credentials are scoped')
}
if (cleanupIndex <= deployIndex) {
  failures.push('spatial-live-deploy.yml must remove temporary credentials after the deployment attempt')
}

if (failures.length) {
  console.error('Workflow phase-boundary check failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`Workflow phase-boundary check passed for ${releaseWorkflows.length} release workflows.`)
