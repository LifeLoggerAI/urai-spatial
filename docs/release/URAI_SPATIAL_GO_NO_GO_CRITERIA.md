# URAI Spatial Go / No-Go Criteria

## Locked Decision Posture

- `LifeLoggerAI/urai-spatial` is a credible release candidate.
- It is not live-verified.
- Current decision: `NO-GO`.
- Do not mark the repo live, deployed, production-ready, or production-verified yet.

## GO Requirements

`GO` only when all are true:
- one exact release candidate SHA is locked
- `pnpm live:check` passes on that exact SHA
- Firebase deploy completes from that exact SHA
- live smoke passes against the public URL from that exact SHA
- `release/LIVE_STATUS.md` records that same SHA, Firebase project, live URL, deploy method, gate result, smoke result, verifier, and timestamp
- at least one preserved artifact exists for the passing release gate
- at least one preserved artifact exists for the passing live smoke run
- no live-verification claim relies on verbal confirmation alone
- no committed secrets are found
- public copy does not overclaim AR/WebXR/wearables/biometrics/memory grounding

## Automatic NO-GO Triggers

Any of the following is an automatic `NO-GO`:
- release candidate SHA is not locked
- gate, deploy, smoke, and ledger do not reference the same SHA
- `pnpm live:check` did not pass
- deploy did not complete on approved target
- live smoke did not pass on approved URL
- release gate artifact is missing
- live smoke artifact is missing
- `release/LIVE_STATUS.md` does not match evidence
- a committed secret is found
- provider claims exceed validated fallback/demo posture
- required human confirmations are missing

## Human Confirmation Required Before Live Attempt

- production Firebase project ID
- intended live domain / URL
- release owner
- rollback owner
- whether Firebase Functions are in scope for first live publish
- deploy scope: hosting only vs hosting + Firestore rules/indexes + functions
- release candidate SHA

Additional uncertainty:
- exact rollback mechanism: evidence not found
- artifact storage location: human confirmation required
- whether deploy should occur via GitHub Actions or workstation: human confirmation required

## Control Rule

No valid live-verification claim exists unless release gate, deploy, smoke, and ledger evidence all reference the same locked SHA.

## Current Decision

`NO-GO`
