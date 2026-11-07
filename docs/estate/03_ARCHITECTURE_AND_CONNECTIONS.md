# Current Spatial runtime and dependent trust boundaries

Canonical runtime: Next.js/React/Three.js under `urai-tier1`, Firebase Functions under `apps/functions`. Home `/home` -> `FinalHomeThreshold` / `HomeSpatialRuntimeLayer`; `/ascent` is currently a compatibility redirect to `/home?from=ascent` (real Ascent effect belongs to Home/world controller); `/life-map` owns its persistent scene via layout; `/focus` -> `FocusChamberClient`; `/replay` -> `CinematicReplayClient`.

Visual functions exist in `urai-tier1/src/components/lifemap/LifeMapProductionWorld.tsx` (memory-star authored GLB, inline photosphere shader, stellar corona, 3D), `src/components/lifemap/LifeMapSemanticNavigator.tsx` (keyboard, search, related paths, owner-authorized destination buttons), `src/app/HomeParallaxTelemetryBridge.tsx`, `src/app/HomeAccessibleMovementControls.tsx`, and `src/app/replay/CinematicReplayClient.tsx`. Source-level existence does not establish every visual invariant on physical GPU.

Replay hook `urai-tier1/src/app/replay/useProtectedLifeMovieReplay.ts` is feature-gated and rejects demo, nonprivate, nonowner, wrong selected memory/plan/movie; uses Spatial and Studio Firebase auth identities, fresh tokens, selected-session cancellation, signed private service transport expectations, verified segmented metadata and local Blob URL revocation. These frontend checks are not a substitute for server/GCS policy; positive owner-only IAM playback remains untested.

Auth / ownership sequence: Privacy review #236 `5daa194148c1f0b157062ca09b8f1b6e629d6d29` -> consent/rights issuer (currently review-only) -> Studio review #179 `153d6c35557c66a8b9f8629778ca796b83730464` -> Jobs review #320 `ea8f0165ac74511a4e4196919ddd3109d0c1ff2e` -> protected output broker/Storage -> Spatial owner Replay. Staging #176 `49d705f21a0d8370f9c6b9db5cf344b1b20a1d9b` has separate synthetic owner/source/Life Graph emulator bridge; Council and avatar data/world linking need integrated acceptance.

Critical source conflict: Labs Rules guard #261 `2980ca804fe04c37256a00af6e291a79a05004e4` identifies Spatial/RuAi/Admin potentially publishing competing Firestore Rules to `urai-4dc1d/(default)`. Actual provider effective policy and IAM not inspected here. No Rules deployment or issuer enabled.

Production verification is distinct from local synthetic demo projects and separate Firebase project aliases. No privileged new cloud writers, credentials, private user media or deployment are introduced in this documentation branch.
