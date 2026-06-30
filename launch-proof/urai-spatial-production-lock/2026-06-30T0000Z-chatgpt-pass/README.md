# URAI Spatial production lock audit — 2026-06-30T0000Z

Repo: `LifeLoggerAI/urai-spatial`
Branch inspected: `main`
Access observed through GitHub connector: admin/push available.

## Scope

This pass audited the public URAI Spatial source, WebXR/XR claims, Life Map surfaces, route evidence, Firebase deployment configuration, and existing release-evidence records. One safe source fix was committed to restore the WebXR entry-state resolver contract used by the overlay and renderer handoff.

## Safe fix applied

- Restored `resolveWebXREntryStateById` in `urai-tier1/src/spatial/webxr/resolveWebXREntryState.ts`.
- Kept XR as progressive enhancement: the state summary explicitly says unsupported devices remain in the spatial web fallback.
- Kept feature typing aligned to the repo-local WebXR declaration (`string[]` optional features).
- Commit from this pass: `1b9284215f05afa7844da270377c6191431d65bd`.

## Scores

- Spatial readiness score: `78/100` source-level partial production surface, deploy freshness not locked.
- XR readiness score: `42/100` real WebXR dependency, detection, requestSession overlay, and gating exist, but no verified headset session proof is present in this pass.
- 3D / Life Map readiness score: `72/100` real route and visual surfaces exist, but much of the Life Map data is demo/static and persistence is session-level in inspected code.

## Reality classification

| Area | Classification | Evidence summary |
| --- | --- | --- |
| Public Home/root | Real source surface | Root renders `TierOneExperience mode="home"`; Home mode renders `HomeWorldProduction`. |
| Home world UI | Real source surface | Route rail, sky/ground zones, orb/self-state HUD, and workforce hints are present. |
| Life Map / star map | Partial/demo | Source renders cinematic Life Map using `lifeMapDemoData`; current inspected persistence is sessionStorage memory selection. |
| XR dependency stack | Real source dependency | `three`, `@react-three/fiber`, `@react-three/drei`, and `@react-three/xr` are installed in `urai-tier1/package.json`. |
| XR capability detection | Real partial | `navigator.xr.isSessionSupported('immersive-vr'/'immersive-ar')` exists in gate/runtime code. |
| XR session entry | Partial | `navigator.xr.requestSession(...)` exists in `WebXREntryOverlay`, but no headset proof or live Quest validation was available here. |
| Mobile fallback | Partial | XR gate returns spatial-web fallback for unsupported browsers/devices. |
| Desktop fallback | Partial | Same spatial-web fallback path exists; desktop non-WebXR browsers should not show fake headset support. |
| Quest/browser behavior | Blocked/unverified | Requires physical Quest or browser WebXR validation and screenshot/video proof. |
| Persisted memory/world data | Partial/demo | Inspected route state uses sessionStorage selected memory plus demo Life Map data; no production Genesis/auth persistence was verified. |
| Genesis/auth/admin/content integration | Partial/unverified | Routes and API contracts exist, but no authenticated ecosystem integration was verified in this pass. |
| Deployment | Blocked/not locked | Existing evidence says static build passed previously, but Firebase credentials/deploy freshness blocked final live lock. |

## Device/browser support matrix

| Browser/device | Expected status | Notes |
| --- | --- | --- |
| Chrome/Edge desktop without WebXR immersive support | Spatial web fallback | No headset claim should be shown as supported unless `navigator.xr.isSessionSupported` returns true. |
| Mobile Safari/iOS | Spatial web fallback | WebXR immersive sessions are not production-supported here. |
| Android Chrome without headset runtime | Spatial web fallback | Capability check must decide support. |
| Meta Quest Browser | Candidate beta target | Must prove `immersive-vr` support and successful `requestSession` entry on device. |
| WebXR-capable desktop VR browser/runtime | Candidate beta target | Requires live headset/runtime validation, not source inspection alone. |

## Build/test/deploy proof status

This connector pass could inspect and update GitHub source, but did not run local `pnpm install`, `pnpm typecheck`, `pnpm build`, Playwright, Firebase deploy, or physical-headset WebXR validation. The repo contains scripts for those checks, including root `build`, `typecheck`, `test`, `lock:all`, `xr:verify`, `smoke:live`, and `smoke:home-xr:live`.

Prior repo evidence states `pnpm lock:static` and `pnpm build:static` passed on 2026-06-25 at commit `a4410ced781a0d756dac24eec0da77ba9f5d70d9`, but Firebase deploy was blocked by expired credentials and live `/status` remained stale until redeploy.

## P0 blockers

1. Run fresh `pnpm install` / bootstrap on latest `main` after commit `1b9284215f05afa7844da270377c6191431d65bd`.
2. Run `pnpm typecheck`, `pnpm build`, `pnpm lock:all`, and `pnpm xr:verify` on latest `main`.
3. Redeploy Firebase hosting from latest `main` after reauth/token renewal.
4. Run live smoke checks on `https://urai.app` and `https://urai-4dc1d.web.app`.
5. Validate actual Meta Quest Browser `immersive-vr` entry with evidence. Do not claim full XR until this is complete.

## P1 blockers

1. Replace or gate demo/static Life Map data behind honest demo labeling unless connected to real user persistence.
2. Add automated route smoke checks that cover public routes plus WebXR fallback copy.
3. Add accessibility checks for non-canvas/fallback operation and keyboard access.
4. Add visible unsupported-browser fallback copy where XR entry UI is present.

## P2 blockers

1. Capture screenshots/video proof of Home, Life Map, fallback XR state, and Quest session entry.
2. Add performance budget evidence for mobile and Quest.
3. Add explicit docs for supported browsers/devices and limitations.

## P3 blockers

1. Connect production analytics/monitoring proof.
2. Expand admin/content/Genesis integration proof.
3. Polish route copy and UX edge states.

## Completion plan to 100%

1. Source lock: run typecheck/build/tests on latest main after the resolver fix.
2. XR lock: test unsupported browser fallback, supported WebXR browser detection, and physical Quest `requestSession` entry.
3. Deploy lock: reauth Firebase, deploy latest main, run live smoke against both live URLs.
4. Data lock: either wire real authenticated Life Map persistence or label current static data as demo/showcase only.
5. Evidence lock: store logs, screenshots, live route response snapshots, device matrix, and final deploy proof under this folder.

FINAL VERDICT: PARTIAL — source has real spatial surfaces and partial WebXR foundations, but live deployment freshness and actual headset session entry are not verified yet.
