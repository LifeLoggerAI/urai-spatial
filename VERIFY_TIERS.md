# URAI-Spatial Tier Verification Record

## Verification Date
2026-05-26

## Tier-1: Launch Spine
- Status: Deploy-ready.
- Active files: `urai-tier1/src/app/page.tsx`, `urai-tier1/src/app/home/page.tsx`, `urai-tier1/src/app/spatial/page.tsx`, `urai-tier1/src/components/urai/UraiV1Experience.tsx`, `urai-tier1/src/lib/urai-v1-demo-profile.ts`, `urai-tier1/src/lib/urai-v1-profile-store.ts`, `urai-tier1/src/lib/firebase.ts`.
- Routes: `/`, `/home`, `/spatial`.
- Verified behavior: magical sky/ground/orb home renders; demo mood `quiet momentum` with `dawn` weather loads without Firebase; companion insight renders; chat panel opens and accepts input; memory/spatial panel opens and shows memory stars; mobile panel fits at 390px width; missing Firebase config falls back to demo data; no console errors in focused V1 smoke.
- Commands passed: `corepack pnpm install`, `corepack pnpm lint`, `corepack pnpm typecheck`, `corepack pnpm build`, `corepack pnpm --filter urai-tier1 test`, focused Playwright V1 smoke.
- Risks: live Firebase-backed reads still require real public Firebase env vars and readable user-scoped Firestore documents.

## Tier-2: Supported Adjacent Layer
- Status: Supported and buildable.
- Files/routes: `/life-map`, `/replay`, `/focus`, `/u/adamclamp`, direct memory/focus/replay routes, shared memory schema, orb-companion API, Firebase client helpers.
- Verified behavior: `/life-map` responds as the canonical LifeMap route; `/replay` remains wired to `TierOneExperience mode="replay"` with replay compatibility markers; direct memory/focus/replay routes fail closed or redirect through demo-safe resolvers; `urai-tier1` contract tests pass 61/61.
- Pending items: the older `/life-map` route is supported adjacent product, not the active V1 launch home.
- Risks: Tier-2 route internals are heavier than the V1 spine and should stay isolated from `/`.

## Tier-3: Legacy / Experimental / Roadmap
- Status: Identified and non-blocking for Tier-1.
- Systems identified: replay-tier5 browser lock, advanced LifeMap replay flow, XR/AR/VR runtime, advanced spatial visual systems, Stripe/entitlement paths, narrator/voice provider routes, marketplace/future monetization surfaces.
- Known failures: `corepack pnpm test` reaches `tests/replay-tier5-lock.mjs` and fails with `seed memory bloom node is not visible`; optional Playwright runtime probe reports Chromium launch trouble in this local shell before the later browser lock runs.
- Why they do not block Tier-1: the failure is in the legacy replay-tier5 `/life-map` browser flow, not the active `/` V1 spine; lint, typecheck, build, `urai-tier1` contracts, and V1 smoke all pass.
- Recommended later cleanup: decide whether replay-tier5 remains part of launch verification; either repair the legacy LifeMap node visibility contract or move it to a separate Tier-3-only gate.

## Security Record
- .env.local: removed from GitHub main and absent in the local verification mirror.
- .gitignore: protects `.env`, `.env.*`, and keeps `!.env.example`.
- secrets scan: no real committed secret values found in active source; env names and placeholder docs remain.
- rotation required: yes, rotate the previously committed provider key because deletion does not invalidate an exposed credential.

## Build / Test Record
- lint: `corepack pnpm lint` passed.
- typecheck: `corepack pnpm typecheck` passed.
- build: `corepack pnpm build` passed; warnings are existing protobuf dynamic import and missing Next ESLint plugin config.
- tests: `corepack pnpm --filter urai-tier1 test` passed 61/61; `corepack pnpm test` failed in Tier-3 replay-tier5 browser lock.
- smoke/manual checks: focused Playwright V1 smoke passed on `/`, `/home`, and `/spatial`; `/life-map` responded; mobile width was safe at 390px viewport.

## Deployment Record
- target: Firebase Hosting / App Hosting from `firebase.json` and `.firebaserc`.
- status: Deploy-ready, not live deployed.
- URL: none.
- reason if not deployed: Firebase CLI is available, but no authorized Firebase account is logged in.
- exact deploy command: `corepack pnpm deploy:staging`.
