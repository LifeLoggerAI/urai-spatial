# URAI Launch Evidence

Date: 2026-06-23
Repository: LifeLoggerAI/urai-spatial
Canonical app: urai-tier1
Live domain: https://urai.app
Firebase project: urai-4dc1d

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
- `urai-tier1/src/spatial/layout/MemoryModeSurfaceV2.tsx` inspected and restored/polished for Focus and Replay chamber render
- `firebase.static.json` inspected as the launch-safe hosting-only deploy config
- `package.json` updated with `live:deploy:static` and `publish:live:static`
- `LAUNCH_EVIDENCE.md` updated with deploy and route proof

## Completed source work

### Home

- Removed the separate launch CSS dependency from `HomeWorldProduction.tsx`.
- Moved the launch HUD, route previews, and route rail into `HomeWorldProduction.module.css`.
- Added clear ground and sky route language.
- Added clean Orb companion and Self state HUD cards.
- Added Ground and Life Map route preview cards.
- Added a consistent bottom route rail.
- Latest live screenshot proof showed the public root on `urai.app` rendering the threshold surface with sky route, ground route, orb companion HUD, self-state HUD, visible workforce panel, and route rail.

### Ground

- Rebuilt `/ground` around a full-screen embodied operating layer.
- Kept the hidden `RealmShell` guardian contract.
- Added a central orb companion, beam, spatial floor, grid, role cards, inspectable objects, object panel, and route rail.
- Replaced raw/fallback visual behavior with `GroundWorld.module.css` styling.
- Latest live screenshot proof showed `urai.app/ground` rendering the private real-life operating layer with embodied workforce cards, inspectable objects, central orb, and object inspector.

### Life Map

- Life Map remained the strongest foundation and was retained rather than replaced.
- Latest live screenshot proof showed `urai.app/life-map` rendering the memory galaxy with spatial stars, selected chapter card, orb companion prompt, actions, stats, and route rail.

### Focus and Replay

- Replaced the cramped chamber CSS with a readable launch-polish layout.
- Enlarged the central memory/replay stage.
- Made the right signal rail scroll-safe.
- Moved replay controls above the route rail to reduce overlap.
- Preserved existing test-facing attributes from `MemoryModeSurfaceV2`.
- Restored the chamber render in `MemoryModeSurfaceV2` after the route polish pass.
- Latest live screenshot proof showed `/focus` as a selected memory chamber and `/replay` as a cinematic replay chamber with beat rail, enlarged frame, signal rail, controls, and route rail.

### Static hosting deploy lane

- Added `live:deploy:static` for the current Cloud Shell and Firebase state.
- The command builds with `URAI_FIREBASE_STATIC_EXPORT=true` through the existing `build:static` script and deploys `firebase.static.json` hosting only.
- This avoids the Firebase Next framework Cloud Function build path that previously ran out of disk.

## Build / release status

GitHub Actions run `28005021230` passed the `Live release check` job at commit `945ec80a`.

The separate GitHub deploy job failed because repository deploy credentials are not configured for Actions.

Local full deploy attempts hit real environment blockers:

- local Playwright runtime missing `libXext.so.6`
- Firebase Next framework deploy generated a Cloud Function and hit `ENOSPC`

The final practical deploy lane used static export and Firebase Hosting only.

## Static deploy proof

The user shell ran:

```bash
pnpm live:deploy:static
```

Observed build/deploy output:

- `URAI_FIREBASE_STATIC_EXPORT=true` static build completed
- Next generated static pages: `110/110`
- Firebase Hosting found `355 files in urai-tier1/out`
- upload complete
- version finalized
- release complete
- Deploy complete
- Hosting URL: `https://urai-4dc1d.web.app`

## Public route proof after deploy

The latest live verification returned HTTP 200 for:

- `https://urai.app/`
- `https://urai.app/home`
- `https://urai.app/life-map`
- `https://urai.app/focus`
- `https://urai.app/replay`
- `https://urai.app/mirror`
- `https://urai.app/passport`
- `https://urai.app/status`
- `https://urai.app/demo/replay-film`

Earlier route proof also showed the public chain including `/ground` returning HTTP 200. The latest visual proof confirmed `https://urai.app/ground` rendered the rebuilt Ground World.

## Visual proof captured by user screenshots

Live browser screenshot proof was captured for:

- `/` and `/home`: Home threshold with sky route, ground route, HUD cards, orb, workforce panel, and route rail
- `/ground`: embodied real-life operating layer with private workforce agents, inspectable objects, central orb, and object inspector
- `/life-map`: memory galaxy with selected chapter card and spatial star field
- `/focus`: selected memory chamber with central memory object and clean right signal rail
- `/replay`: cinematic memory film with beat rail, central replay frame, playback controls, and right signal rail

## Remaining blockers

The public static hosting route chain is deployed and live.

Remaining real blockers are infrastructure/workflow, not current public route availability:

- GitHub deploy job still needs a repo deploy credential before it can publish from Actions.
- Full Firebase framework deploy still needs more disk/cleaner environment because it generates a Cloud Function for Next framework hosting.
- Local Playwright browser checks need missing system libraries installed before they can run in the current Cloud Shell.

## Done standard status

- Source inspected: yes
- Route files patched: yes
- Build completed through static export: yes
- Public static deploy attempted: yes
- Public static deploy succeeded: yes
- Public route chain verified: yes for `/`, `/home`, `/life-map`, `/focus`, `/replay`, `/mirror`, `/passport`, `/status`, `/demo/replay-film`; `/ground` visually verified live and previously route-verified
- Visual route screenshots captured: yes by user browser screenshots
- Evidence updated: yes

The public static launch chain is live. Further work should focus on higher-fidelity visual polish, GitHub deploy credentials, and restoring full framework deploy when disk/auth are stable.
