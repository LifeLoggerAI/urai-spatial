#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const workflowPath = path.resolve(
  process.cwd(),
  '.github/workflows/spatial-live-deploy.yml',
)
const source = fs.readFileSync(workflowPath, 'utf8')

const fail = (message) => {
  console.error(`Production deploy authority check failed: ${message}`)
  process.exit(1)
}

if (!source.includes('workflow_dispatch:')) {
  fail('production deployment must have an explicit manual dispatch authority')
}
if (!source.includes('target_sha:')) {
  fail('manual production deployment must require an exact target_sha input')
}
if (!source.includes('rollback_sha:')) {
  fail('manual production deployment must require a distinct rollback_sha input')
}
if (source.includes('URAI_SPATIAL_AUTO_DEPLOY')) {
  fail('automatic production deployment variables are prohibited')
}
if (/github\.event_name\s*==\s*['"]push['"]/.test(source)) {
  fail('the production deploy job must not run from a push event')
}
if (!/ref:\s*\$\{\{\s*(?:github\.event\.inputs|inputs)\.target_sha\s*\}\}/.test(source)) {
  fail('the production deploy checkout must use the declared target_sha input')
}
if (!/environment:\s*(?:\n\s+name:\s*)?production/m.test(source)) {
  fail('the production deploy job must use the production environment')
}
if (!source.includes('urai-4dc1d')) {
  fail('the canonical Firebase project must be asserted before deployment')
}
if (!source.includes('https://urai.app')) {
  fail('the canonical public domain must be asserted before deployment')
}

console.log(JSON.stringify({
  check: 'production-deploy-authority',
  workflow: '.github/workflows/spatial-live-deploy.yml',
  manualOnly: true,
  exactTargetRequired: true,
  rollbackRequired: true,
  firebaseProject: 'urai-4dc1d',
  publicDomain: 'https://urai.app',
  status: 'pass',
}, null, 2))
