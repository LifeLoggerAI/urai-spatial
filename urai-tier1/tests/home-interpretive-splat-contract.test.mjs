import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import ts from 'typescript'
import {
  HOME_INTERPRETIVE_SPLAT_PREFIX,
  resolveHomeInterpretiveSplatAsset,
} from '../src/spatial/home/homeInterpretiveSplatPolicy.ts'

function requireConventionalHomeRuntimeOwner(source) {
  const tree = ts.createSourceFile('home.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const rigs = []
  const owners = []
  const visit = node => {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(tree) === 'PlayerRig') rigs.push(node)
    if (ts.isFunctionDeclaration(node) && node.name?.text === 'PlayerRig') owners.push(node)
    ts.forEachChild(node, visit)
  }
  visit(tree)
  assert.equal(rigs.length, 1, 'one conventional Home movement owner')
  const attrs = new Map(rigs[0].attributes.properties.filter(ts.isJsxAttribute).map(attr => [attr.name.getText(tree), attr.initializer?.expression?.getText(tree)]))
  for (const prop of ['input', 'yaw', 'pitch', 'target', 'avatar', 'returnCheckpoint']) assert.equal(attrs.get(prop), `props.${prop}`, `PlayerRig must own ${prop}`)
  assert.equal(owners.length, 1, 'one PlayerRig implementation')
  const body = owners[0].body.getText(tree)
  assert.match(body, /const \{ camera, size, invalidate, gl \} = useThree\(\)/, 'conventional runtime must own the camera')
  assert.match(body, /useFrame\(\(\{ clock \}, delta\) =>/, 'conventional runtime must own the frame clock')
  assert.match(body, /resolveHomeSolidPenetration\(/, 'conventional proxies must continue to own collision')
}

test('Home interpretive splat policy is fail-closed and local-only', () => {
  assert.equal(HOME_INTERPRETIVE_SPLAT_PREFIX, '/assets/urai/home-production/interpretive/')
  assert.equal(resolveHomeInterpretiveSplatAsset(undefined), null)
  assert.equal(resolveHomeInterpretiveSplatAsset('   '), null)
  assert.equal(
    resolveHomeInterpretiveSplatAsset('/assets/urai/home-production/interpretive/sanctuary-v1.splat'),
    '/assets/urai/home-production/interpretive/sanctuary-v1.splat',
  )

  for (const candidate of [
    'https://storage.example.invalid/private.splat',
    '/assets/urai/captured-reality/private.splat',
    '/assets/urai/home-production/interpretive/../private.splat',
    '/assets/urai/home-production/interpretive/%2e%2e/private.splat',
    '/assets/urai/home-production/interpretive/%2E%2E%2Fprivate.splat',
    '/assets/urai/home-production/interpretive/%252e%252e/private.splat',
    '/assets/urai/home-production/interpretive/nested/sanctuary-v1.splat',
    '/assets/urai/home-production/interpretive/sanctuary-v1.splat?sig=private',
    '/assets/urai/home-production/interpretive/sanctuary-v1.splat#fragment',
    '/assets/urai/home-production/interpretive/not-a-splat.glb',
    '\\assets\\urai\\home-production\\interpretive\\sanctuary-v1.splat',
  ]) {
    assert.throws(() => resolveHomeInterpretiveSplatAsset(candidate), /HOME_INTERPRETIVE_SPLAT_ASSET_NOT_APPROVED/)
  }
})

test('Home interpretive Gaussian layer preserves truth, collision, interaction and provenance ownership', () => {
  const adapter = fs.readFileSync(new URL('../src/spatial/home/HomeInterpretiveSplat.tsx', import.meta.url), 'utf8')
  const home = fs.readFileSync(new URL('../src/spatial/layout/HomeWorldProductionPolished.tsx', import.meta.url), 'utf8')

  assert.match(adapter, /truthClass: 'INTERPRETIVE'/)
  assert.match(adapter, /autobiographical: false/)
  assert.match(adapter, /collisionOwner: 'conventional-home-proxies'/)
  assert.match(adapter, /interactionOwner: 'react-r3f-home-runtime'/)
  assert.match(adapter, /provenanceOwner: 'asset-factory'/)
  assert.match(home, /NEXT_PUBLIC_URAI_HOME_INTERPRETIVE_SPLAT_ASSET/)
  assert.ok(home.includes('HOME_INTERPRETIVE_SPLAT_ASSET ? <HomeInterpretiveSplatEnvironment'))
  assert.ok(home.includes('<Terrain target={props.target} />'))
  assert.match(home, /<Thresholds onGround=/)
  requireConventionalHomeRuntimeOwner(home)
})

test('Home interpretive layer cannot replace or duplicate the conventional camera and collision owner', () => {
  const home = fs.readFileSync(new URL('../src/spatial/layout/HomeWorldProductionPolished.tsx', import.meta.url), 'utf8')
  const changedInput = home.replace('input={props.input}', 'input={interpretiveInput}')
  assert.notEqual(changedInput, home)
  assert.throws(() => requireConventionalHomeRuntimeOwner(changedInput), /PlayerRig must own input/)
  const duplicated = home.replace('<PlayerRig ', '<PlayerRig /><PlayerRig ')
  assert.notEqual(duplicated, home)
  assert.throws(() => requireConventionalHomeRuntimeOwner(duplicated), /one conventional Home movement owner/)
  const removedClock = home.replace('useFrame(({ clock }, delta) =>', 'useDetachedInterpretiveFrame(({ clock }, delta) =>')
  assert.notEqual(removedClock, home)
  assert.throws(() => requireConventionalHomeRuntimeOwner(removedClock), /frame clock/)
})

test('Home interpretive environment is not mounted through private Captured Reality decision semantics', () => {
  const adapter = fs.readFileSync(new URL('../src/spatial/home/HomeInterpretiveSplat.tsx', import.meta.url), 'utf8')
  assert.doesNotMatch(adapter, /CapturedRealityRenderDecision/)
  assert.doesNotMatch(adapter, /decideCapturedRealityRender/)
  assert.doesNotMatch(adapter, /location\.context/)
  assert.doesNotMatch(adapter, /authorizedRuntimeUrl/)
})
