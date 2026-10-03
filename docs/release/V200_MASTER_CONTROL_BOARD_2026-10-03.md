# URAI V200 Master Control Board — 2026-10-03

This ledger is an execution-control snapshot, not independent certification. A green status requires exact evidence appropriate to the requirement.

| ID | Requirement | Authority | Exact SHA / Evidence | Status | Remaining gate |
|---|---|---|---|---|---|
| V200-001 | Spatial terminal CI / contract convergence | urai-spatial PR #1550 | `6c7fec34b87c1583cf87ce750d6ac8e133e30489` | 🟡 GREEN-CANDIDATE | Fresh exact-head CI completion |
| V200-002 | Independent release review | urai-spatial issue #564 | PR #1550 | 🔴 BLOCKED | Trusted independent reviewer approval/signature |
| V200-003 | Privacy Next.js security remediation | urai-privacy PR #140 | `ae8ab1715e3ba19a1ba11751b2f9a159e73b5dca` | 🟡 GREEN-CANDIDATE | Exact-head CI pending; malformed superstatic integrity is repaired, while npm audit still reports upstream Firebase/gRPC advisories requiring non-trivial dependency resolution |
| V200-004 | Atomic consent revocation before dispatch | urai-jobs PR #133 | `1f36a0ca87b4ce02a3854af7b56d0b2490f668b4` | 🟡 GREEN-CANDIDATE | CI + emulator + staging/live zero-call receipt |
| V200-005 | Life Model causal pipeline | urai-spatial PR #1543 | candidate branch | 🟠 IN PROGRESS | Merge/integration/release proof |
| V200-006 | Adam Presence production runtime | urai-spatial PR #1534 | candidate branch | 🟠 IN PROGRESS | provider/device/runtime/consent evidence |
| V200-007 | Life Movie end-to-end accepted master | urai-studio issue #130 | external production evidence | 🔴 BLOCKED | accepted full end-to-end film + receipts |
| V200-008 | Asset Factory provider certification | asset-factory issue #63 | main provider wave evidence | 🔴 BLOCKED | provider/runtime/receipt gates |
| V200-009 | Storytime reproducible CI | storytime issue #15 | main | 🔴 BLOCKED | lockfiles + exact-head CI receipt |
| V200-010 | Storytime auth/rules certification | storytime issue #16 | main | 🔴 BLOCKED | emulator authorization matrix |
| V200-011 | Storytime consent/audience enforcement | storytime issue #17 | main | 🔴 BLOCKED | trusted server enforcement + review |
| V200-012 | Storytime provider/job safety | storytime issue #18 | main | 🔴 BLOCKED | durable job, cost, moderation, retry/cancel proof |
| V200-013 | Storytime public-share lifecycle | storytime issue #19 | main | 🔴 BLOCKED | server-enforced expiration/revocation proof |
| V200-014 | Storytime export/deletion/retention | storytime issue #20 | main | 🔴 BLOCKED | implementation + staging evidence |
| V200-015 | Storytime isolated Firebase environments | storytime issue #21 | main | 🔴 BLOCKED | owner/provider provisioning |
| V200-016 | Historical credential remediation | UrAiProd issue #91 | historical evidence | 🔴 BLOCKED | credential rotation/revocation proof |
| V200-017 | Labs provider credential exposure | urai-labs-llc issue #28 | historical evidence | 🔴 BLOCKED | provider-side revocation evidence |
| V200-018 | Labs billing/project health | urai-labs-llc issue #48 | external system | 🔴 BLOCKED | owner/provider billing action |
| V200-019 | Investor custom-domain/inbound readiness | urai-investors issue #31 | current source/runtime | 🟠 IN PROGRESS | domain + inbound canary |
| V200-020 | Google Play release | Play evidence | package `com.urailabs.urai` | 🔴 BLOCKED | Google-side release/account actions |
| V200-021 | Device/XR/Quest certification | cross-system | CI/static only | 🔴 BLOCKED | physical device certification |
| V200-022 | Global privacy/data-rights matrix | cross-system | repository evidence | 🟠 IN PROGRESS | full regional proof |
| V200-023 | Production deploy + rollback | cross-system | no production mutation authorized | 🔴 BLOCKED | authorized production deployment + rollback receipt |
| V200-024 | Independent V200 certification | cross-system | no independent approval | 🔴 BLOCKED | independent reviewer |
| V200-025 | Full V200 global launch | cross-system | dependent on above | 🔴 BLOCKED | all launch-critical gates |

## Current exact candidate heads

- Spatial PR #1550: `6c7fec34b87c1583cf87ce750d6ac8e133e30489`
- Privacy PR #140: `ae8ab1715e3ba19a1ba11751b2f9a159e73b5dca`
- Jobs PR #133: `1f36a0ca87b4ce02a3854af7b56d0b2490f668b4`

## Non-transfer rule

Evidence from a predecessor SHA, closed PR, old deployment, or candidate branch does not transfer to a newer exact SHA unless the current exact-head verification proves it again.

## Independent-review boundary

This document intentionally does not claim independent certification, production deployment, provider activation, physical-device proof, legal approval, or final launch readiness.


## Newly reconciled open P0 inventory

The current organization-wide GitHub search also exposes open P0 work outside the original 25-row snapshot: UrAiProd #91 (tracked environment artifacts / credential rotation), urai-foundation #12 (private security/sensitive-reporting channel), urai-admin #10 and #4 (admin launch/deployment), urai-labs-llc #2 (company website/deploy/claims), and urai-marketing #4 (public launch site/waitlist/SEO/deploy readiness). These remain open unless exact current-head evidence proves closure. No predecessor evidence is transferred.

Additional Spatial security/runtime gates remain open, including #1081 (legacy Firebase key revocation), #1111 (canonical production deploy via OIDC/WIF), #1101 (legacy-key revocation blocked on executable Google session), #1079/#1084/#1078 (identity/credential topology audits), and #1124 (Orb conversational/voice completion). These require exact current-state verification and, where applicable, owner/provider/device actions.
