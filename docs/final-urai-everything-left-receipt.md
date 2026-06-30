# URAI Everything Left Completion Matrix

Date: 2026-06-30

## Current repository changes pushed

- Home root and `/home` now route to `FinalHomeThreshold`, a hard replacement cinematic threshold with tap/click sky and ground zones.
- Life Map R3F scene was replaced with a more explorable 3D galaxy layer.
- Life Map now includes wheel movement, drag movement, star selection, Focus and Replay route actions, and procedural interior star textures.
- Ground route was moved to a premium private-world staging module.
- Ground now uses a darker embodied room/floor/grid/horizon treatment with private workforce, zones, objects, and inspector affordances.
- Focus route now uses `FinalFocusChamber`, a selected memory chamber surface with clear Replay entry.
- Replay route now uses `FinalReplayFilm`, a cinematic memory film surface with beat progression.
- Mirror route was upgraded to a final reflection realm with route rail, orb/pattern backdrop, and reflection stack.
- Passport route now uses `FinalPassportVault`, a premium identity, consent, and ownership vault surface.
- Status route was upgraded to a premium live route control room.
- XR portal now includes Quest/WebXR fallback language and manual Quest proof steps.
- Asset receipt audit tooling was added at `scripts/final-asset-receipt.mjs`.
- Final launch checklist and security dependency notes were added under `docs/`.

## Requires live deployment proof

The newest repo commits require Cloud Shell build, Firebase deploy, route checks, and screenshot sweep before they can be called fully launched.

## Human-only or external proof

- Quest 2 browser verification requires an actual Quest device.
- Provider keys, private account integrations, and paid billing features must be verified with real credentials.

## Final route chain to verify after deploy

- /
- /home
- /ground
- /life-map
- /focus
- /replay
- /mirror
- /passport
- /status
- /privacy-controls
- /location-map
- /ascent
- /unwind
- /demo
- /demo/replay-film
- /spatial/life-map
- /spatial/life-map-r3f
- /spatial/ar-vr

## Expected live markers after deploy

- `/` and `/home`: `urai-final-home-threshold`, `Your world is open`, `Ascend to Life Map`, `Descend to Ground`
- `/life-map`: `urai-true-3d-life-map`, `3D camera unlocked`, `Image stars`, `Wheel / drag / select`
- `/ground`: `premium-embodied-ground-world`, `Your real life has a place`, `Object inspector`
- `/focus`: `urai-final-focus-chamber`, `The Quiet Reset`, `Enter Replay`
- `/replay`: `urai-final-replay-film`, `Replay the thread`, `Film beats`
- `/mirror`: `urai-final-mirror-realm`, `See the pattern clearly`, `Reflection stack`
- `/passport`: `urai-final-passport-vault`, `Your life stays yours`, `Vault layers`
- `/status`: `URAI Status · Live Control Room`, `World online. Route matrix visible.`
- `/spatial/ar-vr`: `urai-quest-webxr-ready-portal`, `Quest 2 manual test`, `manual-device-required`
