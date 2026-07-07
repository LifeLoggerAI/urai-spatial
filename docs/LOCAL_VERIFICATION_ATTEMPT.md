# Local Verification Attempt

## Purpose

Attempt to independently pull the public repo and run local verification commands outside GitHub Actions.

## Result

The execution environment could not resolve `github.com`, so the repo could not be cloned locally from this runtime.

## Classification

Local verification from this environment is blocked by network/DNS access, not by source evidence.

## Source-side follow-up completed

Runtime typecheck coverage was tightened so launch components and data are explicitly included in `urai-tier1/tsconfig.runtime.json`.

## Required remaining receipts

- GitHub Actions workflow run id
- typecheck pass/fail
- build pass/fail
- route smoke artifact
- deployed screenshots
