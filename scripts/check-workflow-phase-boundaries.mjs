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

for (const file of releaseOnly) {
  const source = readRequired(file)
  const triggerBlock = triggerBlockFor(source)

  if (/\n\s*pull_request\s*:/.test(triggerBlock)) {
    failures.push(`${file} must not run its heavy release suite on every pull request`)
  }
  if (!/\n\s*workflow_dispatch\s*:/.test(triggerBlock)) {
    failures.push(`${file} must retain an explicit manual release path`)
  }
  if (!mergedMainTrigger.test(triggerBlock)) {
    failures.push(`${file} must retain merged-main verification`)
  }
  if (!source.includes('pnpm install --frozen-lockfile')) {
    failures.push(`${file} must keep frozen dependency installation`)
  }
}

const deployPath = '.github/workflows/spatial-live-deploy.yml'
const deploy = readRequired(deployPath)
const manualDeployCondition = /if:\s*github\.event_name\s*==\s*['"]workflow_dispatch['"]\s*&&\s*github\.event\.inputs\.deploy\s*==\s*['"]DEPLOY['"]/
const productionEnvironment = /environment\s*:\s*(?:['"]?production['"]?|\r?\n\s*name\s*:\s*['"]?production['"]?)/

if (!manualDeployCondition.test(deploy)) {
  failures.push('spatial-live-deploy.yml must require explicit manual DEPLOY authorization')
}
if (deploy.includes('URAI_SPATIAL_AUTO_DEPLOY')) {
  failures.push('spatial-live-deploy.yml must not permit automatic production deployment from a repository variable')
}
if (!productionEnvironment.test(deploy)) {
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
