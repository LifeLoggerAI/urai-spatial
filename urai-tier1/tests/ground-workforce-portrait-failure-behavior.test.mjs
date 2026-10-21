import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
const require = createRequire(import.meta.url)
const ts = require('typescript')
const source = readFileSync(new URL('../src/app/GroundWorkforcePresences.tsx', import.meta.url), 'utf8')
class Component { constructor(props) { this.props = props } }
const React = { Suspense: Symbol('Suspense'), Component, useEffect() {} }
const jsx = (type, props, key) => ({ type, props, key })
const assets = Object.fromEntries([
 'receptionist','privacySteward','scheduleSteward','wellnessGuide','archivist','relationshipLiaison',
 'operator','builder','protector','mirror','guide'
].map(name => [name, { src: `/synthetic/${name}.webp`, fallback: '/synthetic/fallback.svg', alt: name }]))
const compiled = ts.transpileModule(source, { compilerOptions: {
 module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
} }).outputText
const module = { exports: {} }
const emitted = []
const dependencies = {
 react: React, 'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: Symbol('Fragment') },
 '@react-three/drei': { useTexture() { throw new Error('synthetic load failure') } },
 three: { SRGBColorSpace: 'srgb', FrontSide: 0 },
 '@/spatial/assets/uraiAssets': { avatarAssets: assets },
}
vm.runInNewContext(compiled, { module, exports: module.exports, console: { error: (...items) => emitted.push(items) },
 require(name) { if (!(name in dependencies)) throw Error(`unexpected import: ${name}`); return dependencies[name] },
})
const { GROUND_WORKFORCE, GroundWorkforcePresences, GroundPortraitLoadBoundary } = module.exports
const fakeWorld = missing => ({getObjectByName(name) { return name === missing ? null : {position:{x:10,y:2,z:5}} }})

test('a rejected portrait is isolated to its own child boundary, never the Ground world', () => {
 assert.equal(typeof GroundPortraitLoadBoundary, 'function', 'real React error boundary required; Suspense only handles loading')
 assert.equal(typeof GroundPortraitLoadBoundary.getDerivedStateFromError, 'function')
 const boundary = new GroundPortraitLoadBoundary({ children: 'normal portrait', roleId: 'receptionist' })
 assert.equal(boundary.render(), 'normal portrait')
 boundary.state = {...boundary.state, ...GroundPortraitLoadBoundary.getDerivedStateFromError(new Error('404 texture'))}
 assert.equal(boundary.render(), null, 'asset failure must render nothing for only failed portrait')
 boundary.componentDidCatch(new Error('404 texture'))
 assert.equal(emitted.at(-1)[0], 'URAI_GROUND_REFERENCE_PORTRAIT_UNAVAILABLE')
 assert.equal(emitted.at(-1)[1], 'receptionist')
})

test('11 distinct portrait failures cannot remove the Ground architectural shell', () => {
 const root = GroundWorkforcePresences({world: fakeWorld()})
 assert.equal(root.type, 'group')
 assert.equal(root.props.userData.actionAuthority, 'none')
 assert.equal(GROUND_WORKFORCE.length, 11)
 const children = root.props.children
 assert.equal(children.length, 11)
 for (const child of children) {
   assert.equal(child.type, GroundPortraitLoadBoundary, 'per-image error boundary must sit outside each Suspense')
   assert.equal(typeof child.props.roleId, 'string')
   assert.equal(child.props.children.type, React.Suspense)
   assert.equal(child.props.children.props.fallback, null)
 }
 assert.equal(new Set(children.map(x => x.key)).size, 11)
})

test('one missing destination anchor does not hide unrelated portraits', () => {
 const root = GroundWorkforcePresences({world: fakeWorld('ground-destination-privacy')})
 assert.equal(root.props.children.filter(Boolean).length, 10)
 assert.equal(root.props.children.filter(Boolean).every(x => x.type === GroundPortraitLoadBoundary), true)
})
