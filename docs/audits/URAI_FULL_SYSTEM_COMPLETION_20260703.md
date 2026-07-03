# URAI Full-System Completion Audit — 2026-07-03

## Verdict

**Not production certified.**

The canonical public runtime is `LifeLoggerAI/urai-spatial/urai-tier1`. The highest-severity automatic overwrite path was removed from legacy `UrAi` by PR #352. Certification remains blocked because the latest spatial workflow set is queued and no current deployment receipt, recovery record, or passing post-deployment custom-domain artifact is attached.

## Complete

- Canonical runtime and deployment authority recorded.
- `UrAi` automatic push-to-production trigger removed.
- Custom-domain smoke hardening merged.
- Proof receipt success filtering and deduplication merged.
- Frozen-lockfile verification merged.
- Asset Factory paid-run and promotion safety merged.
- V2 visible runtime wiring merged.
- Explorable XR entry and session/control hardening merged at source level.
- `/status` source distinguishes implementation from production certification.
- Machine inventory and central authority documents created.

## Partially complete

- Core spatial routes are implemented, but current-head build, browser, accessibility, visual, deployment, and custom-domain evidence is incomplete.
- V2 assets and visible-owner wiring are merged, but current deployment visual proof is pending.
- XR code checks exist, but changed behavior requires a physical Quest retest.
- Supporting systems contain substantial code and validation, but production/provider/security evidence is uneven.

## Blocked

- Current spatial workflow conclusions were queued at last inspection.
- Exact currently deployed commit is not proven by a current receipt.
- Production workflow dispatch is not exposed by the connected GitHub action tool.
- `UrAi-Dev` still contains historical production mappings; configuration writes were blocked and PR #5 records the repository as legacy.
- The approved Jobs callback origin is not directly proven.
- Paid provider proof requires authorization and funded accounts.
- Physical Quest proof requires hardware.
- Standalone DNS changes require domain-owner access.
- Professional and signed approvals remain external.

## Repository matrix

| Repository | Classification | Verified state | Remaining blocker |
| --- | --- | --- | --- |
| `urai-spatial` | Canonical runtime | Authority and hardening merged | Current-head gates, deployment, recovery, custom-domain evidence |
| `UrAi` | Legacy runtime/reference | Automatic deployment removed | Stale legacy PRs and documents |
| `UrAi-Dev` | Legacy development | Legacy classification PR #5 open | Remove historical production mappings |
| `UrAiProd` | Legacy operations/reference | Stack and metadata inspected | Authority notice and deployment review |
| `asset-factory` | Active asset pipeline | Safety PR #117 merged | Callback origin and live provider evidence |
| `urai-studio` | Supporting studio | Validation scripts present | Current CI, functions, deployment, and recovery proof |
| `urai-jobs` | Queue/workers | Operational scripts present | PR #61/#62 and authenticated production proof |
| `urai-admin` | Admin/operations | Security and recovery scripts present | Live authorization evidence |
| `urai-analytics` | Analytics | Release scripts present | PR #17 and privacy-safe production proof |
| `urai-privacy` | Staging privacy product | Privacy gates present | Authenticated export/delete/retention proof |
| `urai-content` | Content system | Truthful deployment block | Provider, E2E, observability, recovery proof |
| `urai-marketing` | Marketing-only | Separate project scripts | Provider/functions and canonical-link proof |
| `urai-storytime` | Standalone product | Foundation work present | Provider, billing, DNS, legal, safety proof |
| `urai-investors` | Private investor surface | Metadata verified | Private access and stale-claim audit |
| `B2Bportal` | Private business portal | Metadata verified | Access and deployment audit |
| `urai-labs-llc` | Corporate site | QA scripts present | IP wording and current deployment proof |
| `urai-foundation` | Formation standards site | Truthful static scope | DNS and HTTPS cutover proof |
| `urai-communications` | Pilot product | Build/preflight scripts present | Actions, webhook, and delivery proof |
| `urai-staging` | Staging/integration | Metadata verified | Environment isolation proof |

## Public route evidence boundary

| Route | Owner | State |
| --- | --- | --- |
| `/`, `/home` | `urai-spatial/urai-tier1` | Source implemented; current deployment bundle pending |
| `/ground` | `urai-spatial/urai-tier1` | Source implemented; interaction/mobile proof pending |
| `/life-map` | `urai-spatial/urai-tier1` | Source implemented; browser/performance proof pending |
| `/focus?memoryId=quiet-reset` | `urai-spatial/urai-tier1` | Query-aware source repaired; post-deploy proof pending |
| `/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread` | `urai-spatial/urai-tier1` | Query-aware source present; post-deploy proof pending |
| `/mirror`, `/passport` | `urai-spatial/urai-tier1` | Source implemented; slash parity workflow must pass |
| `/status` | `urai-spatial/urai-tier1` | Source truthfully says certification pending |
| `/spatial/ar-vr` | `urai-spatial/urai-tier1` | XR preview; physical proof pending |

## Security and provider state

No secrets were exposed. No paid request, billing change, DNS change, production deployment, or irreversible data action was performed. Provider presence is not treated as live proof. Callback origin, cross-tenant denial, authorization, monitoring, and recovery evidence remain system-specific blockers.

## Canon reconciliation

Historical Drive materials that name `UrAi` as runtime authority or contain earlier deployment instructions are superseded for runtime and deployment decisions. They remain historical records and should link to `docs/system/CANON_INDEX.md`.

## Production decision

No production deployment was executed because mandatory workflow conclusions, the exact deployed commit, a recovery target, and post-deployment evidence were not all available.
