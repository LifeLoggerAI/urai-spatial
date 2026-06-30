# Blockers — DONE-DONE completion pass

Starting SHA: `01702862d81da8708611dd5f1a5499397bbcc460`
Ending SHA: recorded in final response after proof commits land.
Branch: `main`
Evidence level: source/live/metadata.

## P0

| Severity | Issue | User-visible risk | Repo/file path | Fix required | Proof required | Acceptance criteria |
| --- | --- | --- | --- | --- | --- | --- |
| P0 | Firebase default host stale/broken | Users see old placeholder or internal errors. | `firebase.json`, `firebase.static.json`, `.github/workflows/firebase-xr-deploy.yml` | Redeploy latest audited build to `urai-4dc1d.web.app`. | Firebase release ID, smoke logs, deploy-proof JSON. | No stale copy; all public routes pass smoke. |
| P0 | Latest-main build/test absent | Source could fail despite preview. | Root scripts and workflows. | Run install/typecheck/test/build/xr verify/lock. | Logs or workflow run URL. | All required gates PASS. |
| P0 | Live commit freshness not proven | Live site may not match audited source. | `/api/system/deploy-proof`. | Deploy with SHA env and fetch proof. | JSON showing latest SHA. | Live SHA equals audited commit. |
| P0 | Quest/WebXR not physically verified | False headset support claim. | `urai-tier1/src/spatial/webxr/*`. | Test Meta Quest Browser. | Screenshot/video/console log. | `requestSession('immersive-vr')` succeeds and scene renders. |

## P1

| Severity | Issue | User-visible risk | Repo/file path | Fix required | Proof required | Acceptance criteria |
| --- | --- | --- | --- | --- | --- | --- |
| P1 | Life Map persistence not proven | Demo data could be mistaken for real account data. | `lifeMapDemoData.ts`, `TierOneExperience.tsx`. | Keep demo labels or wire real auth persistence. | Data lifecycle proof. | Public sample/demo labels visible unless real data is loaded. |
| P1 | Unsupported browser fallback not fully automated | XR fallback could regress. | XR overlay + smoke tests. | Browser automation. | Playwright logs/screenshots. | Enter VR hidden/disabled when unsupported. |

## P2

| Severity | Issue | User-visible risk | Repo/file path | Fix required | Proof required | Acceptance criteria |
| --- | --- | --- | --- | --- | --- | --- |
| P2 | Mobile/Quest performance unproven | Poor performance on target devices. | 3D/XR scenes. | Perf QA. | Device logs. | Meets frame/perf budget. |
| P2 | Integration proof missing | Product shape may overstate system integration. | Auth/admin/content/analytics APIs. | E2E tests. | Integration logs. | Ownership and service boundaries proven. |

## P3

| Severity | Issue | User-visible risk | Repo/file path | Fix required | Proof required | Acceptance criteria |
| --- | --- | --- | --- | --- | --- | --- |
| P3 | Asset provenance incomplete | Release artifacts not fully traceable. | Asset pipeline/docs. | Asset manifest/checksums. | Manifest. | Assets traceable to release. |
