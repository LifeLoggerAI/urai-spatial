#!/usr/bin/env node
import { execSync } from 'node:child_process'

const CANON_PATHS = [
  'docs/canon/TIER_1_CANON_STANDARDS.md',
  'urai-tier1/src/canon/tier1.ts',
  'urai-tier1/src/canon/tier1.schema.ts',
  'CANON_MIGRATION_PROCESS.md',
]

function runDiff(command) {
  const out = execSync(command, { encoding: 'utf8' }).trim()
  return out ? out.split('\n').filter(Boolean) : []
}

function changedFiles() {
  const workingTree = runDiff('git diff --name-only')
  if (workingTree.length > 0) return workingTree

  const baseRef = process.env.CANON_DIFF_BASE
    ?? (process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : null)

  try {
    if (baseRef) return runDiff(`git diff --name-only ${baseRef}...HEAD`)
  } catch {}
  try {
    return runDiff('git diff --name-only HEAD~1..HEAD')
  } catch {
    return runDiff('git diff --name-only')
  }
}

const changed = changedFiles()
const canonTouched = changed.some((f) => CANON_PATHS.includes(f))
if (!canonTouched) {
  console.log('Tier-1 canon lock check: no canon edits detected.')
  process.exit(0)
}

const markerChanged = changed.some((f) => f.startsWith('.canon-migration/') && f.endsWith('.md'))
if (!markerChanged) {
  console.error('Tier-1 canon lock violation: canonical files changed without .canon-migration/*.md marker.')
  process.exit(1)
}

console.log('Tier-1 canon lock check: canonical edits include migration marker.')
