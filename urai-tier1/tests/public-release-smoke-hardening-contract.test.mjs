import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const postDeploy = fs.readFileSync(new URL('../../scripts/urai-post-deploy-smoke.mjs', import.meta.url), 'utf8')
const releaseControl = fs.readFileSync(new URL('../../scripts/urai-release-control-smoke.mjs', import.meta.url), 'utf8')
const publicProof = fs.readFileSync(new URL('../../.github/workflows/public-institutional-surface-proof.yml', import.meta.url), 'utf8')

const publicRoutes = ['/support', '/about', '/contact', '/event', '/glass', '/offline', '/report-bug']
const fullVisionRoutes = ['/life-movie', '/council', '/spatial/memory-world', '/spatial/interpretive-world', '/spatial/captured-reality', '/spatial/ar-vr']
const directCriticalRoutes = ['/privacy', '/terms', '/login', '/account-deletion', '/privacy-policy', '/xr', '/settings', '/settings/communications', '/sms-opt-in', '/launch']

test('post-deploy parity includes current Focus, Replay and institutional public owners', () => {
  assert.ok(postDeploy.includes("'URAI Focus stellar memory field'"))
  assert.ok(postDeploy.includes("'data-focus-spatial'"))
  assert.equal(postDeploy.includes("'Selected memory chamber.'"), false)
  assert.ok(postDeploy.includes("'cinematic-replay-client'"))
  assert.ok(postDeploy.includes("'r3f-immersive-memory-field'"))

  for (const route of [...publicRoutes, ...fullVisionRoutes, ...directCriticalRoutes]) {
    assert.ok(postDeploy.includes(`['${route}',`), `missing static post-deploy contract for ${route}`)
  }

  assert.ok(postDeploy.includes("schemaVersion: 'urai-live-content-parity-6'"))
  const compatibilityRoutes = postDeploy.match(/browserCompatibilityRoutes:\s*\[([^\]]*)\]/)?.[1] || ''
  for (const route of ['/ascent/life-map', '/waitlist', '/system', '/settings/privacy', '/onboarding', '/signup', '/ascent', '/spatial', '/unwind']) {
    assert.ok(compatibilityRoutes.includes("'" + route + "'"), 'missing static post-deploy compatibility route ' + route)
  }
})

test('post-deploy communications smoke matches the rendered SMS disclosure', () => {
  assert.ok(postDeploy.includes("'Reply STOP to opt out or HELP for help'"))
  assert.equal(postDeploy.includes("'Reply HELP'"), false)
})

test('release-control browser smoke covers public routes and compatibility redirects', () => {
  for (const route of [...publicRoutes, ...fullVisionRoutes, ...directCriticalRoutes]) {
    assert.ok(releaseControl.includes(`'${route}'`), `missing browser release route ${route}`)
  }

  assert.ok(releaseControl.includes("['/ascent/life-map', { pathname: '/life-map', searchEntries: [['from', 'ascent-life-map']] }]"))
  assert.ok(releaseControl.includes("['/waitlist', { pathname: '/status', searchEntries: [['from', 'waitlist']] }]"))
  assert.ok(releaseControl.includes("['/system', { pathname: '/status', searchEntries: [['from', 'system']] }]"))
  assert.ok(releaseControl.includes("['/settings/privacy', { pathname: '/privacy-controls', searchEntries: [['from', 'settings-privacy']] }]"))
  assert.ok(releaseControl.includes("['/onboarding', { pathname: '/', searchEntries: [['onboarding', '1']] }]"))
  assert.ok(releaseControl.includes("['/signup', { pathname: '/login', searchEntries: [['intent', 'signup']] }]"))
  assert.ok(releaseControl.includes("['/ascent', { pathname: '/home', searchEntries: [['from', 'ascent']] }]"))
  assert.ok(releaseControl.includes("['/spatial', { pathname: '/home', searchEntries: [['from', 'spatial']] }]"))
  assert.ok(releaseControl.includes("['/unwind', { pathname: '/life-map', searchEntries: [['from', 'unwind'], ['overview', '1']] }]"))
  assert.ok(releaseControl.includes("transition: 'compatibility-route'"))
  assert.ok(releaseControl.includes("schemaVersion: 'urai-release-control-smoke-9'"))
})

test('public institutional proof is eligible on integration branches', () => {
  assert.ok(publicProof.includes("'integration/**'"))
})
