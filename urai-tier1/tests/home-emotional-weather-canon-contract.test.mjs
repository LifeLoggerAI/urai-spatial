import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = path.resolve(import.meta.dirname, '..')
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8')

const types = read('src/spatial/home/homeWorldTypes.ts')
const scene = read('src/spatial/home/visual/HomeScene.tsx')
const derivation = read('src/spatial/home/signal/homeWorldSignalDerivation.ts')
const alternate = read('src/spatial/home/deriveHomeWorldStateFromSignals.ts')
const firebase = read('src/lib/firebase/homeWorld.ts')
const rules = read('../firebase/firestore.rules')

test('Home Emotional Weather exposes only the current six-state canon', () => {
  for (const state of ['calm','reflective','energized','heavy','uncertain','hopeful']) {
    assert.match(types, new RegExp(`["']${state}["']`))
  }
  for (const retired of ['"low"','"recovery"','"dream"','"shadow"','"focused"','"joy"']) {
    const declaration = types.slice(types.indexOf('export type HomeMoodState'), types.indexOf('export type HomeRecoveryState'))
    assert.equal(declaration.includes(retired), false, `retired mood state remains in HomeMoodState: ${retired}`)
  }
  assert.match(rules, /moodState in \['calm','reflective','energized','heavy','uncertain','hopeful'\]/)
})

test('weather derivation fails closed to uncertain when confidence is weak or evidence is ambiguous', () => {
  assert.match(derivation, /signals\.confidence < 0\.42/)
  assert.match(derivation, /top\[1\] - runnerUp\[1\] < 3\.5/)
  assert.match(derivation, /moodState = "uncertain"/)
  assert.match(alternate, /if \(confidence < 0\.42\) return "uncertain"/)
})

test('legacy persisted weather values migrate to current canon without becoming writable current states', () => {
  for (const [legacy, current] of Object.entries({
    low: 'uncertain',
    recovery: 'hopeful',
    dream: 'reflective',
    shadow: 'heavy',
    focused: 'reflective',
    joy: 'energized',
  })) {
    assert.match(firebase, new RegExp(`${legacy}: ["']${current}["']`))
    assert.match(scene, new RegExp(`${legacy}: ["']${current}["']`))
  }
  assert.doesNotMatch(rules, /'low'|'recovery'|'dream'|'shadow'|'focused'|'joy'/)
})

test('visible Home rendering has restrained differentiated treatment for all current states', () => {
  for (const state of ['calm','reflective','energized','heavy','uncertain','hopeful']) {
    assert.match(scene, new RegExp(`\\b${state}: ["']`))
  }
  assert.match(scene, /moodState === "uncertain"/)
  assert.match(scene, /do not support a confident weather state/)
})
