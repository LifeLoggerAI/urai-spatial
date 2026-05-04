# URAI Spatial Branch Protection Guide

Apply these settings to `main` before merging URAI Spatial production changes.

## Required status checks

Require these GitHub Actions jobs:

- `Workspace install and preflight`
- `Tier 1 typecheck build and tests`
- `Functions build and tests`
- `Firebase config smoke`
- `Verification lock preflight`

## Recommended branch rules

- Require a pull request before merging.
- Require approvals before merging.
- Dismiss stale approvals when new commits are pushed.
- Require status checks to pass before merging.
- Require branches to be up to date before merging.
- Require conversation resolution before merging.
- Restrict who can push to `main`.
- Do not allow production launch bypasses.

## Production deployment gate

Production deploy uses `.github/workflows/urai-spatial-production-deploy.yml` and requires:

- GitHub Environment: `production`
- Manual workflow dispatch input: `LAUNCH-UNLOCK`
- No pending signoffs in `verification/signoffs.md`
- Required Firebase secrets present
- Production smoke check passes

## Launch lock policy

Keep the PR as draft until the verification ledger has all signoffs completed. When all signoffs are complete, replace each `Status: PENDING` with `Status: APPROVED` and include signer/date/evidence.
