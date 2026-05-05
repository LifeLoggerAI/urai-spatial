import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getAscentChannels, getGroundChannelsForPhase, sceneReducer, type SceneState } from './phaseMachine'

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

  it('interpolates ground values back to home baseline during return-home phases', () => {
    const descentStart = getGroundChannelsForPhase('return_home_descent', 0)
    const descentEnd = getGroundChannelsForPhase('return_home_descent', 1)
    assert.equal(descentStart.recession, 1)
    assert.equal(descentEnd.recession, 0)

    const settleStart = getGroundChannelsForPhase('return_home_settle', 0)
    const settleEnd = getGroundChannelsForPhase('return_home_settle', 1)
    assert.equal(settleStart.recession, 0.08)
    assert.equal(settleEnd.recession, 0)
    assert.equal(settleEnd.opacity, 1)
  })
})
