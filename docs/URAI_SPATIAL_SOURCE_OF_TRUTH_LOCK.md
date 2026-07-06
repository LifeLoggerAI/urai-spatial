# URAI Spatial Source-of-Truth Production Lock

Status: active certification candidate
Date: 2026-07-06
Repository: `LifeLoggerAI/urai-spatial`
Canonical branch: `main`
Canonical product root: `urai-tier1`
Firebase project target: `urai-4dc1d`
Public domain: `https://urai.app`

## Current Home authority

```text
urai-tier1/src/app/page.tsx
  -> urai-tier1/src/app/FinalHomeThreshold.tsx
  -> urai-tier1/src/app/HomeSpatialWorldFinal.tsx
```

Earlier references to `SpatialScene`, `TierOneExperience`, or `HomeScene` are historical and are not current Home authority. A migration may change the owner only when the route entry, this lock, tests, browser proof, and release receipt change together in one passing pull request.

## Canonical route authority

The route owner is the matching App Router entry under `urai-tier1/src/app`. The primary journey is:

`Home -> Ground -> Life Map -> Focus -> Replay -> Mirror -> Passport -> Status`

This includes `/`, `/home`, `/ground`, `/life-map`, `/focus`, `/replay`, `/mirror`, `/passport`, `/privacy-controls`, `/location-map`, `/status`, `/ascent`, `/unwind`, and the preview-only `/spatial/ar-vr` route.

Route reachability alone does not prove correct ownership, interaction behavior, query/slash parity, deployment freshness, or XR device support.

## Runtime boundary

The public product plane under `urai-tier1` owns browser routes, visual interaction, accessibility, fallback behavior, builds, and Firebase output.

The root TypeScript plane under `src` owns deterministic simulation, memory capture, replay ordering, prediction, XR-frame generation, communications packets, analytics events, and local runtime state.

The root runtime is not the deployed browser owner. It may connect to `urai-tier1` only through a versioned JSON-safe contract and exact-commit evidence. See `docs/V50_CANONICAL_RUNTIME_CONTRACT.md`.

## Persistence lock

The root runtime must not write its default state into the repository working tree. Its default path must be outside the repo, with `URAI_RUNTIME_STATE_PATH` available for controlled overrides. Local runtime state filenames must be ignored by Git.

## v50 evidence lock

One immutable commit must produce a downloadable artifact containing:

- canonical path and runtime-boundary check;
- root runtime TypeScript compile log;
- one-cycle root runtime smoke log;
- `urai-tier1` typecheck log;
- `urai-tier1` production build log;
- exact tested commit SHA;
- machine-readable v50 receipt.

Deployment, custom-domain parity, rollback, screenshots, provider receipts, and physical-device proof remain separate gates.

## Version boundary

- **v50**: canonical product path plus single-node deterministic runtime evidence.
- **v100**: distributed convergence and cross-repository contracts. PR #412 remains outside v50 until rebased and passing.
- **v150**: provider, shared spatial, resilience, language, cost, deploy, and device-matrix evidence.
- **v200**: production release train, data-rights proof, load/security/recovery evidence, device certification, and immutable rollback.

## Current checklist

- [x] Canonical product root named.
- [x] Current Home source owner named.
- [x] Root computation plane separated from browser authority.
- [x] v50 claim boundary documented.
- [ ] Default persistence moved outside the repository.
- [ ] v50 contract, compile, smoke, typecheck, and build pass on one exact commit.
- [ ] Downloadable evidence artifact exists.
- [ ] Passing main, deployed, and rollback SHAs are recorded.
- [ ] Domain parity and desktop/mobile proof pass.
- [ ] Provider and device claims remain disabled until their receipts exist.
