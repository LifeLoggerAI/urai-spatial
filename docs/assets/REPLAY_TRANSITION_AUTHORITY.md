# Replay transition authority

Issue: #1107
Asset-lock rows: URA-068 and URA-069

## Canonical runtime mapping

URA-068 **Memory focus tunnel** is an implemented runtime composite, not a standalone media asset.

The canonical chain is:

1. Focus opens Replay with `requestUraiWorldTravel({ destination: 'replay', ... })` from `focus-memory-aperture`.
2. `WorldTransitionController` selects the deep-travel duration for Replay: 1900 ms normally and 260 ms under reduced motion.
3. `WorldStateProvider` records the ordinary cross-realm phase as `travelling` and preserves `previousDestination`.
4. `worldNavigation.css` renders the shared full-screen depth/tunnel transition.

URA-069 **Memory return-to-galaxy transition** is also an implemented runtime composite. The legacy row name is conceptual only.

Replay unwinds through `requestUraiWorldReturn()`. `WorldTransitionController` resolves `previousDestination` and, when Replay has no prior destination, deterministically falls back to Focus. The canonical reverse path is therefore **Replay -> Focus**, not a hard jump from Replay directly to Life Map. Life Map remains the upstream memory-selection realm.

## Asset authority

Do not create, promote, or require separate `memory-focus-tunnel` or `memory-return-to-galaxy-transition` GLB, PNG, or WebM files to satisfy URA-068/069. New standalone media would duplicate the existing shared transition authority unless a later governed architecture change explicitly replaces it.

## Enforcement

`urai-tier1/tests/replay-transition-evidence-contract.test.mjs` binds the exact runtime chain, reduced-motion behavior, deterministic return semantics, and duplicate-media prohibition. That contract is required by both focused unit-test runners and the runner-coverage lock.

## Evidence state

Source implementation and enforcement classify URA-068/069 as **implemented runtime composite / evidence in review**. Browser/device capture and any final asset-lock promotion remain separate evidence gates; source assertions alone do not mark the rows final-locked.
