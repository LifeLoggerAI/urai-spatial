# URAI V1 Release Operations

URAI Genesis V1 uses a small, privacy-first release operations loop for public demo patches. The loop is designed to triage bugs, feedback, privacy issues, visual fixes, AI boundary fixes, and demo improvements without expanding V1 scope.

## Operating Principles

- Privacy and Passport rules come before polish or roadmap pressure.
- Patches must be small, reversible, and documented.
- P0 issues trigger immediate rollback or feature disable.
- P1 issues trigger a hotfix.
- P2 issues go into the next planned patch.
- P3 issues are batched into polish releases.
- New product features do not enter V1 through the patch loop.

## Release Flow

1. Capture issue or feedback.
2. Classify severity with `docs/ops/patch-triage.md`.
3. Confirm whether a hotfix is allowed with `docs/ops/hotfix-policy.md`.
4. Disable risky feature flags first when privacy or safety is at stake.
5. Patch the smallest safe surface.
6. Run `pnpm patch:check` and any targeted checks needed for the affected area.
7. Update `CHANGELOG.md` and, when public communication is needed, use `docs/ops/public-update-template.md`.
8. Confirm production behavior after deployment.
9. Feed non-urgent feedback into the roadmap pipeline.

## Versioning

- `0.1.x` = V1 public demo patches.
- `0.2.x` = first private alpha expansion.
- `0.3.x` = broader beta.
- `1.0.0` = full public V1 launch.

Current V1 baseline:

- App version: `0.1.0-genesis`
- Release channel: `public_demo`
- Build label: `Genesis V1`

Patch examples:

- `0.1.1` privacy/copy hotfix.
- `0.1.2` mobile layout patch.
- `0.1.3` demo/waitlist patch.

## Release Artifacts

- Patch triage: `docs/ops/patch-triage.md`
- Hotfix policy: `docs/ops/hotfix-policy.md`
- Incident response lite: `docs/ops/incident-response-lite.md`
- Rollback triggers: `docs/ops/rollback-triggers.md`
- Feedback pipeline: `docs/ops/feedback-to-roadmap.md`
- Patch checklist: `docs/ops/v1-patch-checklist.md`
- Changelog template: `docs/ops/changelog-template.md`
- Public update template: `docs/ops/public-update-template.md`

## Scope Guard

Release operations may improve safety, reliability, clarity, and demo stability. They must not add new product features, expand V1 scope, weaken privacy defaults, bypass Passport, or expose internal operations to public users.
