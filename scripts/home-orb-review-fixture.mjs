// Synthetic visual inspection only. Normal Home interaction and live provider
// lifecycle captures must never use this fixture admission.
export async function admitSyntheticHomeOrbFixture(page, state, { ownerSelector, orbStates, orbClips, expectReady }) {
  if (state.syntheticOrbFixture !== true) return null
  if (expectReady || !orbStates.includes(state.orbState)) throw new Error('Synthetic Orb fixture requires a disclosed review candidate and a known state')
  const admission = await page.evaluate(({ ownerSelector, requestedState, eventName }) => {
    const query = new URLSearchParams(window.location.search)
    const owners = document.querySelectorAll(ownerSelector)
    const owner = owners[0]
    const attr = name => owner?.getAttribute(name)
    if (owners.length !== 1 || query.get('homeAssetReview') !== '1'
      || query.get('homePrivateFixture') !== '1' || query.get('homeOrbState') !== requestedState
      || attr('data-home-asset-mode') !== 'disclosed-review-candidate'
      || attr('data-home-personalization-mode') !== 'private-personalized'
      || attr('data-home-review-fixture') !== 'safe-private'
      || attr('data-home-scene-phase') !== 'HOME'
      || ['data-home-ready', 'data-home-assets-ready', 'data-home-input-ready', 'data-home-interaction-ready']
        .some(name => attr(name) !== 'true')) throw new Error('Synthetic Orb fixture was not admitted by the ready private review owner')
    const previousState = attr('data-home-orb-state')
    // Use the canonical event boundary once. React and the actual scene own the
    // resulting state, authored model clip, material and animation. No telemetry
    // attribute is written, and subsequent actor resets or interaction can win.
    window.dispatchEvent(new CustomEvent(eventName, { detail: { state: requestedState, source: 'system' } }))
    return { evidenceKind: 'synthetic-visual-fixture', boundary: eventName, source: 'system', admissions: 1, requestedState, previousState }
  }, { ownerSelector, requestedState: state.orbState, eventName: 'urai:orb-state' })
  await page.waitForFunction(({ ownerSelector, requestedState, authoredClip }) => {
    const owner = document.querySelector(ownerSelector)
    return owner?.getAttribute('data-home-orb-state') === requestedState
      && owner.getAttribute('data-home-orb-clip') === authoredClip
  }, { ownerSelector, requestedState: state.orbState, authoredClip: orbClips[state.orbState] }, { timeout: 10_000 })
  return admission
}
