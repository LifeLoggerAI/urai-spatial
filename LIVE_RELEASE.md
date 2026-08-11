# URAI Spatial Live Release

## Current decision

Production release is **NO-GO**. This repository currently provides verification-only release and preview workflows. They cannot receive provider credentials or execute Firebase deployment, rollback, Hosting recovery, or preview-channel mutation.

## Source verification commands

Run the explicit fail-closed release guard:

```bash
pnpm done-done:guard
```

Run the non-deploying release checks:

```bash
pnpm live:check
```

`scripts/live-release.mjs` rejects `--deploy` and `--deploy-prebuilt`. The legacy Hosting-recovery module rejects discovery, restore, and verification operations outside its successful fail-closed self-test.

Do not run `firebase deploy`, `pnpm live:deploy`, `pnpm publish:live`, or an ad-hoc preview-channel deploy. Those commands are not authorized release paths.

## GitHub Actions boundary

- `.github/workflows/spatial-live-deploy.yml` verifies the exact candidate and records `Classification: NO-GO`.
- `.github/workflows/capture-legacy-hosting-recovery.yml` verifies that recovery stays quarantined.
- `.github/workflows/urai-full-preview-channel.yml` performs local static/browser verification only.
- `.github/workflows/location-map-trusted-preview.yml` performs local Location Map verification only.
- `.github/workflows/urai-spatial-preview.yml` performs local browser acceptance only.

None of these workflows has a production environment, Google/Firebase secret, deploy input, or provider mutation step.

## Restoring release authority

A future release path requires a separately reviewed exact-head change after all of the following are recorded:

- historical Google/Firebase credentials revoked;
- old credentials fail negative authentication;
- Cloud Audit Logs reviewed;
- protected external-account WIF trust and least-privilege IAM confirmed;
- protected runtime configuration installed and read back;
- repository/environment secret settings inspected;
- exact-head nonproduction validation completed;
- genuine eligible non-author security/runtime approval obtained;
- rollback provenance and independent live-verification plan approved.

Source CI, local browser proof, artifacts, or a green preview check do not satisfy these provider and governance gates.

## Honest proof boundaries

Current verification does not prove production provider identity, deployment, rollback, destructive recovery, public-domain parity, physical-device certification, or final human visual acceptance. Keep public and internal status **NO-GO** until those independent receipts exist.

## Ownership boundary

URAI Spatial owns the immersive spatial interface layer only. See `REPO_PURPOSE.md` before adding non-spatial product, website, marketing, jobs, analytics, admin, or staging-mirror work to this repo.
