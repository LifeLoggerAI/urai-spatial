import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

function controllerHarness() {
  const slots = [], actions = [], effects = [], commits = [], saved = new Map()
  let index = 0, reducerState, reducer
  const react = {
    useCallback: (fn) => fn,
    useMemo: (fn) => fn(),
    useRef(value) {
      const slot = index++
      return slots[slot] ??= { current: value }
    },
    useReducer(fn, argument, initialize) {
      reducer = fn
      reducerState ??= initialize(argument)
      return [reducerState, (action) => actions.push(action)]
    },
    useEffect(fn, dependencies) {
      const slot = index++
      const previous = slots[slot]
      if (!previous || dependencies.some((value, i) => value !== previous.dependencies[i])) {
        effects.push(() => {
          previous?.cleanup?.()
          slots[slot] = { dependencies, cleanup: fn() }
        })
      }
    },
  }
  const storage = {
    getItem: (key) => saved.get(key) ?? null,
    setItem: (key, value) => saved.set(key, value),
    removeItem: (key) => saved.delete(key),
  }
  const window = { sessionStorage: storage, addEventListener() {}, removeEventListener() {} }
  function load(name, imports = {}) {
    const exports = {}
    const source = fs.readFileSync(new URL(`../src/spatial/home/${name}`, import.meta.url), 'utf8')
    vm.runInNewContext(ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText, { exports, window, sessionStorage: storage, require: (id) => {
      if (!(id in imports)) throw new Error(`Unexpected import: ${id}`)
      return imports[id]
    } })
    return exports
  }
  const state = load('homeExperienceState.ts')
  const controller = load('useHomeExperienceController.ts', {
    react, three: {}, './homeExperienceState': state,
    '@/spatial/world/worldEvents': { URAI_WORLD_ORB_CLOSE_EVENT: 'orb-close' },
  })
  const readRuntimeSnapshot = () => ({
    stableMode: 'AVATAR_HOME_FIRST_PERSON',
    cameraPosition: { x: 0, y: 1.7, z: 7.6 }, yaw: 0, pitch: 0,
  })
  const onDestinationCommit = (destination) => commits.push(destination)
  return {
    commits, saved,
    render() {
      for (const action of actions.splice(0)) reducerState = reducer(reducerState, action)
      index = 0
      const result = controller.useHomeExperienceController({ reducedMotion: false, readRuntimeSnapshot, onDestinationCommit })
      for (const effect of effects.splice(0)) effect()
      return result
    },
  }
}

for (const [destination, activate] of [['GROUND', 'activateGround'], ['LIFE_MAP', 'activateSky']]) {
  test(`${destination}: Escape vetoes a same-frame camera commit and permits the next trip`, () => {
    const harness = controllerHarness()
    let current = harness.render()
    current.api[activate]()
    current = harness.render()
    assert.equal(current.state.pendingDestination, destination)

    current.api.escape()
    // Deliberately retain the pre-render callback: this is the cancellation race.
    current.api.commitDestination(destination)
    assert.equal(harness.commits.length, 0)
    assert.equal(harness.saved.size, 0, 'cancelled travel must not persist a destination return')

    current = harness.render()
    assert.equal(current.state.transition, 'HOME_RESTORE')
    current.api.completeRestore()
    current = harness.render()
    assert.equal(current.state.inputLocked, false)
    assert.equal(current.state.transition, null)

    current.api.escape() // Idle Escape must not poison the next activation.
    current = harness.render()
    current.api[activate]()
    current = harness.render()
    current.api.commitDestination(destination)
    current.api.commitDestination(destination)
    assert.deepEqual(harness.commits, [destination], 'next trip commits exactly once')
    assert.equal(harness.saved.size, 1)
  })
}
