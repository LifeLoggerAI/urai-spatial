# URAI Completion Receipts

This directory indexes material evidence for `docs/system/URAI_COMPLETION_LEDGER.md`.

Do not create empty or prospective receipts. A receipt must contain real evidence and must not imply a live release when only source or test evidence exists.

## Required fields

Every receipt must record:

- receipt ID and honest status;
- UTC date and time;
- repository, branch, and full commit SHA;
- pull request or issue;
- changed files;
- workflow name, run ID, and conclusion;
- exact test commands and results;
- build result;
- deployment target and environment;
- deployed SHA and public URL when applicable;
- runtime checks;
- screenshots or workflow artifacts when available;
- provider receipt when applicable;
- asset counts and checksums when applicable;
- rollback SHA and command;
- remaining caveats.

## Status boundaries

**VERIFIED IN REPOSITORY** means source, tests, or documentation are tied to a commit, but production is not proved.

**IMPLEMENTED BUT NOT DEPLOYED** means a branch or pull request contains the change, but merge or live deployment remains outstanding.

**VERIFIED LIVE** requires the exact source commit, required checks, approved deployment workflow, approved target, deployed SHA, external runtime verification, monitoring path, rollback evidence, and any applicable provider or device proof.

**BLOCKED** must name the exact external credential, payment, device, legal decision, destructive approval, or unavailable permission.

Use the ledger ID as the receipt filename, such as `DEPLOY-004.md` or `ASSET-002.md`.
