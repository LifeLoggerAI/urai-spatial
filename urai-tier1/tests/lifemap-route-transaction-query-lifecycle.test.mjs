import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const source = readFileSync(new URL('../src/spatial/world/LifeMapRouteTransactionBridge.tsx', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText

function harness({ firebaseReady = false } = {}) {
  let currentLocation = '/life-map', cursor = 0, changed = false
  const states = [], effectDeps = [], cleanups = [], queued = [], calls = [], callbacks = []
  const useState = initial => {
    const i = cursor++
    if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial
    return [states[i], next => {
      const value = typeof next === 'function' ? next(states[i]) : next
      if (!Object.is(states[i], value)) { states[i] = value; changed = true }
    }]
  }
  const useEffect = (fn, deps) => {
    const i = cursor++
    if (!effectDeps[i] || effectDeps[i].length !== deps.length || deps.some((d, j) => !Object.is(d, effectDeps[i][j]))) {
      queued.push(() => { cleanups[i]?.(); effectDeps[i] = [...deps]; cleanups[i] = fn() })
    }
  }
  const win = {
    location: { pathname: '/life-map', search: '' },
    addEventListener() {}, removeEventListener() {},
    history: { state: null, replaceState() {}, pushState() {} },
  }
  globalThis.window = win
  globalThis.Element = class {}
  const mock = {
    react: { useState, useEffect },
    'firebase/auth': {
      getAuth: () => ({}),
      onAuthStateChanged: (_auth, onIdentity, onError) => {
        const callback = { onIdentity, onError, active: true }
        callbacks.push(callback)
        return () => { callback.active = false }
      },
    },
    '@/hooks/useBrowserLocation': { useBrowserLocation: () => currentLocation },
    '@/components/lifemap/useLifeMapEvents': {
      useLifeMapEvents: id => { calls.push(id ?? null); return { nodes: id === 'demo-user' ? [{ id: 'disclosed-fixture' }] : [] } },
    },
    '@/lib/firebase/client': { app: {}, firebasePublicEnvReady: firebaseReady },
    '@/spatial/memory/lifeMapSelectionJourney': { withLifeMapSelectionIdentity: () => new URLSearchParams() },
  }
  const exported = {}
  new Function('exports', 'require', compiled)(exported, name => {
    assert.ok(Object.hasOwn(mock, name), 'Unexpected original module import: ' + name)
    return mock[name]
  })
  const render = url => {
    currentLocation = url
    const parsed = new URL(url, 'https://urai.invalid')
    win.location.pathname = parsed.pathname
    win.location.search = parsed.search
    for (let tries = 0; tries < 10; tries++) {
      cursor = 0
      changed = false
      exported.LifeMapRouteTransactionBridge()
      for (const run of queued.splice(0)) run()
      if (!changed) break
      if (tries === 9) throw Error('Unbounded bridge render')
    }
    return calls.at(-1)
  }
  const auth = (id, i = callbacks.length - 1) => {
    callbacks[i].onIdentity(id ? { uid: id } : null)
    return render(currentLocation)
  }
  return { render, auth, callbacks }
}

test('same mounted Life Map admits explicit demo after query update', () => {
  const f = harness()
  assert.equal(f.render('/life-map'), null)
  assert.equal(f.render('/life-map?demo=1&overview=1'), 'demo-user')
})
test('leaving demo removes disclosed sample nodes without remounting', () => {
  const f = harness()
  f.render('/life-map')
  assert.equal(f.render('/life-map?demo=1'), 'demo-user')
  assert.equal(f.render('/life-map'), null)
})
test('owner identity is fenced until fresh auth callback after query change', () => {
  const f = harness({ firebaseReady: true })
  assert.equal(f.render('/life-map'), null)
  assert.equal(f.auth('owner-A'), 'owner-A')
  assert.equal(f.render('/life-map?demo=1'), 'demo-user')
  assert.equal(f.render('/life-map'), null)
  assert.equal(f.auth('owner-B'), 'owner-B')
})
test('late old owner callback cannot contaminate disclosed sample', () => {
  const f = harness({ firebaseReady: true })
  f.render('/life-map')
  const old = f.callbacks.length - 1
  f.auth('owner-A')
  assert.equal(f.render('/life-map?demo=1'), 'demo-user')
  assert.equal(f.callbacks[old].active, false)
  f.callbacks[old].onIdentity({ uid: 'owner-A' })
  assert.equal(f.render('/life-map?demo=1'), 'demo-user')
})
