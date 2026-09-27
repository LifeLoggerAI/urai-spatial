import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'
import * as THREE from 'three'

// Execute the real Passport component, including the shared preference hook.
function harness({ system = false, user = false } = {}) {
  const slots = [], effects = [], timers = [], travels = [], captures = []
  let cursor = 0, frame, tree, dirty = false
  const react = {
    useState(initial) {
      const index = cursor++
      if (!(index in slots)) slots[index] = initial
      return [slots[index], value => { if (slots[index] !== value) { slots[index] = value; dirty = true } }]
    },
    useRef(initial) {
      const index = cursor++
      return slots[index] ?? (slots[index] = { current: initial })
    },
    useEffect(fn, deps) {
      const index = cursor++, previous = slots[index]
      if (!previous || deps.some((dep, i) => dep !== previous[i])) {
        slots[index] = deps
        effects.push(fn)
      }
    },
  }
  const query = { matches: system, addEventListener(_name, fn) { this.listener = fn }, removeEventListener() {} }
  const window = {
    location: { search: '' }, matchMedia: () => query,
    setTimeout(fn, delay) { timers.push({ fn, delay }); return timers.length }, clearTimeout() {},
    dispatchEvent(event) { captures.push(event.type) },
  }
  const jsx = (type, props) => {
    if (props?.ref && !props.ref.current) props.ref.current = new THREE.Group()
    return { type, props }
  }
  function load(source, dependencies) {
    const exports = {}
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText,
      { exports, window, URLSearchParams, travel: () => travels.push("passport"), Event: class { constructor(type) { this.type = type } }, require(id) { if (!(id in dependencies)) throw new Error(`Unmocked dependency: ${id}`); return dependencies[id] } })
    return exports
  }
  const motionSource = fs.readFileSync(new URL('../src/spatial/hooks/useReducedMotion.ts', import.meta.url), 'utf8')
  const motion = load(motionSource, { react, '@/spatial/settings/spatialSettingsStore': { useSpatialSettingsStore: select => select({ reducedMotion: user }) } })
  const source = fs.readFileSync(new URL('../src/spatial/layout/HomeAAAVisualRepair.tsx', import.meta.url), 'utf8')
  const ast = ts.createSourceFile('passport.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const component = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'HomePassportOwnershipObject')
  assert.ok(component, 'the runtime Passport component must exist')
  const module = load(`import { useState, useRef, useEffect } from 'react';\nimport { useFrame } from '@react-three/fiber';\nimport * as THREE from 'three';\nimport { useReducedMotion } from '@/spatial/hooks/useReducedMotion';\nconst Html = 'html';\nconst PASSPORT_REVIEW_STATES = new Set(['dormant','focused','selected','opening']);\nconst useFirstPersonHomePresence = () => true;\nconst capturePassportOrigin = () => window.dispatchEvent(new Event('origin'));\nconst commitPassportTravel = () => travel();\nexport ${component.getText(ast)}`, {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' }, three: THREE,
    '@react-three/fiber': { useFrame(fn) { frame = fn } }, '@/spatial/hooks/useReducedMotion': motion,
  })
  const render = () => {
    do { dirty = false; cursor = 0; tree = module.HomePassportOwnershipObject(); while (effects.length) effects.shift()() } while (dirty)
    return tree
  }
  render()
  const covers = () => slots.filter(value => value?.current instanceof THREE.Group).map(value => value.current.rotation.y)
  return {
    render, covers, timers, captures, travels,
    focus() { tree.props.onPointerOver({ stopPropagation() {} }); render() },
    click() { tree.props.onClick({ stopPropagation() {} }); render() },
    tick() { frame({}, 1 / 60) },
    setPreference(value) { user = value; render() },
    setSystem(value) { query.matches = value; query.listener?.(); render() },
  }
}

for (const preference of ['system', 'user']) {
  test(`Passport covers remain still with ${preference} reduced motion`, () => {
    const h = harness({ [preference]: true })
    h.focus(); h.tick()
    assert.deepEqual(h.covers(), [0, 0])
  })
}

test('normal Passport focus keeps its articulated motion; a live preference change stops it', () => {
  const h = harness()
  h.focus(); h.tick()
  assert.ok(h.covers()[0] > 0)
  assert.ok(h.covers()[1] < 0)
  h.setPreference(true); h.tick()
  assert.deepEqual(h.covers(), [0, 0])
  h.setPreference(false); h.tick()
  assert.ok(h.covers()[0] > 0)
  h.setSystem(true); h.tick()
  assert.deepEqual(h.covers(), [0, 0])
})

for (const preference of ['system', 'user']) {
  test(`Passport activation honors ${preference} reduced motion and captures origin`, () => {
    const h = harness({ [preference]: true })
    h.click()
    assert.deepEqual(h.captures, ['origin'])
    assert.deepEqual(h.travels, ['passport'])
    assert.equal(h.timers.length, 0, 'reduced motion must not schedule decorative opening stages')
  })
}

test('normal Passport activation preserves the staged opening and destination', () => {
  const h = harness()
  h.click()
  assert.deepEqual(h.captures, ['origin'])
  assert.deepEqual(h.timers.map(timer => timer.delay), [220, 700])
  for (const timer of h.timers) timer.fn()
  assert.deepEqual(h.travels, ['passport'])
})
