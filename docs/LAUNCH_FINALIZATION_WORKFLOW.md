# Launch Finalization Workflow

Generated: 2026-07-07

## Purpose

Run the four final blockers as one closure pass:

1. Verification.
2. Deployment identity.
3. Route parity.
4. Final public clarity.

## Runtime

Run from:

```bash
cd ~/urai-spatial/urai-tier1
```

## Command

```bash
node scripts/write-launch-finalization-report.mjs
```

## What the report runs

The report writer runs:

- typecheck;
- build;
- route audit;
- tier1 verification;
- tier5 verification;
- live launch-truth route/claim-boundary verification.

## Output

The report writes a receipt folder under:

```text
docs/receipts/launch-finalization-<timestamp>/
```

The receipt contains:

- command logs;
- `launch-finalization-report.json`;
- `launch-finalization-report.md`;
- git HEAD;
- git status;
- all-green summary;
- remaining production gates.

## Claim boundary

A green report means source/build/route/public-clarity checks passed.

It does not by itself certify production.

Production certification still requires:

- exact deployed SHA;
- rollback SHA;
- immutable deployment receipt;
- post-deploy route parity;
- screenshots;
- Status updated from evidence.
