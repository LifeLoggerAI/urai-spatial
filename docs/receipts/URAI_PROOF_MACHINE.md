# URAI Proof Machine

This is the repeatable V1/V2/V3 proof loop.

## What landed

- `urai-tier1/src/app/urai-proof-machine.css` locks Life Map and Location Map to one cinematic viewport so full-page screenshots stop exposing blank tails.
- `scripts/urai-proof-loop.mjs` runs the local proof loop: browser install, typecheck, static build, optional deploy, live screenshot proof, PNG count check, and ZIP packaging.

## Fast local proof loop

```bash
node scripts/urai-proof-loop.mjs --label=v1-loop-5 --base=https://urai.app --skip-browser-install --skip-typecheck --skip-build
```

## Full deploy/proof loop

```bash
node scripts/urai-proof-loop.mjs --label=v1-loop-5 --base=https://urai.app --deploy --archive-to-repo
```

Expected green lines:

```text
PROOF_EXIT=0
PNG_COUNT=24
STATUS=GREEN
```

## Human visual verdict order

1. Life Map and Location Map blank-tail check.
2. Ground world realism.
3. Replay cinematic memory film.
4. Focus chamber depth.
5. Mobile crop pass.
6. Final V1 receipt.

## Honest gates

- Route proof green does not equal visual AAA+++.
- Screenshot proof green does not equal Quest proof.
- Quest proof stays manual until actual Quest Browser evidence is captured.
