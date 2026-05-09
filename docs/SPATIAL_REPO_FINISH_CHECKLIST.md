# URAI Spatial Repo Finish Checklist

This checklist is the final handoff for PR #178 and the current URAI Spatial release-lock phase.

## PR in scope

```txt
https://github.com/LifeLoggerAI/urai-spatial/pull/178
```

## What this phase completes

- Fallback/demo launch boundary for URAI Spatial.
- Explicit disabled live-provider flags for AR/WebXR, biometric, wearable, memory-grounded, asset-factory, and cross-repo sync providers.
- Dedicated `/api/system/launch-boundary` endpoint for other URAI repos.
- Static contract check for the launch-boundary response shape.
- Runtime smoke coverage for `/api/system/launch-boundary`.
- Copy guardrail preventing public/source copy from implying deferred providers are live.
- Launch contract documentation for provider-readiness expectations.

## Final validation commands

Run from the repo root:

```bash
pnpm install
pnpm check:spatial-copy
pnpm check:launch-boundary-contract
pnpm check:spatial
pnpm tier2:check
pnpm test:canon
pnpm typecheck
pnpm build
HOST=http://127.0.0.1:3000 pnpm smoke
pnpm test:e2e
pnpm launch:check
```

## Merge gate

PR #178 may move from draft to ready only when:

1. The validation commands above pass.
2. The PR branch is current with `main` or GitHub reports it as mergeable.
3. `/api/system/launch-boundary` returns fallback/demo provider status.
4. Public copy still says live providers are deferred unless connected, consented, and validated.
5. Tier-2 checks pass without requiring a Tier-2 canon migration.

## Expected launch-boundary response requirements

The focused endpoint must expose:

- `service`
- `version`
- `launchBoundary`
- `fallbackMode`
- `deferredCapabilities`
- `requirementsBeforeLiveProviders`

The fallback launch boundary must keep these false until a separate provider rollout PR is complete:

- `liveProviderConnected`
- `liveArWebXrEnabled`
- `liveBiometricProviderEnabled`
- `liveWearableProviderEnabled`
- `liveMemoryGroundingEnabled`
- `liveAssetFactoryEnabled`

The fallback launch boundary must keep this true:

- `userConsentRequiredBeforeLiveProviders`

## Follow-up issues

- #180: update/rebase and validate PR #178 before merge.
- #181: define live AR/WebXR provider rollout gate.
- #182: define biometric, wearable, and memory-grounded provider consent gates.
- #183: publish launch-boundary integration contract for other URAI repos.

## Not included in this PR

This PR does not enable:

- live AR/WebXR sessions
- live camera or biometric providers
- live wearable sync
- memory-grounded orb behavior
- asset-factory spatial jobs
- cross-repo user memory sync

Those require separate implementation PRs with consent, tests, deployment evidence, and updated launch-boundary fields.
