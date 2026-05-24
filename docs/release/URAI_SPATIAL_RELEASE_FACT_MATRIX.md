# URAI Spatial Release Fact Matrix

## Current Posture

- `LifeLoggerAI/urai-spatial` is a credible release candidate.
- It is not live-verified yet.
- Current decision remains `NO-GO`.
- `release/LIVE_STATUS.md` must not be changed to `live-verified` unless all required proof exists.
- No valid live claim exists unless release gate, deploy, smoke, and ledger all reference one locked SHA.

## Fact Matrix

| Fact | Status | Value | Basis |
| --- | --- | --- | --- |
| Current default branch | confirmed | `main` | GitHub repo metadata |
| Current `main` HEAD | confirmed | `f81f29066685ee1a361f25ef9d8922a4253dc81b` | GitHub API verification |
| Visible current-main candidate SHA | proposed, not yet locked | `f81f29066685ee1a361f25ef9d8922a4253dc81b` | Matches current known `main` HEAD; not release-proof until explicitly locked by release owner |
| Previous working candidate SHA | stale unless explicitly re-locked | `a572188d61887275f8ce88e186bb554f30d9d903` | Superseded for current-main release-readiness purposes by newer visible `main` HEAD |
| Production Firebase project ID | unknown | unknown | `release/LIVE_STATUS.md` still shows pending; `.firebaserc.example` contains placeholders only |
| Intended live URL/domain | unknown | unknown | Workflow expects `live_url` input or `URAI_SPATIAL_PRODUCTION_URL`; no repo-visible value found |
| Release owner | proposed, conditional | `Adam Clamp / @lifeloggerai` | Proposal only; human confirmation still required |
| Rollback owner | proposed, conditional | `Adam Clamp / @lifeloggerai` | Proposal only; human confirmation still required |
| Proposed deploy scope | proposed | `C) hosting + Firestore rules/indexes + functions` | Matches repo default deploy behavior |
| Proposed Firebase Functions scope | proposed | `yes` | Matches repo default release/test/deploy behavior |
| Proposed execution path | proposed | `GitHub Actions` | Dedicated manual workflow exists and preserves audit trail |
| Required variables/secrets exist | unknown | unknown | Required names are known; actual existence is not repo-visible |

## Confirmed Repo Evidence

- Canonical gate: `pnpm live:check`
- Repo default deploy path: `hosting + Firestore rules/indexes + functions`
- Post-deploy smoke command: `HOST=https://<live-host> pnpm smoke`
- Workflow supports gate-only and optional deploy
- Live ledger still says `not-yet-verified-live`
- Current visible workflow runs for recent commits are failing, so release remains blocked until the gate passes on the locked SHA

Primary evidence files:
- `release/LIVE_STATUS.md`
- `LIVE_RELEASE.md`
- `release/urai-spatial-live-manifest.json`
- `.github/workflows/live-release.yml`
- `firebase.json`
- `package.json`
- `.firebaserc.example`

## Remaining Blockers

1. Production Firebase project ID
2. Intended live URL/domain
3. Confirmation that required GitHub repo variables/secrets exist
4. Explicit owner confirmation that the visible candidate SHA should be locked
5. A passing non-deploying gate on the locked SHA

## Control Rule

Do not claim live verification unless gate, deploy, smoke, and ledger all reference one locked SHA.

## Current Decision

`NO-GO`
