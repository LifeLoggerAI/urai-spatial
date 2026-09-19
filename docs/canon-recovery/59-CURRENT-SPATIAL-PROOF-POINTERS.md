# URAI Current Spatial Proof Pointer Register

Status: CURRENT-HEAD POINTERS RETAINED / VERIFICATION RUNNERS QUEUED  
Recovery date: 2026-09-19

## Current authority snapshot

- Repository: `LifeLoggerAI/urai-spatial`
- Convergence PR: `#1237`
- Branch: `unified-spatial-convergence-20260916`
- Exact head: `b88d20438a7d03bf63dad7696e702bb516030496`
- PR state at recovery: OPEN / DRAFT / UNMERGED
- Base SHA at recovery: `2cf87f6d598ade500c8f1079ea80b6fb73325b3f`

This register binds stable canon/reference IDs to the **current exact-head proof workflow lineage**. It does not mark queued/pending workflows green and does not transfer predecessor-head pixel acceptance.

## Stable reference-to-proof pointers

| Stable authority ID | System | Exact-head proof pointer(s) | State at recovery | Acceptance boundary |
|---|---|---|---|---|
| `URAI-REF-HOME-001` | Home / FP Home | Home State Proof run `35466497463` (#2722); Reference Estate Exact-Head Capture `35466497464` (#2); Main Journey State Contract `35466497476` (#2445) | QUEUED | no current-head Home acceptance until retained proof completes and pixels are literally inspected |
| `URAI-ENV-GROUND-001` | Ground | Ground Gold Master Proof `35466497555` (#280); Launch Critical Asset Forge `35466497509` (#2766) | QUEUED | no Ground promotion until exact-head proof + retained-pixel inspection |
| `URAI-REF-LIFEMAP-001` | Life Map | Life Map Founder Visual Proof `35466497491` (#2301); Main Journey State Contract `35466497476` (#2445) | QUEUED | predecessor Life Map pixels do not transfer |
| `URAI-REF-FOCUS-001` | Focus | Focus Gold Master Proof `35466497467` (#604) | QUEUED | exact-head visual/proof completion required |
| `URAI-REF-REPLAY-001` | Replay | Replay Gold Master Proof `35466497513` (#157) | PENDING | exact-head visual/proof completion required |
| `URAI-REF-ORB-001` | Orb | Home State Proof `35466497463` (#2722); AAA Asset Governance `35466497479` (#2507); Reference Estate Exact-Head Capture `35466497464` (#2) | QUEUED | Orb remains head-bound; no state/material acceptance transfer |
| `URAI-REF-A11Y-001` | Accessibility variants | Accessibility Performance Evidence `35466497504` (#3495); Spatial Performance Budget `35466497503` (#3634) | QUEUED | real-device/assistive-tech evidence remains separate where required |

## Exact-head global gates

| Workflow | Run ID | Run number | Recovery state |
|---|---:|---:|---|
| URAI Spatial CI | `35466497514` | 11601 | QUEUED |
| URAI Production Verify | `35466497502` | 8290 | PENDING |
| Release Governance Guard | `35466497480` | 2729 | QUEUED |
| URAI Ecosystem Governance Verify | `35466497470` | 2370 | QUEUED |
| V1 Certified Runtime Handoff | `35466497492` | 2113 | QUEUED |
| Asset Pack Independent Ledger | `35466497496` | 5523 | QUEUED |
| Governed Asset Promotion | `35466497465` | 1146 | QUEUED |

## Governing rule

This is a pointer register, not a pass receipt.

If PR #1237 moves from `b88d20438a7d03bf63dad7696e702bb516030496`, every run above becomes predecessor-head evidence for certification purposes and the register must be refreshed before any release/visual-acceptance conclusion.
