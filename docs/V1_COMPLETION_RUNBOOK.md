# URAI Spatial V1 Completion Runbook

This runbook converts the audit into the exact order of operations for finishing URAI Spatial V1 without creating duplicate scene authority.

## 0. Current locked direction

Canonical runtime:

```txt
routes -> TierOneExperience -> HomeScene -> R3F Canvas
```

Canonical data:

```txt
assetManifests or seed manifests -> useConstellationManifests -> ConstellationLayer -> ManifestRenderer / FocusActionPanel / Replay
```

Do not add new launch-critical behavior to legacy scene modules unless they are intentionally migrated into this canonical path.

## 1. Preflight inventory

Run these from repo root:

```bash
pnpm install
pnpm typecheck
pnpm build
pnpm test
pnpm test:canon
```

If full `pnpm test` is too heavy locally, run the chain in slices:

```bash
pnpm --filter urai-functions build
pnpm --filter urai-functions test
pnpm --filter urai-tier1 typecheck
pnpm --filter urai-tier1 build
pnpm --filter urai-tier1 test
pnpm test:e2e
pnpm test:replay-tier5
pnpm test:canon
```

Record failures before changing code. Do not fix visual polish before route/data/interaction failures are known.

## 2. Route lock

Required behavior:

| Route | Expected mode | Required visible behavior |
| --- | --- | --- |
| `/` | home | Home atmosphere, sky click target, orb, narrator HUD |
| `/home` | home | Same as `/` |
| `/life-map` | life-map | Constellation/Life Map state with selectable stars/nodes |
| `/focus` | focus | Focus route shell and selected/fallback memory state |
| `/replay` | replay | Replay state and unwind behavior |
| `/mirror` | mirror/detail | Safe mirror fallback in spatial shell |

Patch requirements:

- Add or update tests proving each route renders the right shell/mode.
- Confirm `/home` exists and points to `TierOneExperience mode="home"`.
- Confirm `/mirror` is intentionally routed and does not import stale/duplicate spatial state.

## 3. Interaction lock

Required behavior:

1. Home sky click routes to `/life-map`.
2. Life Map node click selects a manifest/star and opens the focus action panel.
3. Focus action panel starts replay using the selected manifest id when present.
4. Escape unwinds one layer:
   - replay -> focus
   - focus -> life-map
   - life-map -> home
5. Pointer misses must not accidentally route away from non-home modes.
6. Buttons must have accessible labels.
7. No microphone permission request on load.

Patch requirements:

- Add tests for sky click, node click, replay button, and Escape unwind.
- Keep R3F visual effects non-blocking for overlay controls.
- If legacy `ThreeSceneRoot` is used, resolve its `pointerEvents: none` contradiction before adding interaction inside it.

## 4. Data lock

Required behavior:

1. App works with seed manifests when Firestore is disabled.
2. App works with Firestore manifests when `NEXT_PUBLIC_URAI_MANIFEST_FIRESTORE=true`.
3. Firestore listener failure falls back to seed manifests.
4. Manifest objects are validated before rendering.
5. Selection propagates from constellation node -> focus panel -> replay route.

Patch requirements:

- Document `assetManifests` fields.
- Keep seed manifests deterministic.
- Add unit coverage for manifest validation and fallback behavior.
- Add adapter only if needed to convert memory events into spatial manifests.

## 5. Accessibility and motion lock

Required behavior:

- Home and Life Map remain keyboard navigable where overlays are used.
- Reduced-motion preference disables or softens continuous camera/particle loops.
- Narrator HUD text remains available even if voice playback is unavailable.
- Audio-reactive behavior starts only after explicit user action.

Patch requirements:

- Add a reduced-motion guard/hook if missing in canonical cinematic modules.
- Avoid autoplay voice/audio.
- Avoid hidden interactive elements inside `aria-hidden` containers.

## 6. Cinematic V1 polish

Only after route, interaction, and data locks pass:

- Tune camera paths.
- Tune constellation density and clustering.
- Tune atmosphere/particles for 60fps target.
- Add quality presets if performance dips.
- Preserve deterministic visual fixtures for lock tests.

## 7. Legacy consolidation

Audit for imports of:

```txt
src/spatial/scene/SpatialScene.tsx
src/spatial/scene/HomeWorld.tsx
src/spatial/components/LifeMapStarfield.tsx
src/spatial/effects/ThreeSceneRoot.tsx
src/spatial/store/useSceneStore.ts
```

If unused by canonical routes:

1. Move to quarantine/archive in a cleanup PR, or
2. Keep with a header comment stating it is migration-candidate only.

Do not delete until tests pass.

## 8. Ship-lock command chain

Final V1 lock requires:

```bash
pnpm typecheck
pnpm build
pnpm test
pnpm test:e2e
pnpm test:replay-tier5
pnpm test:canon
```

Also verify manually:

- No browser console errors on `/`.
- No browser console errors on `/life-map`.
- No unexpected mic prompt.
- Firestore disabled fallback works.
- Firestore enabled path does not crash when empty.
- Mobile viewport remains usable.

## 9. Closeout

When the above passes:

- Update issue #145 with validation results.
- Close V2 foundation issue only if its acceptance criteria are complete.
- Close AAA cinematic issue only if its acceptance criteria are complete.
- Tag a V1 lock release.

Suggested tag:

```txt
spatial-v1-lock
```

## 10. Non-goals for V1 lock

These are V2/AAA items unless already implemented safely:

- Full VR/XR navigation.
- True planetary memory clusters.
- Heavy audio-reactive mic pipelines.
- Narrative camera director trained on real private data.
- Advanced GPU-only galaxy simulation.
- Public multi-user spatial rooms.

V1 should feel magical, stable, and shippable before these expand.
