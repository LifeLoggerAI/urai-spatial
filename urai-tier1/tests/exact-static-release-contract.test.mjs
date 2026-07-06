import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const hosting = JSON.parse(readFileSync('../firebase.static.json', 'utf8')).hosting
const layout = readFileSync('src/app/layout.tsx', 'utf8')
const operator = readFileSync('../scripts/live-release.mjs', 'utf8')
const verifier = readFileSync('../scripts/urai-post-deploy-smoke.mjs', 'utf8')
const workflow = readFileSync('../.github/workflows/spatial-live-deploy.yml', 'utf8')

test('static hosting publishes the canonical export without route masking', () => {
  assert.equal(hosting.public, 'urai-tier1/out')
  assert.equal(hosting.cleanUrls, true)
  assert.equal(hosting.trailingSlash, true)
  assert.deepEqual(hosting.rewrites, [])
})

test('public markup embeds exact build identity or reports unverified', () => {
  assert.match(layout, /NEXT_PUBLIC_URAI_BUILD_SHA/)
  assert.match(layout, /process\.env\.GITHUB_SHA/)
  assert.match(layout, /urai-deployed-sha/)
  assert.match(layout, /data-deployed-sha/)
  assert.match(layout, /data-deployment-evidence/)
  assert.match(layout, /unverified/)
})

test('release operator is exact-SHA, canonical-project, and hosting-only', () => {
  assert.match(operator, /Release SHA must be a full lowercase 40-character commit SHA/)
  assert.match(operator, /Checked-out SHA/)
  assert.match(operator, /urai-4dc1d/)
  assert.match(operator, /firebase\.static\.json/)
  assert.match(operator, /'--only', 'hosting'/)
  assert.doesNotMatch(operator, /hosting,firestore/)
  assert.doesNotMatch(operator, /firestore:indexes/)
  assert.doesNotMatch(operator, /functions/)
  assert.match(operator, /scripts\/urai-post-deploy-smoke\.mjs/)
  assert.match(operator, /deployment-receipt/)
})

test('post-deploy verifier checks route content, stale markers, queries, and SHA', () => {
  for (const marker of [
    'Selected memory chamber',
    'Cinematic memory film',
    'Choose what the world can hold.',
    'Production certification pending.',
    'Home threshold',
    'World online. Route matrix visible.',
  ]) assert.ok(verifier.includes(marker), `missing verifier marker: ${marker}`)
  assert.match(verifier, /URAI_EXPECTED_DEPLOYED_SHA/)
  assert.match(verifier, /finalUrl\.search === requested\.search/)
  assert.match(verifier, /sha === expectedSha/)
  assert.match(verifier, /live-content-parity/)
})

test('production deploy remains manual and protected', () => {
  assert.match(workflow, /workflow_dispatch:/)
  assert.match(workflow, /github\.event_name == 'workflow_dispatch'/)
  assert.match(workflow, /github\.event\.inputs\.deploy == 'DEPLOY'/)
  assert.match(workflow, /environment: production/)
  assert.match(workflow, /pnpm install --frozen-lockfile/)
  assert.match(workflow, /Remove Firebase credential file/)
})
