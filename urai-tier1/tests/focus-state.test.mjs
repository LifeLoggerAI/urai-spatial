import assert from 'node:assert/strict'
import test from 'node:test'

import { FOCUS_PHASE_DEFINITIONS, getFocusPhaseDefinition, resolveFocusPhase } from '../src/spatial/scene/focusState.ts'

const base = {
  mode: 'focus',
  hasSelectedTarget: false,
  hasLoadedTarget: false,
  isManifestLoading: false,
  isGateLoading: false,
  isGateBlocked: false,
  isReplayLaunching: false,
}

test('resolveFocusPhase stays idle outside focus and replay routes', () => {
  assert.equal(resolveFocusPhase({ ...base, mode: 'home' }), 'idle')
  assert.equal(resolveFocusPhase({ ...base, mode: 'life-map' }), 'idle')
  assert.equal(resolveFocusPhase({ ...base, mode: 'mirror' }), 'idle')
})

test('resolveFocusPhase prioritizes blocking loading and error states', () => {
  assert.equal(resolveFocusPhase({ ...base, isGateLoading: true }), 'loading_focus_data')
  assert.equal(resolveFocusPhase({ ...base, isManifestLoading: true }), 'loading_focus_data')
  assert.equal(resolveFocusPhase({ ...base, isGateBlocked: true }), 'focus_error')
})

test('resolveFocusPhase exposes empty ready hover detail recenter and exit states', () => {
  assert.equal(resolveFocusPhase(base), 'focus_empty')

  const loaded = { ...base, hasLoadedTarget: true }
  assert.equal(resolveFocusPhase(loaded), 'focus_ready')
  assert.equal(resolveFocusPhase({ ...loaded, hasSelectedTarget: true }), 'focus_node_selected')
  assert.equal(resolveFocusPhase({ ...loaded, isHoveringNode: true }), 'focus_node_hovered')
  assert.equal(resolveFocusPhase({ ...loaded, isDetailOpen: true }), 'focus_detail_open')
  assert.equal(resolveFocusPhase({ ...loaded, isRecentering: true }), 'focus_recentering')
  assert.equal(resolveFocusPhase({ ...loaded, isReplayLaunching: true }), 'exiting_focus')
})

test('resolveFocusPhase treats replay as detail while replay data is loaded', () => {
  assert.equal(resolveFocusPhase({ ...base, mode: 'replay', hasLoadedTarget: true }), 'focus_detail_open')
  assert.equal(resolveFocusPhase({ ...base, mode: 'replay', isManifestLoading: true }), 'loading_focus_data')
})

test('focus definitions provide visible user meaning and action contracts for every phase', () => {
  for (const [phase, definition] of Object.entries(FOCUS_PHASE_DEFINITIONS)) {
    assert.equal(getFocusPhaseDefinition(phase), definition)
    assert.ok(definition.label.length > 0, `${phase} needs a label`)
    assert.ok(definition.userVisibleUi.length > 0, `${phase} needs visible UI text`)
    assert.ok(definition.entryTrigger.length > 0, `${phase} needs an entry trigger`)
    assert.ok(definition.exitTrigger.length > 0, `${phase} needs an exit trigger`)
    assert.ok(definition.accessibilityBehavior.length > 0, `${phase} needs accessibility behavior`)
    assert.ok(definition.errorHandling.length > 0, `${phase} needs error handling`)
  }

  assert.ok(FOCUS_PHASE_DEFINITIONS.focus_ready.allowedActions.includes('start_replay'))
  assert.ok(FOCUS_PHASE_DEFINITIONS.focus_ready.allowedActions.includes('open_detail'))
  assert.ok(FOCUS_PHASE_DEFINITIONS.loading_focus_data.disabledActions.includes('start_replay'))
  assert.ok(FOCUS_PHASE_DEFINITIONS.exiting_focus.disabledActions.includes('start_replay'))
})
