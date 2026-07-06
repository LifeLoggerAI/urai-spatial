import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync('scripts/deploy-exact-static-release.mjs', 'utf8')

const requiredTokens = [
  "const CONFIRMATION = 'DEPLOY VERIFIED URAI'",
  "const CANONICAL_PROJECT = 'urai-4dc1d'",
  "const CANONICAL_URL = 'https://urai.app'",
  "const commitPattern = /^[0-9a-f]{40}$/",
  "fail('URAI_TARGET_SHA must be a full lowercase 40-character SHA')",
  "fail('URAI_ROLLBACK_SHA must be a full lowercase 40-character SHA')",
  "if (targetSha === rollbackSha)",
  "git('status', '--porcelain')",
  "git('cat-file', '-e', `${rollbackSha}^{commit}`)",
  "run('git', ['merge-base', '--is-ancestor', targetSha, 'origin/main'])",
  "run('git', ['merge-base', '--is-ancestor', rollbackSha, targetSha])",
  "run('pnpm', ['install', '--frozen-lockfile'])",
  "run('pnpm', ['lock:static'])",
  "run('pnpm', ['typecheck'])",
  "run('pnpm', ['build:static']",
  "NEXT_PUBLIC_URAI_BUILD_SHA: targetSha",
  "'--config', 'firebase.static.json', '--only', 'hosting'",
  "Post-deploy live content or SHA verification failed",
  "schemaVersion: 'urai-exact-static-release-1'",
  "rollbackCommand:",
]

test('exact static release is fail closed and receipt backed', () => {
  for (const token of requiredTokens) assert.ok(source.includes(token), `missing release contract token: ${token}`)
})

test('canonical route chain, privacy controls, and status are verified after deploy', () => {
  for (const route of ['/', '/ground/', '/life-map/', '/focus/', '/replay/', '/mirror/', '/passport/', '/privacy-controls/', '/status/']) {
    assert.ok(source.includes(`path: '${route}`), `missing route verification contract: ${route}`)
  }
  assert.ok(source.includes("forbidden: ['Home threshold'"))
  assert.ok(source.includes("forbidden: ['World online. Route matrix visible', 'Primary Live']"))
  assert.ok(source.includes('queryPreserved'))
  assert.ok(source.includes('shaMatches'))
  assert.ok(source.includes('contentSha256'))
})

test('static output must include every canonical release surface', () => {
  for (const output of ['ground/index.html', 'life-map/index.html', 'focus/index.html', 'replay/index.html', 'mirror/index.html', 'passport/index.html', 'privacy-controls/index.html', 'status/index.html']) {
    assert.ok(source.includes(`urai-tier1/out/${output}`), `missing static output requirement: ${output}`)
  }
})
