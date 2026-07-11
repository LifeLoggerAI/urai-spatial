# Receipt: URAI-WSD-20260711-LAUNCH-PACKAGE-001

## Identity

- Repository: `LifeLoggerAI/urai-spatial`
- Canonical main: `60730edcb5bcedfe2ded2cee9a96cef96dff9510`
- Evidence date: 2026-07-11
- Distribution: INTERNAL REVIEW ONLY
- Decision: NO-GO
- Package Markdown blob: `97319ea23cf83904a1ef7aa62cde2ddc6dfccbea`
- Package JSON blob: `7468eb3be37f300ae82b829462303e3149a3eaca`
- Machine-readable schema: 11

## Current authorities

- Documentation chain: #546 `a2b4f26ff927da2666ad9ece70984855be3f5e1e` → #547 `277347c517290c9dee9d660b1877fdb817b7024b` → #548 `f3588054e37c3a5d639af8e04855bc3aa332e7a4` → #558 `ad31eeff849fb0764cb3623a3d6d0cf77e7dce14`.
- Consolidated Phase 2 authority: #539 `6dff0fec84c1b146dad1bcb53e65a2ed0ef6aa52`; 102 ahead / 0 behind main; 33 files; receipt `URAI-WSB-20260711-PHASE2-CONSOLIDATION-012` blob `312f0f50791a8e5cebe18868fe9c03fb480c706e`.
- Analytics: #553 `910532016136c3919e420be7d3809300f44c9802`.
- Privacy preview: #554 `972616b92536108818ca0965e543bae2ae322c6c`.
- Guided demo: #555 `212126a90920c5601f858175556ae319bc349ae8`.
- Discoverability: #557 `3d6354fa44d784334645c86151b158edd1f1c4d6`.
- Founder event: #521 `a440707f598d56735e21e80cb33c17eb141f740a`.

## CI execution and repair receipt

Runner assignment resumed and produced real results on stale #539 heads.

On `7fc065c4...`, XR Static Gate Diagnostics and Spatial Missing Resource Diagnostics passed; Release Security Path Guard failed because the production-authority audit still required release-control smoke schema `2` instead of schema `5`.

On `53eb1c7e...`, the same diagnostics passed and the security gate failed again because passive references to `live-release.mjs` were classified as production execution.

The authority audit now reports schema `urai-production-authority-audit-6`, detects actual mutation execution, requires exactly one mutation script/workflow, preserves the build/attestation/credential/fingerprint/rollback/proof boundaries, and emits explicit GitHub annotations. Security-workflow checkout progress is suppressed only to make diagnostics readable.

All conclusions from earlier heads are stale. Nineteen fresh runs are registered on current #539 head `6dff0fec...`; queued registration is not passing evidence.

## Support and public evidence

GitHub Support ticket #4553961 has operational evidence updates but no human resolution.

Accepted public evidence remains zero for launch-complete routes, screenshots, demos, QR codes, locales, devices, active provider claims and public support channels.

Tested, deployed and rollback SHAs and a production target receipt are not established.

## Final result

Public release remains NO-GO until every required workflow passes on one unchanged exact head with retained evidence, independent reviewers approve the scope, the exact tested SHA is merged without drift, and protected deployment/rollback/custom-domain/media/support receipts are recorded.
