# URAI Current Spatial Proof Pointer Register

Status: EXACT-HEAD SNAPSHOT RETAINED / VERIFICATION RUNNERS QUEUED OR PENDING  
Recovery date: 2026-09-19

## Current authority snapshot

- Repository: `LifeLoggerAI/urai-spatial`
- Convergence PR: `#1237`
- Branch: `unified-spatial-convergence-20260916`
- Exact head at snapshot: `003e3a188110f48569ee54114282d89e4b47a713`
- PR state at snapshot: OPEN / DRAFT / UNMERGED
- Base SHA at snapshot: `2cf87f6d598ade500c8f1079ea80b6fb73325b3f`

This register binds stable canon/reference IDs to one **exact-head proof workflow snapshot**. It does not mark queued/pending workflows green and does not transfer predecessor-head pixel acceptance. Because #1237 is actively moving, re-fetch the PR head before any release, review, merge, deployment, or visual-acceptance conclusion.

## Stable reference-to-proof pointers

| Stable authority ID | System | Exact-head proof pointer(s) | State at snapshot | Acceptance boundary |
|---|---|---|---|---|
| `URAI-REF-HOME-001` | Home / FP Home | Home State Proof run `35470594408` (#2723); Reference Estate Exact-Head Capture run `35470594478` (#9); Main Journey State Contract run `35470594343` (#2446) | QUEUED / PENDING / QUEUED | no exact-head Home acceptance until retained proof completes and pixels are literally inspected |
| `URAI-ENV-GROUND-001` | Ground | Ground Gold Master Proof run `35470594397` (#281); Launch Critical Asset Forge run `35470594300` (#2768) | QUEUED / QUEUED | no Ground promotion until exact-head proof + retained-pixel inspection |
| `URAI-REF-LIFEMAP-001` | Life Map | Life Map Founder Visual Proof run `35470594331` (#2302); Main Journey State Contract run `35470594343` (#2446) | QUEUED / QUEUED | predecessor Life Map pixels do not transfer |
| `URAI-REF-FOCUS-001` | Focus | Focus Gold Master Proof run `35470594322` (#605) | QUEUED | exact-head visual/proof completion required |
| `URAI-REF-REPLAY-001` | Replay | Replay Gold Master Proof run `35470594311` (#158) | QUEUED | exact-head visual/proof completion required |
| `URAI-REF-ORB-001` | Orb | Home State Proof run `35470594408` (#2723); AAA Asset Governance run `35470594434` (#2508); Reference Estate Exact-Head Capture run `35470594478` (#9) | QUEUED / QUEUED / PENDING | Orb remains head-bound; no state/material acceptance transfer |
| `URAI-REF-A11Y-001` | Accessibility variants | Accessibility Performance Evidence run `35470594445` (#3496); Spatial Performance Budget run `35470594385` (#3635) | QUEUED / QUEUED | real-device/assistive-tech evidence remains separate where required |

## Exact-head global gates

| Workflow | Run ID | Run number | Snapshot state |
|---|---:|---:|---|
| URAI Spatial CI | `35470594418` | 11616 | QUEUED |
| URAI Production Verify | `35470594421` | 8305 | PENDING |
| Release Governance Guard | `35470594388` | 2730 | QUEUED |
| URAI Ecosystem Governance Verify | `35470594277` | 2371 | QUEUED |
| V1 Certified Runtime Handoff | `35470594347` | 2114 | QUEUED |
| Asset Pack Independent Ledger | `35470594319` | 5524 | QUEUED |
| Governed Asset Promotion | `35470594391` | 1147 | QUEUED |
| Patch Check | `35470594417` | 10051 | QUEUED |

## Governing rule

This is a pointer register, not a pass receipt.

If PR #1237 moves from `003e3a188110f48569ee54114282d89e4b47a713`, every run above becomes predecessor-head evidence for certification purposes. Refresh this snapshot before using it for any current-head conclusion. Do not churn this file merely to follow intermediate pixel iterations unless a current authority decision depends on the pointer; the live PR/workflow APIs remain controlling.
