#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const statePath = path.join(root, 'release/beta-execution-state.json')
const controlPath = path.join(root, 'docs/founder-readiness/BETA_EXECUTION_CONTROL.md')
const failures = []

if (!fs.existsSync(statePath)) failures.push('release/beta-execution-state.json is missing')
if (!fs.existsSync(controlPath)) failures.push('docs/founder-readiness/BETA_EXECUTION_CONTROL.md is missing')

let state = null
if (fs.existsSync(statePath)) {
  try {
    state = JSON.parse(fs.readFileSync(statePath, 'utf8'))
  } catch (error) {
    failures.push(`beta execution state is invalid JSON: ${error instanceof Error ? error.message : String(error)}`)
  }
}

if (state) {
  if (state.schemaVersion !== 'urai-beta-execution-1') failures.push('unexpected beta execution schemaVersion')
  if (!['blocked', 'ready', 'running', 'closed'].includes(state.state)) failures.push(`invalid beta state: ${state.state}`)
  if (state.sampleDataOnly !== true) failures.push('beta state must remain sampleDataOnly until a separately approved data gate exists')
  if (state.realUserSensitiveDataAllowed !== false) failures.push('realUserSensitiveDataAllowed must remain false')
  if (state.liveBaseUrl !== 'https://urai.app') failures.push('liveBaseUrl must remain https://urai.app')
  if (!Array.isArray(state.requiredRoutes) || !state.requiredRoutes.includes('/status') || !state.requiredRoutes.includes('/privacy-controls')) failures.push('required route list must include Status and Privacy Controls')

  if (state.state === 'ready' || state.state === 'running') {
    if (!/^[0-9a-f]{40}$/.test(state.exactBuildSha || '')) failures.push('ready/running beta requires exactBuildSha')
    if (!/^[0-9a-f]{40}$/.test(state.rollbackSha || '')) failures.push('ready/running beta requires rollbackSha')
    if (!state.deploymentReceipt) failures.push('ready/running beta requires deploymentReceipt')
    if (Array.isArray(state.blockers) && state.blockers.length > 0) failures.push('ready/running beta cannot retain blockers')
  } else if (state.state === 'blocked') {
    if (!Array.isArray(state.blockers) || state.blockers.length === 0) failures.push('blocked beta state requires explicit blockers')
    for (const blocker of state.blockers || []) {
      if (!blocker.id || !blocker.owner || !blocker.smallestUnblock) failures.push(`incomplete blocker record: ${JSON.stringify(blocker)}`)
    }
  }
}

if (fs.existsSync(controlPath)) {
  const control = fs.readFileSync(controlPath, 'utf8')
  for (const required of [
    '## Start gate',
    '## Cohort operation',
    '## Exact-build receipt',
    '## Stop conditions',
    '## External blockers',
    'real-user sensitive data is not authorized',
  ]) {
    if (!control.includes(required)) failures.push(`beta execution control is missing: ${required}`)
  }
}

if (failures.length) {
  console.error('Beta execution control verification failed:')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log(`Beta execution control verified: state=${state.state}, sampleDataOnly=${state.sampleDataOnly}`)
