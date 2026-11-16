# WORLD001 isolated verification — 2026-11-15 (UTC 2026-11-16)

## Source lock
- Repository: LifeLoggerAI/urai-spatial
- Commit: `0e304e49ee44afb2a06680122aaa2fa96b488782`
- Isolated Runpod pod: `vpzfwt3imhu6bm` (4 vCPU, 16 GiB, US-MO-1, $0.16/hour while running; stopped after tests)
- Fresh shallow Git fetch of exact SHA, pnpm 10.0.0, frozen lockfile install.

## Directly observed PASS
- `pnpm install --frozen-lockfile --filter urai-tier1...`: completed.
- `pnpm --filter urai-tier1 typecheck`: completed with exit code zero.
- `pnpm --filter urai-tier1 build`: completed with exit code zero; Next.js 15.5.27.
- `node scripts/world001-v3-preview-asset.mjs verify-source`: expected 2,742,444 bytes and SHA-256 `84727ed6d335b51f736194a3850d5390a3d4ab8876f07acc8bb08593c5c33717`.
- `node --import tsx --test tests/aaa-world-artifact-contract.test.mjs`: 8 pass, 0 fail.
- `node --import tsx --test tests/studio-spatial-handoff.test.mjs`: 6 pass, 0 fail.
- `assert-excluded`: public preview binary absent.
- Explicit development-only `stage` and Next.js dev server: HTTP 200, 2,742,444-byte response for the exact model URL on loopback.
- After local test: `clean` then `assert-excluded` PASS. The isolated pod was stopped.

## NOT certified
- HTTP serving does not prove WebGL/R3F browser rendering or Android visual acceptance.
- No authenticated consent-to-memory-to-Replay-to-export/deletion integration proof was produced in this run.
- No private-memory writes were enabled; no public production promotion.
- GitHub Actions runs 43786690721 (security), 43786690770 (retained runtime), 43786690758 (preview) are marked failed. Job step listings were empty, and job log downloads returned BlobNotFound; the failure mechanism remains unknown.
- Vercel deployment API rejected Git-backed preview creation with `no_github_account_connected`. Existing READY deployment is not this commit.
- Independent security approval, exclusive GCS writer/stale-writer denial, credential incident closure, full device acceptance and protected CI remain required.

## Decision
**BUILD GREEN / RELEASE HOLD.** Do not merge the 1,067-file recovery PR wholesale. Do not distribute the interpretive model in a production build. Next: exact-commit protected browser/device visual evidence, complete authenticated owner-data lifecycle, security gates and independently approved deployment.
