import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { previousDestinationForReturn, URAI_DESTINATIONS } from '../src/spatial/world/worldTypes.ts'
import { shouldHandleRealmEscape } from '../src/spatial/world/realmEscapeEligibility.mjs'
import { bindReplayHorizonEscape } from '../src/spatial/world/replayHorizonEscape.mjs'

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')

test('Replay goes to Focus, unless returning from nested Life Movie', () => {
  for (const previousDestination of [undefined, ...URAI_DESTINATIONS.filter(v => v !== 'life-movie')])
    assert.equal(previousDestinationForReturn({ destination: 'replay', previousDestination }), 'focus')
  assert.equal(previousDestinationForReturn({ destination: 'replay', previousDestination: 'life-movie' }), 'life-movie')
})

test('Focus returns Life Map regardless of stale prior world', () => {
  for (const previousDestination of [undefined, ...URAI_DESTINATIONS])
    assert.equal(previousDestinationForReturn({ destination: 'focus', previousDestination }), 'life-map')
})

test('Focus departure targets overview for one-level next Escape', () => {
  const controller = read('../src/spatial/world/WorldTransitionController.tsx')
  assert.match(controller, /currentWorld\.destination === 'focus' && destination === 'life-map'/)
  assert.match(controller, /\?overview=1/)
  assert.match(controller, /currentWorld\.destination === 'replay' \|\| currentWorld\.destination === 'focus'/)
  const scene = read('../src/components/lifemap/ComposedLifeMapScene.tsx')
  assert.match(scene, /const overviewRequested = params\.get\("overview"\) === "1"/)
})

test('Focus and Life Map cannot skip a level through legacy 800ms timers', () => {
  for (const path of ['../src/app/focus/FocusEscapeBridge.tsx', '../src/app/life-map/LifeMapEscapeBridge.tsx']) {
    const bridge = read(path)
    assert.doesNotMatch(bridge, /window\.setTimeout\(|urai-spatial-escape-stack-return-home|urai-replay-return-manifest-id/)
    assert.match(bridge, /shouldHandleRealmEscape/)
  }
})

test('Escape guards active dialogs, editors and transitions', () => {
  const doc = phase => ({querySelector(selector) {
    if (selector.includes('aria-modal')) return null
    if (selector.includes('data-phase')) return {getAttribute: () => phase}
    return null
  }})
  const event = (extra = {}) => ({key:'Escape',defaultPrevented:false,repeat:false,isComposing:false,target:null,...extra})
  assert.equal(shouldHandleRealmEscape(event(),doc('idle')),true)
  assert.equal(shouldHandleRealmEscape(event(),doc('travelling')),false)
  assert.equal(shouldHandleRealmEscape(event({target:{closest:()=>({})}}),doc('idle')),false)
  assert.equal(shouldHandleRealmEscape(event({defaultPrevented:true}),doc('idle')),false)
})

test('Replay horizon returns once and unregisters listener', () => {
  let handler, count = 0
  const host = {addEventListener:(_name,h)=>{handler=h},removeEventListener:()=>{handler=null}}
  const stop = bindReplayHorizonEscape(host,()=>count++,()=>true)
  handler({key:'Escape',preventDefault(){},stopPropagation(){}})
  assert.equal(count,1)
  stop()
  assert.equal(handler,null)
})

test('Focus Escape listener is actual code, not commented by literal backslash-n', () => {
  const focus = read('../src/app/focus/FocusEscapeBridge.tsx')
  assert.doesNotMatch(focus, /\\n\s*window\.addEventListener/)
  const line = focus.split(/\r?\n/).find(value => value.includes("window.addEventListener('keydown', handleKeyDown"))
  assert.ok(line && line.trim().startsWith("window.addEventListener("), 'Escape listener is not an executable statement')
})

test('mounted Focus delegates Escape to the shared realm owner predicate', () => {
  const focus = read('../src/app/focus/FocusChamberClient.tsx')
  assert.match(focus, /import \{ shouldHandleRealmEscape \} from '@\/spatial\/world\/realmEscapeEligibility\.mjs'/)
  assert.match(focus, /const onEscape = \(event: KeyboardEvent\) => \{\s*if \(!shouldHandleRealmEscape\(event\)\) return/)
  assert.match(focus, /window\.addEventListener\('keydown', onEscape\)/)
})
