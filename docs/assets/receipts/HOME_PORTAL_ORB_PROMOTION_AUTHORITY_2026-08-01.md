# Home, Portal Ring, and URAI Orb Promotion Authority

Recorded: 2026-08-01
Repository: `LifeLoggerAI/urai-spatial`
Base main: `8129e8dd005cb8ad869c192156e4391b5cd386f2`
Branch: `agent/promote-home-portal-orb-20260801`

## Purpose

Bind the three accepted launch-critical spatial binaries to one narrow, reviewable promotion record without changing Ground, Life Map, Focus, Replay, shared sensory assets, deployment authority, or public-live claims.

## Accepted binaries

### Home Entry Chamber

- Canonical path: `urai-tier1/public/assets/urai/generated/models/home-entry-chamber-v1.glb`
- SHA-256: `b7bdced5a721598a9dfe592ee19da04d754d5b8b1d48b23cc44403a89b1ee529`
- Bytes: `184160`
- Governed reviewed width: `18.69m`
- Accepted authority: merged PRs #986 and #987
- Source/license class: URAI Labs internally authored production asset
- Fallback retained: `home-entry-chamber-proof-fallback`

### Portal Ring Master

- Canonical path: `urai-tier1/public/assets/urai/generated/models/portal-ring-master-v1.glb`
- SHA-256: `6e29acaaab0eb048ddd2e4690bf5949ef58865061574ca961bdec6b6312d80f5`
- Bytes: `73164`
- Exact proof PR: #998
- Exact proof head: `7cfe06c18750189d48423cf2f8ddc7241cab7004`
- Merged main: `8129e8dd005cb8ad869c192156e4391b5cd386f2`
- Fallback retained: `portal-ring-proof-fallback`

### URAI Orb Avatar

- Canonical path: `urai-tier1/public/assets/urai/generated/models/urai-orb-avatar-v1.glb`
- SHA-256: `34f48f2bc042458c041d738d2b68d390eab05a61f91b37a8cd30defd0753d18c`
- Bytes: `83984`
- Exact proof PR: #998
- Exact proof head: `7cfe06c18750189d48423cf2f8ddc7241cab7004`
- Merged main: `8129e8dd005cb8ad869c192156e4391b5cd386f2`
- Fallback retained: `urai-orb-proof-fallback`

## Retained proof

Portal and Orb exact proof completed all 20 registered workflows successfully. Retained artifact:

- Artifact ID: `8816835462`
- Name: `portal-orb-proof-7cfe06c18750189d48423cf2f8ddc7241cab7004`
- Digest: `sha256:da54d28e807c9d0877515857ccea1c71f2f0b85be872f1a5518e580cd06f5c6a`
- Evidence: receipt, desktop capture, portrait-mobile capture, and reduced-motion capture

## Promotion boundary

This record authorizes only a narrow manifest-truth correction for these exact three immutable binaries after exact-head validation. It does not:

- regenerate or alter any accepted binary;
- authorize provider calls or spending;
- mark Ground, Life Map, Focus, Replay, materials, particles, loading, or audio ready;
- remove procedural fallbacks;
- authorize merge without terminal exact-head checks;
- authorize production deployment;
- claim `urai.app` is live on this SHA.

## Required exact-head checks before merge

- canonical paths resolve and return the exact recorded bytes;
- SHA-256 values match this receipt;
- GLB validation passes with no external references;
- manifest resolver selects each accepted asset and retains its fallback;
- Home asset readiness proof passes;
- Portal and Orb route proof passes on desktop, mobile, and reduced motion;
- typecheck, build, asset validation, release security, and route smoke pass;
- no unresolved review finding remains.

## Production relationship

Protected production remains separately governed by issue #999. DNS and `https://urai.app/release-fingerprint.json` must be reachable before any production attempt. This receipt cannot bypass exact-current-main, rollback, fingerprint, or strict public-smoke gates.
