# Blockers — URAI Spatial live completion pass

## P0 blockers

| Severity | Issue | User-visible risk | Repo/file path | Fix required | Proof required | Acceptance criteria |
| --- | --- | --- | --- | --- | --- | --- |
| P0 | Latest main build/test not proven | Source may be broken despite live preview. | Root scripts in `package.json`; `urai-tier1/package.json` | Run install, typecheck, tests, build, XR verify. | Logs in `command-logs/`. | All required commands exit 0 on latest main. |
| P0 | Firebase default hosting stale | Users hitting `urai-4dc1d.web.app` see old placeholder and false unfinished state. | `firebase.static.json`, `firebase.json`, hosting deploy scripts | Redeploy latest audited build to Firebase hosting. | Live smoke logs for `https://urai-4dc1d.web.app`. | No stale placeholder; route chain passes smoke. |
| P0 | Quest/WebXR session not verified | Public could overclaim headset support. | `urai-tier1/src/spatial/webxr/*`, XR overlay/runtime scripts | Physical Meta Quest Browser validation. | Screenshot/video/log showing `isSessionSupported` and `requestSession` success. | Quest support stays unclaimed until proof exists. |
| P0 | Live commit freshness not proven | Custom domain may not be current main. | `/api/system/deploy-proof`, deploy scripts | Expose/verify commit SHA marker in live deploy proof. | JSON deploy proof from live URL with latest commit SHA. | Live marker equals latest audited commit. |

## P1 blockers

| Severity | Issue | User-visible risk | Repo/file path | Fix required | Proof required | Acceptance criteria |
| --- | --- | --- | --- | --- | --- | --- |
| P1 | Life Map is demo/static in inspected source | Users may think private memory persistence is live. | `urai-tier1/src/spatial/v1/lifeMapDemoData.ts`; `TierOneExperience.tsx` | Keep public demo labels or wire real persistence. | Auth-backed memory lifecycle proof or demo labels. | Public preview clearly says sample/demo/fallback unless real data is used. |
| P1 | Unsupported-browser fallback needs automated screenshots/logs | XR fallback can regress silently. | `WebXREntryOverlay.tsx`; smoke scripts | Add browser smoke/visual test for no-WebXR environment. | Playwright/browser logs. | Enter XR hidden/disabled and fallback copy visible. |
| P1 | CI not attached to latest main | Regressions may land without receipt. | `.github/workflows/*` | Trigger or add CI for build/type/test/smoke. | Workflow run linked to latest commit. | Green CI on latest main. |

## P2 blockers

| Severity | Issue | User-visible risk | Repo/file path | Fix required | Proof required | Acceptance criteria |
| --- | --- | --- | --- | --- | --- | --- |
| P2 | Performance not proven on mobile/Quest | Spatial surface may stutter or fail on target devices. | 3D scene components; XR runtime | Capture perf budget metrics. | Device perf logs/screenshots. | Meets target frame/perf thresholds. |
| P2 | Integration proofs missing | Public shape may not match real ecosystem wiring. | API/system routes; Genesis/auth/admin/content integrations | End-to-end integration test plan and execution. | Integration logs. | Auth/content/admin/analytics boundaries proven. |

## P3 blockers

| Severity | Issue | User-visible risk | Repo/file path | Fix required | Proof required | Acceptance criteria |
| --- | --- | --- | --- | --- | --- | --- |
| P3 | Polish/UX edge states | Some routes may feel preview-like. | Public components/routes | Copy and loading/error polish. | Visual QA. | No misleading loading, stale, or placeholder copy. |
| P3 | Asset provenance | Static visual assets may lack release manifest proof. | Asset imports/manifests | Add asset manifest/version receipt. | Asset manifest/checksums. | Assets are traceable and reproducible. |
