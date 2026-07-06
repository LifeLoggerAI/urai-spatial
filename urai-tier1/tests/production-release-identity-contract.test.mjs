import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const layout = await readFile(new URL('../src/app/layout.tsx', import.meta.url), 'utf8')
const deployScript = await readFile(new URL('../../scripts/deploy-exact-static-release.mjs', import.meta.url), 'utf8')
const deployWorkflow = await readFile(new URL('../../.github/workflows/spatial-exact-production-deploy.yml', import.meta.url), 'utf8')
const parityScript = await readFile(new URL('../scripts/verify-live-content-parity.mjs', import.meta.url), 'utf8')
const parityWorkflow = await readFile(new URL('../../.github/workflows/live-content-parity.yml', import.meta.url), 'utf8')

test('public markup embeds a build SHA only when it is a full commit SHA', () => {
  assert.match(layout, /NEXT_PUBLIC_URAI_BUILD_SHA/)
  assert.match(layout, /\^\[0-9a-f\]\{40\}\$/)
  assert.match(layout, /'urai-deployed-sha': deployedSha/)
  assert.match(layout, /data-deployed-sha=\{deployedSha\}/)
  assert.match(layout, /data-deployment-evidence=/)
})

test('production deploy requires exact target and rollback authority', () => {
  for (const marker of [
    'URAI_TARGET_SHA',
    'URAI_ROLLBACK_SHA',
    'NEXT_PUBLIC_URAI_BUILD_SHA',
    'DEPLOY VERIFIED URAI',
    'git merge-base --is-ancestor',
    'firebase.static.json',
    'production-release-',
    'Post-deploy live content or SHA verification failed',
  ]) {
    assert.ok(deployScript.includes(marker), `deploy script must include ${marker}`)
  }
  assert.match(deployWorkflow, /workflow_dispatch:/)
  assert.match(deployWorkflow, /target_sha:/)
  assert.match(deployWorkflow, /rollback_sha:/)
  assert.match(deployWorkflow, /environment:\s+name: production/)
  assert.match(deployWorkflow, /persist-credentials: false/)
})

test('live parity fails closed on route markers and exact deployed SHA', () => {
  assert.match(parityScript, /Expected deployed SHA must be a full lowercase commit SHA/)
  assert.match(parityScript, /data-deployed-sha/)
  assert.match(parityScript, /URAI Privacy Controls/)
  assert.match(parityScript, /Production certification pending\./)
  assert.match(parityScript, /deployedSha === expectedSha/)
  assert.match(parityWorkflow, /VERIFY LIVE URAI/)
  assert.match(parityWorkflow, /expected_deployed_sha:/)
  assert.doesNotMatch(parityWorkflow, /\npush:/)
})
