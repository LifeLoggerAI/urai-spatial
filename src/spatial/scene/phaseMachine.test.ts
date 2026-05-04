import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getAscentChannels, sceneReducer, type SceneState } from './phaseMachine'

const base: SceneState = { phase: 'HOME', selectedStarId: null, inputLocked: false }

describe('phaseMachine ascent transitions', () => {
  it('starts ascent from HOME', () => {
    const next = sceneReducer(base, { type: 'START_ASCENT' })
    assert.equal(next.phase, 'ASCENT')
    assert.equal(next.inputLocked, true)
  })

  it('completes ascent into LIFEMAP', () => {
    const next = sceneReducer({ phase: 'ASCENT', selectedStarId: null, inputLocked: true }, { type: 'COMPLETE_ASCENT' })
    assert.equal(next.phase, 'LIFEMAP')
    assert.equal(next.inputLocked, false)
  })

  it('cancels ascent to HOME via ESC', () => {
    const next = sceneReducer({ phase: 'ASCENT', selectedStarId: null, inputLocked: true }, { type: 'ESC' })
    assert.equal(next.phase, 'HOME')
    assert.equal(next.inputLocked, false)
    assert.equal(next.selectedStarId, null)
  })

  it('reports ordered ascent substates', () => {
    assert.equal(getAscentChannels(0).substate, 'IDLE')
    assert.equal(getAscentChannels(0.3).substate, 'GROUND_RECESS')
    assert.equal(getAscentChannels(0.55).substate, 'STREAK_RAMP')
    assert.equal(getAscentChannels(0.8).substate, 'NEBULA_REVEAL')
    assert.equal(getAscentChannels(1).substate, 'COMPLETE')
  })
})
