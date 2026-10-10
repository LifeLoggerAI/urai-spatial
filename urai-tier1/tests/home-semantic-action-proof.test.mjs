import assert from 'node:assert/strict'
import { test } from 'node:test'
import { HOME_SEMANTIC_ACTIONS, verifyHomeSemanticSnapshot } from '../../scripts/home-semantic-action-proof.mjs'

const base = 'http://127.0.0.1:4173'
function currentOwnedHome() {
  const snapshot = {
    url: `${base}/home/?homeAssetReview=1&homePrivateFixture=1`,
    finalUrl: `${base}/home/?homeAssetReview=1&homePrivateFixture=1`,
    viewport: { width: 390, height: 844 }, navigationCount: 1, accessibleNavigationCount: 1, runtimeCount: 1, worldCount: 1,
    navigation: { tag: 'NAV', explicitRole: null, owner: 'runtime-boundary', nonDominant: 'true', visible: true, interactiveCount: 3, sharedRuntimeParent: true, outsideWorld: true },
    runtime: { visible: true, contextOwner: 'world-local-context-only', visualOwner: 'asset-driven-personalized-sanctuary', assetsReady: 'true', webglReady: 'true', containsWorld: true },
    world: { primaryOwner: 'asset-driven', assetsReady: 'true', visibleWorld: 'authored-coherent-three-dimensional-sanctuary', movement: 'walk-keyboard-click-touch', scenePhase: 'HOME', cameraMode: 'embodied-first-person', inputLocked: 'false', embodiedSelf: 'privacy-preserving-shadow' },
    controls: {},
  }
  Object.entries(HOME_SEMANTIC_ACTIONS).forEach(([id, expected], index) => {
    const query = expected.query ? new URLSearchParams(expected.query).toString() : ''
    snapshot.controls[id] = {
      domMatches: 1, accessibleMatches: 1, globalAccessibleMatches: 1, roleMatchIsOwned: true,
      tag: expected.tag, explicitRole: null, testId: expected.testId, type: expected.tag === 'BUTTON' ? 'button' : null,
      belongsToNavigation: true, connected: true, visible: true, disabled: false, tabIndex: 0,
      pointerEvents: 'auto', centerHit: true, bounds: { x: 332, y: 300 + index * 56, width: 48, height: 48 },
      href: expected.pathname ? `${expected.pathname}?${query}` : null, target: '', download: false,
    }
  })
  return snapshot
}

test('current owned native accessible controls pass independently of WebGL text', () => {
  const result = verifyHomeSemanticSnapshot(currentOwnedHome(), base)
  assert.equal(result.passed, true)
  assert.equal(result.actions.orb.expectedName, 'Open URAI Orb companion')
  assert.equal(result.actions.ground.expectedName, 'Open Ground directly')
  assert.equal(result.actions.lifeMap.expectedName, 'Open Life Map directly')
  assert.equal('lifeMapAscentOwned' in result, false, 'direct-link presence must never certify a physical Ascent')
})

const badContexts = [
  ['foreign current Home', s => { s.url = s.finalUrl = 'https://other.example/home/?homeAssetReview=1&homePrivateFixture=1' }],
  ['signed-out other route', s => { s.url = s.finalUrl = `${base}/life-map/?homeAssetReview=1&homePrivateFixture=1` }],
  ['URL changes during collection', s => { s.finalUrl = `${base}/ground/` }],
  ['missing review context', s => { s.url = s.finalUrl = `${base}/home/` }],
  ['duplicate context query', s => { s.url = s.finalUrl = `${s.url}&homePrivateFixture=1` }],
  ['duplicate Home runtime', s => { s.runtimeCount = 2 }],
  ['missing asset owner', s => { s.worldCount = 0 }],
  ['stale recovery state', s => { s.runtime.webglReady = 'recovering' }],
  ['unready runtime assets', s => { s.runtime.assetsReady = 'false' }],
  ['unready world assets', s => { s.world.assetsReady = 'false' }],
  ['foreign context authority', s => { s.runtime.contextOwner = 'global' }],
  ['world outside current runtime', s => { s.runtime.containsWorld = false }],
  ['hidden current runtime', s => { s.runtime.visible = false }],
  ['wrong visible world', s => { s.world.visibleWorld = 'ceiling-hallway' }],
  ['active Ascent instead of Home', s => { s.world.scenePhase = 'ASCENT' }],
  ['wrong camera context', s => { s.world.cameraMode = 'ascent' }],
  ['locked Home input', s => { s.world.inputLocked = 'true' }],
  ['body-rig presence', s => { s.world.embodiedSelf = 'visible-avatar-rig' }],
]
for (const [name, mutate] of badContexts) test(`refuses ${name}`, () => {
  const snapshot = currentOwnedHome(); mutate(snapshot)
  const result = verifyHomeSemanticSnapshot(snapshot, base)
  assert.equal(result.contextPassed, false)
  assert.equal(result.passed, false)
  assert.equal(Object.values(result.actions).some(action => action.passed), false)
})

const badNavigation = [
  ['missing governed nav', s => { s.navigationCount = 0 }],
  ['duplicate governed nav', s => { s.navigationCount = 2 }],
  ['hidden accessible nav', s => { s.accessibleNavigationCount = 0 }],
  ['duplicate accessible nav', s => { s.accessibleNavigationCount = 2 }],
  ['non-native navigation', s => { s.navigation.tag = 'DIV' }],
  ['incorrect navigation role', s => { s.navigation.explicitRole = 'dialog' }],
  ['hidden navigation', s => { s.navigation.visible = false }],
  ['unexpected navigation control', s => { s.navigation.interactiveCount = 4 }],
  ['foreign navigation boundary', s => { s.navigation.sharedRuntimeParent = false }],
  ['obsolete WebGL child navigation', s => { s.navigation.outsideWorld = false }],
]
for (const [name, mutate] of badNavigation) test(`refuses ${name}`, () => {
  const snapshot = currentOwnedHome(); mutate(snapshot)
  assert.equal(verifyHomeSemanticSnapshot(snapshot, base).navigationPassed, false)
})

const badTargets = [
  ['missing', c => { c.domMatches = 0 }], ['duplicate', c => { c.domMatches = 2 }],
  ['wrong accessible name', c => { c.accessibleMatches = 0 }], ['ambiguous role/name', c => { c.globalAccessibleMatches = 2 }],
  ['role match from other node', c => { c.roleMatchIsOwned = false }], ['non-native control', c => { c.tag = 'DIV' }],
  ['incorrect explicit role', c => { c.explicitRole = 'presentation' }], ['foreign ownership', c => { c.belongsToNavigation = false }],
  ['hidden', c => { c.visible = false }], ['disabled', c => { c.disabled = true }], ['detached', c => { c.connected = false }],
  ['unfocusable', c => { c.tabIndex = -1 }], ['forged focus metadata', c => { c.tabIndex = '0' }],
  ['click-through', c => { c.pointerEvents = 'none' }], ['occluded', c => { c.centerHit = false }],
  ['narrow target', c => { c.bounds.width = 47 }], ['short target', c => { c.bounds.height = 47 }],
  ['outside left edge', c => { c.bounds.x = -1 }], ['outside right edge', c => { c.bounds.x = 350 }],
  ['outside bottom edge', c => { c.bounds.y = 810 }], ['non-finite geometry', c => { c.bounds.width = NaN }],
]
for (const id of Object.keys(HOME_SEMANTIC_ACTIONS)) for (const [name, mutate] of badTargets) test(`refuses ${name} ${id} target`, () => {
  const snapshot = currentOwnedHome(); mutate(snapshot.controls[id])
  const result = verifyHomeSemanticSnapshot(snapshot, base)
  assert.equal(result.actions[id].passed, false)
  assert.equal(result.passed, false)
})

const unsafeRoutes = [
  ['foreign origin', c => { c.href = `https://other.example${c.href}` }],
  ['protocol-relative foreign origin', c => { c.href = `//other.example${c.href}` }],
  ['userinfo', c => { c.href = `http://user@127.0.0.1:4173${c.href}` }],
  ['script URL', c => { c.href = 'javascript:location.assign("/life-map/")' }],
  ['different port', c => { c.href = `http://127.0.0.1:4174${c.href}` }],
  ['fragment', c => { c.href += '#redirect' }],
  ['missing checkpoint', c => { c.href = c.href.replace(/&cameraCheckpoint=[^&]+/, '') }],
  ['wrong checkpoint', c => { c.href = c.href.replace(/cameraCheckpoint=[^&]+/, 'cameraCheckpoint=stale') }],
  ['duplicate checkpoint', c => { c.href += '&cameraCheckpoint=stale' }],
  ['unowned query', c => { c.href += '&next=https%3A%2F%2Fother.example' }],
  ['new tab', c => { c.target = '_blank' }], ['download instead of navigation', c => { c.download = true }],
]
for (const id of ['ground', 'lifeMap']) for (const [name, mutate] of unsafeRoutes) test(`refuses ${name} ${id} route`, () => {
  const snapshot = currentOwnedHome(); mutate(snapshot.controls[id])
  assert.equal(verifyHomeSemanticSnapshot(snapshot, base).actions[id].routePassed, false)
})

test('a renamed submit control cannot stand in for the native Orb action', () => {
  const snapshot = currentOwnedHome(); snapshot.controls.orb.type = 'submit'
  assert.equal(verifyHomeSemanticSnapshot(snapshot, base).actions.orb.passed, false)
})
test('invalid viewport geometry cannot authorize even an otherwise valid target', () => {
  const snapshot = currentOwnedHome(); snapshot.viewport.width = '390'
  assert.equal(verifyHomeSemanticSnapshot(snapshot, base).passed, false)
})
test('explicit disclosed demo is retained exactly on both direct routes', () => {
  const snapshot = currentOwnedHome(); snapshot.url = snapshot.finalUrl = snapshot.url + '&demo=1'
  for (const id of ['ground', 'lifeMap']) snapshot.controls[id].href += '&demo=1'
  const result = verifyHomeSemanticSnapshot(snapshot, base)
  assert.equal(result.disclosedDemo, true)
  assert.equal(result.passed, true)
})
for (const id of ['ground', 'lifeMap']) test(`refuses lost disclosed demo on ${id}`, () => {
  const snapshot = currentOwnedHome(); snapshot.url = snapshot.finalUrl = snapshot.url + '&demo=1'
  for (const route of ['ground', 'lifeMap']) if (route !== id) snapshot.controls[route].href += '&demo=1'
  assert.equal(verifyHomeSemanticSnapshot(snapshot, base).actions[id].passed, false)
})
test('duplicate or non-admitted Home demo values cannot grant continuity', () => {
  for (const suffix of ['&demo=1&demo=1', '&demo=0', '&demo=true']) {
    const snapshot = currentOwnedHome(); snapshot.url = snapshot.finalUrl = snapshot.url + suffix
    assert.equal(verifyHomeSemanticSnapshot(snapshot, base).contextPassed, false)
  }
})
