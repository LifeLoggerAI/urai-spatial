import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const postDeploy = fs.readFileSync(new URL('../../scripts/urai-post-deploy-smoke.mjs', import.meta.url), 'utf8')
const releaseControl = fs.readFileSync(new URL('../../scripts/urai-release-control-smoke.mjs', import.meta.url), 'utf8')
const publicProof = fs.readFileSync(new URL('../../.github/workflows/public-institutional-surface-proof.yml', import.meta.url), 'utf8')

const publicRoutes = ['/support', '/about', '/contact', '/event', '/glass', '/offline', '/report-bug']
const fullVisionRoutes = ['/life-movie', '/council', '/spatial/memory-world', '/spatial/interpretive-world', '/spatial/captured-reality', '/spatial/ar-vr']

test('post-deploy parity includes current Focus, Replay and institutional public owners', () => {
  assert.ok(postDeploy.includes("'URAI Focus stellar memory field'"))
  assert.ok(postDeploy.includes("'data-focus-spatial'"))
  assert.equal(postDeploy.includes("'Selected memory chamber.'"), false)
  assert.ok(postDeploy.includes("'cinematic-replay-client'"))
  assert.ok(postDeploy.includes("'r3f-immersive-memory-field'"))

  for (const route of [...publicRoutes, ...fullVisionRoutes]) {
    assert.ok(postDeploy.includes(`['${route}',`), `missing static post-deploy contract for ${route}`)
  }

  assert.ok(postDeploy.includes("schemaVersion: 'urai-live-content-parity-5'"))
  assert.ok(postDeploy.includes("browserCompatibilityRoutes: ['/privacy', '/ascent/life-map']"))
})

test('release-control browser smoke covers public routes and compatibility redirects', () => {
  for (const route of [...publicRoutes, ...fullVisionRoutes]) {
    assert.ok(releaseControl.includes(`'${route}'`), `missing browser release route ${route}`)
  }

  assert.ok(releaseControl.includes("['/privacy', { pathname: '/privacy-controls', searchEntries: [['from', 'privacy']] }]"))
  assert.ok(releaseControl.includes("['/ascent/life-map', { pathname: '/life-map', searchEntries: [['from', 'ascent-life-map']] }]"))
  assert.ok(releaseControl.includes("transition: 'compatibility-route'"))
  assert.ok(releaseControl.includes("schemaVersion: 'urai-release-control-smoke-7'"))
})

test('public institutional proof is eligible on integration branches', () => {
  assert.ok(publicProof.includes("'integration/**'"))
})
