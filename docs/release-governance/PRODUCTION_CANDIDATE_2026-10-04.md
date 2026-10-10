# UrAi Production Gold-Master Candidate — 2026-10-04

Repository: LifeLoggerAI/urai-spatial
Canonical base before this release record: da94837c2457b0a7590e26a7a644cd728de8afb8
Prior production fingerprint observed on urai.app: 748e50398d85effeaa4ed17aaf78d4076dddbb45
Prior production state: stale predecessor release; visually inconsistent with the current Home authority.
Release intent: bind the current full-vision candidate to production only after exact-head CI, release-governance approval, governed WIF deployment, post-deploy smoke, and live visual verification.

This file is evidence metadata only. It does not weaken or bypass any release, privacy, accessibility, security, provenance, or independent-review gate.

Required production gate sequence:
1. Exact-head machine checks terminal green.
2. Release Governance Guard accepts an independent exact-head approval.
3. Merge this exact approved head to main.
4. Run .github/workflows/spatial-governed-wif-deploy.yml with the merged PR number, exact approved head SHA, a distinct proven rollback SHA, and DEPLOY_URAI_APP confirmation.
5. Require governed Functions + Hosting deployment success.
6. Require post-deploy live fingerprint and route certification.
7. Re-open urai.app and visually verify Home, Life Map, Focus, Replay, Passport, Privacy, Status, and Support.
8. If any deployment/certification step fails, preserve automatic rollback and mark NO-GO.
