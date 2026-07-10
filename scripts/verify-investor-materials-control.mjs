#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const statePath = path.join(root, 'release/investor-materials-state.json')
const reviewPath = path.join(root, 'docs/founder-readiness/INVESTOR_INTERNAL_REVIEW_CONTROL.md')
const onePagerPath = path.join(root, 'docs/founder-readiness/INVESTOR_ONE_PAGER.md')
const packagePath = path.join(root, 'docs/founder-readiness/INVESTOR_PACKAGE.md')
const failures = []

for (const target of [statePath, reviewPath, onePagerPath, packagePath]) {
  if (!fs.existsSync(target)) failures.push(`${path.relative(root, target)} is missing`)
}

let state = null
if (fs.existsSync(statePath)) {
  try {
    state = JSON.parse(fs.readFileSync(statePath, 'utf8'))
  } catch (error) {
    failures.push(`investor materials state is invalid JSON: ${error instanceof Error ? error.message : String(error)}`)
  }
}

if (state) {
  if (state.schemaVersion !== 'urai-investor-materials-1') failures.push('unexpected investor materials schemaVersion')
  if (state.state !== 'internal-review-only') failures.push(`state must remain internal-review-only; found ${state.state}`)
  if (state.formalSolicitationAuthorized !== false) failures.push('formalSolicitationAuthorized must be false')
  if (state.financingTermsApproved !== false) failures.push('financingTermsApproved must be false')
  if (state.confidentialDataRoomApproved !== false) failures.push('confidentialDataRoomApproved must be false')
  if (state.selectedWedgeHypothesis?.name !== 'founder decision continuity') failures.push('selected wedge hypothesis must be founder decision continuity')
  if (state.selectedWedgeHypothesis?.status !== 'unvalidated hypothesis') failures.push('selected wedge must remain explicitly unvalidated')
  if (!Array.isArray(state.externalBlockers) || state.externalBlockers.length < 4) failures.push('external blocker registry is incomplete')
  for (const blocker of state.externalBlockers || []) {
    if (!blocker.id || !blocker.owner || !blocker.smallestUnblock) failures.push(`incomplete blocker: ${JSON.stringify(blocker)}`)
  }
}

if (fs.existsSync(reviewPath)) {
  const review = fs.readFileSync(reviewPath, 'utf8')
  for (const required of [
    '**Internal review and relationship-building only.**',
    'Primary initial test hypothesis: **founder decision continuity**.',
    'This is not a validated market claim.',
    '## Evidence-backed current statement',
    '## Risk register',
    '## Public versus confidential separation',
    'Do not create a `private-data-room` directory in this public repository.',
    '## External blockers',
  ]) {
    if (!review.includes(required)) failures.push(`investor review control is missing: ${required}`)
  }
}

const publicMaterials = [onePagerPath, packagePath, reviewPath].filter((target) => fs.existsSync(target))
const prohibited = [
  /\bguaranteed (?:investment )?returns?\b/i,
  /\brisk[- ]free investment\b/i,
  /\bguaranteed market size\b/i,
  /\bguaranteed valuation\b/i,
  /\bfully production-certified\b/i,
  /\bvalidated wedge\b/i,
]
for (const target of publicMaterials) {
  const text = fs.readFileSync(target, 'utf8')
  for (const pattern of prohibited) {
    for (const line of text.split(/\r?\n/)) {
      if (!pattern.test(line)) continue
      if (/not|no |never|prohibit|without|must not|do not|cannot|blocked/i.test(line)) continue
      failures.push(`${path.relative(root, target)} contains unsupported claim: ${line.trim()}`)
    }
  }
}

if (failures.length) {
  console.error('Investor materials control verification failed:')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log(`Investor materials control verified: ${state.state}; wedge=${state.selectedWedgeHypothesis.name}`)
