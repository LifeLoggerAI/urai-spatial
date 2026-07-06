# URAI Ecosystem Receipt Index

Date: 2026-07-06

## REC-COMMS-20260706-01

- Repository: `LifeLoggerAI/urai-communications`
- Branch: `audit/delivery-callback-hardening-20260706`
- Head SHA: `a9a1a254292db1919582db56a81a7a5c3829967a`
- Pull request: #27
- Changed files: callback normalizer/tests and full communications audit
- Result: fail-closed callback status/provider handling, recursive callback payload redaction, deterministic event-ID helper and regression tests implemented
- Workflow runs: CI `28772012252`; Production Verify `28772012234`
- Current validation: queued; not certified
- Deployment: none
- Rollback SHA: not applicable
- Caveat: provider-native callback authentication remains issue #23

## REC-SPATIAL-20260706-01

- Repository: `LifeLoggerAI/urai-spatial`
- Branch: `fix/release-truth-receipt-20260706`
- Commit: `05e3d262c60d030ec7395a8ca55e043813f132b4`
- Pull request: #417
- Changed file: `urai-tier1/src/app/status/page.tsx`
- Result: Status receipt rendering now tolerates missing/partial receipt fields and falls back safely
- Workflow: exact-head runs triggered by the commit; conclusions pending
- Deployment: none
- Caveat: public `/status` remains on the older hardcoded route matrix until merge/deploy

## REC-SPATIAL-20260706-02

- Repository: `LifeLoggerAI/urai-spatial`
- Source SHA inspected: `4e1606c9ab7cde42b942f62e1d65148df8fadceb`
- Source evidence:
  - `firebase.static.json` has no catch-all rewrite
  - `.github/workflows/spatial-live-deploy.yml` uses service-account credentials and does not export `FIREBASE_TOKEN`
  - dedicated Privacy Controls source exists
- Live evidence:
  - `/`, `/home`, `/ground`, `/life-map`, `/focus`, `/replay`, `/mirror`, `/passport`, `/status` returned distinct product content
  - `/privacy-controls/` returned the Home threshold instead of the dedicated privacy source
- Result: two historical blockers are obsolete in source; one deployment drift blocker is confirmed live
- Deployment/rollback SHA: unknown

## REC-LEDGER-20260706-01

- Repository: `LifeLoggerAI/urai-spatial`
- Branch: `ops/ecosystem-completion-ledger-20260706`
- Commits:
  - `6e7ff66af65cf9ae23e5eaa4f92dfcdb966ebeae` — ecosystem authority and version map
  - `4a7aa8592bcad9cdecbf2a4662a546ee1682add6` — canonical completion ledger
- Changed files:
  - `docs/operations/ECOSYSTEM_AUTHORITY_2026-07-06.md`
  - `docs/operations/ECOSYSTEM_COMPLETION_LEDGER_2026-07-06.md`
  - this receipt index
- Result: accessible repositories, canonical ownership, V1–V5/V50/V100/V150/V200 status, P0/P1 dependencies, validation methods, blockers and receipt locations are now centralized
- Deployment: none
- Caveat: exact cloud environment inventory remains blocked where connector evidence is unavailable

## Open production issues created in communications

- #23 provider-native callbacks and replay protection
- #24 paid-send caps, allowlists, rate limits and kill switches
- #25 canonical Firebase environments and exact-SHA deployment evidence
- #26 FCM Admin SDK/HTTP v1 migration or push removal

## Receipt rule

No item may move to `VERIFIED LIVE` without all applicable fields:

- exact tested SHA
- exact deployed SHA
- rollback SHA
- workflow run and artifact
- commands and results
- environment/project
- public URL/runtime check
- provider or asset receipt when applicable
- remaining caveats
