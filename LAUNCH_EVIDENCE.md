# URAI Launch Evidence

Date: 2026-06-23
Repository: LifeLoggerAI/urai-spatial
Canonical app: urai-tier1

## Launch finish pass

Target route chain:

`Home threshold -> Ground real-life world -> Life Map galaxy -> Focus memory chamber -> Replay living memory film`

## Files inspected / changed

- `urai-tier1/src/spatial/layout/HomeWorldProduction.tsx`
- `urai-tier1/src/spatial/layout/HomeWorldProduction.module.css`
- `urai-tier1/src/app/ground/page.tsx`
- `urai-tier1/src/app/ground/GroundWorld.module.css`
- `urai-tier1/src/spatial/layout/ReplayChamber.module.css`
- `urai-tier1/src/app/life-map/LifeMapAaaUniverse.tsx` inspected
- `urai-tier1/src/spatial/layout/MemoryModeSurfaceV2.tsx` inspected
- `firebase.static.json` inspected as the launch-safe hosting-only deploy config
- `package.json` updated with `live:deploy:static` and `publish:live:static`

## Completed source work

### Home

- Removed the separate launch CSS dependency from `HomeWorldProduction.tsx`.
- Moved the launch HUD, route previews, and route rail into `HomeWorldProduction.module.css`.
- Added clear ground and sky route language.
- Added clean Orb companion and Self state HUD cards.
- Added Ground and Life Map route preview cards.
- Added a consistent bottom route rail.

### Ground

- Rebuilt `/ground` around a full-screen embodied operating layer.
- Kept the hidden `RealmShell` guardian contract.
- Added a central orb companion, beam, spatial floor, grid, role cards, inspectable objects, object panel, and route rail.
- Replaced raw/fallback visual behavior with `GroundWorld.module.css` styling.

### Focus and Replay

- Replaced the cramped chamber CSS with a readable launch-polish layout.
- Enlarged the central memory/replay stage.
- Made the right signal rail scroll-safe.
- Moved replay controls above the route rail to reduce overlap.
- Preserved existing test-facing attributes from `MemoryModeSurfaceV2`.

### Static hosting deploy lane

- Added `live:deploy:static` for the current Cloud Shell and Firebase state.
- The command builds with `URAI_FIREBASE_STATIC_EXPORT=true` through the existing `build:static` script and deploys `firebase.static.json` hosting only.
- This avoids the Firebase Next framework Cloud Function build path that previously ran out of disk.

## Route proof observed before this visual patch

The latest user shell context showed HTTP 200 for:

- `https://urai.app/`
- `https://urai.app/home`
- `https://urai.app/life-map`
- `https://urai.app/focus`
- `https://urai.app/replay`
- `https://urai.app/mirror`
- `https://urai.app/passport`
- `https://urai.app/status`
- `https://urai.app/demo/replay-film`

## Build / release status observed before this visual patch

- GitHub Actions run `28005021230` passed the `Live release check` job at commit `945ec80a`.
- The separate deploy job failed because the repo had no Firebase deployment credential configured.
- Local full deploy failed before deploy because the shell runtime was missing a Playwright system library.
- Direct Firebase framework deploy then failed from low disk during the generated Cloud Function build.

## Required verification after this patch

Run from a repo checkout with working package manager state and enough disk:

```bash
pnpm urai:guardian
pnpm check:source-integrity
pnpm check:types
pnpm build
node tests/replay-memory-theater-contract.mjs
```

For low-disk deploy, prefer:

```bash
pnpm live:deploy:static
```

Capture visual proof after local start or deploy:

- `/home`
- `/ground`
- `/life-map`
- `/focus`
- `/replay`

Verify public routes after deploy:

- `/`
- `/home`
- `/ground`
- `/life-map`
- `/focus`
- `/replay`
- `/mirror`
- `/passport`
- `/status`

## Remaining blockers

- This connector run patched GitHub source but cannot execute the user's Firebase-authenticated deploy session.
- User shell showed Firebase access is available, but local disk pressure hit the framework deploy path.
- GitHub deploy needs a repository deployment credential before the deploy job can publish.

## Done standard

Not complete until the patched routes are built, visually verified, committed, deploy-attempted, and the latest public route chain is verified.
