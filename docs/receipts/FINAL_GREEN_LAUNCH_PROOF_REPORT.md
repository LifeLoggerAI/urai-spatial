# URAI AAA launch proof receipt

Generated: 2026-07-02T02:49:43.584Z
Repo: /home/adam/urai-spatial
Branch: main
Commit: 0d3ea697216e5293464da72e6b2df38b436293b8
Base URL: https://urai.app
Receipt: /home/adam/urai-final-receipts/aaa-launch-proof-0d3ea697-2026-07-02T02-48-19-747Z
Overall receipt status: GREEN

## Git state

Working tree has local changes:

```text
?? docs/AAA_FINAL_ASSET_AUDIT.md
?? docs/aaa-final-visual-contract-report.md
?? urai-tier1/public/assets/urai-aaa-full-pack/receipt-2026-07-01T03-04-52-007Z.md
```

## Command steps

| Step | Exit | Duration ms |
| --- | ---: | ---: |
| git-status | 0 | 86 |
| pnpm-install | 0 | 0 |
| pnpm-typecheck | 0 | 0 |
| pnpm-test-if-present | 0 | 0 |
| pnpm-build-static | 0 | 0 |
| firebase-deploy-static | 0 | 0 |

## Asset receipt

Result=GREEN; TOTAL_ASSETS=147; CORE_MISSING=0; EXPANSION_MISSING=0

## Route matrix summary

Routes checked: 18
Routes OK: 18
Routes needing review: 0
Fingerprint failures with HTTP 200: 0

All checked routes returned successful HTTP status and expected route fingerprints.

## Screenshots

Requested: yes
Captured: 24
No screenshot notes.

## Quest / WebXR proof state

XR preview may be live if `/spatial/ar-vr` is green. Physical Quest 2 proof is NOT complete from this script. Record actual Quest Browser proof separately.

## Foundation DNS state

Complete: no
GitHub Pages apex A records: no
HTTPS works: no

## Remaining honest gates

- Capture/review desktop and mobile screenshots if not already captured.
- Do not claim Quest 2 proof until actual Quest Browser testing is recorded.
- Do not claim `uraifoundation.org` DNS complete unless this receipt says DNS/HTTPS complete and manual browser verification agrees.
- Do not claim bespoke final art while core art remains placeholder-final.
- Do not claim production backend/provider automation until real auth/data/actions are wired and tested.
