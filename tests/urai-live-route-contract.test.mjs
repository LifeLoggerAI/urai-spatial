import assert from 'node:assert/strict'
import test from 'node:test'
import { inspectRouteContent, routeContracts, routeVariants } from '../scripts/urai-live-route-contract.mjs'

function contract(route) {
  const value = routeContracts.find((candidate) => candidate.route.startsWith(route))
  assert.ok(value, `missing route contract for ${route}`)
  return value
}

test('shared contract keeps one unique route owner for every certified route', () => {
  assert.equal(new Set(routeContracts.map(({ route }) => route)).size, routeContracts.length)
  for (const value of routeContracts) {
    assert.ok(value.required.length >= 2, `${value.route} must use multiple route-specific fingerprints`)
    assert.equal(inspectRouteContent(value, value.required.join(' ')).passed, true)
  }
})

test('generic URAI text cannot satisfy current Privacy or Status identity', () => {
  for (const route of ['/privacy-controls', '/status']) {
    const result = inspectRouteContent(contract(route), '<html><body>URAI UrAi</body></html>')
    assert.equal(result.passed, false)
    assert.ok(result.missingMarkers.length >= 2)
  }
})

test('stale predecessor Privacy copy is rejected even when generic URAI text exists', () => {
  const html = '<html><body>URAI Privacy Controls. Choose what the world can hold. Human approval before real-world action. URAI.</body></html>'
  const result = inspectRouteContent(contract('/privacy-controls'), html)
  assert.equal(result.passed, false)
  assert.ok(result.missingMarkers.includes('consent-sanctuary'))
  assert.ok(result.forbiddenMarkers.includes('URAI Privacy Controls'))
  assert.ok(result.forbiddenMarkers.includes('Choose what the world can hold.'))
})

test('stale predecessor Status copy is rejected even when generic URAI text exists', () => {
  const html = '<html><body>URAI. Routes implemented. Production certification pending. Launch spine. Certification boundary.</body></html>'
  const result = inspectRouteContent(contract('/status'), html)
  assert.equal(result.passed, false)
  assert.ok(result.missingMarkers.includes('urai-final-status-control-room'))
  assert.ok(result.forbiddenMarkers.includes('Routes implemented. Production certification pending.'))
})

test('slash variants preserve the complete query contract', () => {
  const variants = routeVariants('https://urai.app', '/focus?memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset')
  assert.deepEqual(variants.map((value) => value.pathname), ['/focus', '/focus/'])
  assert.deepEqual(variants.map((value) => value.search), [
    '?memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset',
    '?memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset',
  ])
})
