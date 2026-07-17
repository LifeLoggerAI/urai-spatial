# Production live-surface failure — 2026-07-17

## Verdict

Production is **not certified current**.

Direct public inspection on 2026-07-17 shows both `https://urai.app/` (redirecting to `/home`) and `https://www.urai.app/home` returning a legacy public-demo surface rather than the merged persistent-world convergence.

Observed user-facing legacy markers include:

- `Source: demo / focused`
- `Build with us`
- `Help us tune the Life Movie.`
- `We ship daily`
- `Feedback capture is paused because Firebase isn’t configured in this environment.`
- `Bug intake is paused here.`

A second observed legacy variant includes:

- `Genesis home preview`
- `The home field opens before anything private does.`
- `URAI Home is the calm launch doorway: a cinematic public demo`
- `Launch safety: Home is a launch demo`

## Repository evidence

Current `scripts/urai-live-smoke.mjs` already classifies the following as forbidden legacy-runtime evidence:

- `Loading URAI`
- `Help us tune the Life Movie`
- Firebase-not-configured feedback copy

The canonical hosting configuration uses `urai-tier1/out`, `cleanUrls: true`, and `trailingSlash: true`.

The canonical production workflow currently defines only `LIVE_URL: https://urai.app`. Final production certification must prove both custom-domain hosts and slash parity, not only one configured base URL.

## Required repair

1. Identify the protected production run dispatched from the latest canonical release commit.
2. Determine whether deployment was blocked before mutation, failed during Firebase deployment, or deployed to the wrong site/project/channel.
3. Require exact release fingerprint and expected source SHA on both apex and `www` hosts.
4. Require route-marker and forbidden-legacy checks on both hosts.
5. Retain response URL, status, selected headers, fingerprint body, and route verdicts as an artifact.
6. Do not declare production current until both hosts converge on the same certified release.

## Safety

Do not weaken the existing legacy-runtime rejection. Do not bypass the protected production environment, Firebase project check, exact-head build, attestation, or rollback proof.
