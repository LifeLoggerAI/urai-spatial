#!/usr/bin/env node

import { readFileSync } from 'node:fs'

const releaseOnly = [
  '.github/workflows/spatial-production-lock.yml',
  '.github/workflows/aaa-final-proof.yml',
  '.github/workflows/urai-spatial-lock.yml',
  '.github/workflows/urai-spatial-release-certification.yml',
  '.github/workflows/spatial-live-deploy.yml',
]

const failures = []

for (const file of releaseOnly) {
  const source = readFileSync(file, 'utf8')
  const triggerBlock = source.split('\njobs:')[0]

  if (/\n\s*pull_request\s*:/.test(triggerBlock)) {
    failures.push(`${file} must not run its heavy release suite on every pull request`)
  }
  if (!/\n\s*workflow_dispatch\s*:/.test(triggerBlock)) {
    failures.push(`${file} must retain an explicit manual release path`)
  }
  if (!/\n\s*push\s*:/.test(triggerBlock) || !/branches:\s*(?:\n\s*-\s*main|\[main\])/.test(triggerBlock)) {
    failures.push(`${file} must retain merged-main verification`)
  }
  if (!source.includes('pnpm install --frozen-lockfile')) {
    failures.push(`${file} must keep frozen dependency installation`)
  }
}

const deploy = readFileSync('.github/workflows/spatial-live-deploy.yml', 'utf8')
if (!deploy.includes("if: github.event_name == 'workflow_dispatch' && github.event.inputs.deploy == 'DEPLOY'")) {
  failures.push('spatial-live-deploy.yml must require explicit manual DEPLOY authorization')
}
if (deploy.includes('URAI_SPATIAL_AUTO_DEPLOY')) {
  failures.push('spatial-live-deploy.yml must not permit automatic production deployment from a repository variable')
}
if (!deploy.includes('environment: production')) {
  failures.push('spatial-live-deploy.yml must use the protected production environment')
}
if (!deploy.includes('Remove Firebase credential file')) {
  failures.push('spatial-live-deploy.yml must clean up the temporary service-account file')
}

if (failures.length) {
  console.error('Workflow phase-boundary check failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`Workflow phase-boundary check passed for ${releaseOnly.length} release workflows.`)
