# URAI Ecosystem Inventory — 2026-07-04

This document records only evidence inspected through connected tools during the audit session.

## Canonical production candidate

| Repository | Disposition | Evidence status | Notes |
|---|---|---:|---|
| `LifeLoggerAI/urai-spatial` | Canonical public app candidate | PROVEN accessible | Public repo, default branch `main`, admin/maintain/push permissions available through connector. Runtime root candidate: `urai-tier1`. |
| `LifeLoggerAI/asset-factory` | Active supporting system | PROVEN accessible | Public repo, default branch `main`, admin/maintain/push permissions available. Owns asset manifests/forge workflows. |

## Accessible LifeLoggerAI repositories discovered

- `LifeLoggerAI/UrAi`
- `LifeLoggerAI/urai-marketing`
- `LifeLoggerAI/UrAi-Dev`
- `LifeLoggerAI/UrAiProd`
- `LifeLoggerAI/urai-analytics`
- `LifeLoggerAI/urai-labs-llc`
- `LifeLoggerAI/urai-investors`
- `LifeLoggerAI/urai-privacy`
- `LifeLoggerAI/urai-admin`
- `LifeLoggerAI/asset-factory`
- `LifeLoggerAI/urai-content`
- `LifeLoggerAI/urai-foundation`
- `LifeLoggerAI/urai-studio`
- `LifeLoggerAI/urai-staging`
- `LifeLoggerAI/urai-jobs`
- `LifeLoggerAI/urai-spatial`
- `LifeLoggerAI/urai-communications`
- `LifeLoggerAI/B2Bportal`
- `LifeLoggerAI/urai-storytime`

## Open PRs inspected

| Repo | PR | Status | Evidence status | Notes |
|---|---:|---|---:|---|
| `asset-factory` | #135 | Open, mergeable | PARTIAL | Provider cost controls; non-paid checks mostly green, one V1 avatar extension workflow failed. |
| `urai-spatial` | #399 | Open, mergeable | PARTIAL | Fixes fallback manifest paths; exact-head release gates include failures. |
| `urai-spatial` | #398 | Open | PARTIAL | Draft-like architecture PR for continuous world. Risky; do not merge without proof. |
| `urai-spatial` | #397 | Open | PARTIAL | Home living spatial world PR. Requires proof before promotion. |
| `urai-spatial` | #396 | Open | PARTIAL | Earlier fallback manifest path fix; likely superseded by #399 pending confirmation. |

## Google Drive material discovered

Search query `URAI` returned multiple accessible spreadsheets, primarily signal/metrics trackers and global discovery packs. These are useful context but not yet canonical deployment authority.

Examples discovered:

- `URAI Global Views + Spellings Search Addendum`
- `URAI Global Signal Numbers Pack — All Domain Assets`
- `URAI Global 19-Language Signal Discovery Register + Domain Addendum`
- `Adam Clamp — URAI Signal Metrics Tracker + OpenArt Studios`
- `Adam Clamp — URAI Signal Metrics Tracker + AI Uncovered`
- `Adam Clamp — URAI Signal Metrics Tracker + D82 Productions`
- `Adam Clamp — URAI Signal Metrics Tracker + PASSUS LI`
- `Adam Clamp — URAI Signal Metrics Tracker + The Opening`

## Unknowns requiring continued audit

- Exact deployed SHA for `https://urai.app`.
- Firebase hosting channel and deployment metadata for `urai-4dc1d`.
- Whether legacy repositories can overwrite canonical production.
- Whether Drive contains current release authority documents beyond signal spreadsheets.
- Branch protection status for canonical deploy paths.
