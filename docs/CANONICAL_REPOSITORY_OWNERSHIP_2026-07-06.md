# URAI Repository Ownership Mirror

Date: 2026-07-06

Evidence boundary: this human-readable table supports route/source review only. The machine-readable ownership, completion-ledger, release-receipt, and deployment authority remains PR #415. Nothing in this file authorizes deployment or certifies production.

| System | Canonical repository | Runtime root | Branch | Role | Current state |
| --- | --- | --- | --- | --- | --- |
| Public spatial product | `LifeLoggerAI/urai-spatial` | `urai-tier1` | `main` | Canonical public URAI experience at `urai.app` | PARTIALLY IMPLEMENTED; live drift exists |
| Studio | `LifeLoggerAI/urai-studio` | `apps/studio` | `main` | Creator/admin studio and orchestration UI | IMPLEMENTED BUT NOT DEPLOYED at current hardening head |
| Asset generation | `LifeLoggerAI/asset-factory` | `assetfactory-studio` plus workers | `main` | Asset contracts, proof renderers and provider pipeline | PARTIALLY IMPLEMENTED; provider-active generation gated |
| Jobs | `LifeLoggerAI/urai-jobs` | Firebase Functions and Cloud Run workers | `main` | Internal asynchronous execution fabric | IMPLEMENTED BUT NOT DEPLOYED at PR #75 |
| Privacy | `LifeLoggerAI/urai-privacy` | Next/Firebase privacy control plane | `main` | Consent, data rights and privacy governance | PARTIALLY IMPLEMENTED; PR dependency stack open |
| Analytics | `LifeLoggerAI/urai-analytics` | TypeScript API/workers | `main` | Privacy-safe signal and B2B analytics | IMPLEMENTED BUT NOT DEPLOYED at PR #28 |
| Content | `LifeLoggerAI/urai-content` | root package and `apps/web` | `main` | Canonical content schemas and publication runtime | Source lock merged; deployment blocked |
| Admin | `LifeLoggerAI/urai-admin` | `apps/urai-admin` | `main` | Protected operations console | Source present; live authorization proof blocked |
| Marketing | `LifeLoggerAI/urai-marketing` | static Vite/Firebase surface | `main` | Acquisition, waitlist and trust surface | Public no-domain surface; strict lock incomplete |
| Investors | `LifeLoggerAI/urai-investors` | Next/Firebase portal | `main` | Investor thesis and gated diligence | Remediation active; not investor-send-ready |
| B2B | `LifeLoggerAI/B2Bportal` | Vite/React/Firebase portal | `main` | Enterprise intake and partner cockpit | Source cohesive; external environment blocked |
| Storytime | `LifeLoggerAI/urai-storytime` | Next/Firebase app | `main` | Private narrative/story engine | Current Next runtime; external safety/deploy blocked |
| Foundation | `LifeLoggerAI/urai-foundation` | static publication source | `main` | Formation-stage standards and governance | PR #11 open; custom-domain evidence blocked |
| Communications | `LifeLoggerAI/urai-communications` | provider/Firebase application | `main` | Communications and delivery intelligence | PARTIALLY IMPLEMENTED; provider-active evidence gated |
| Corporate site | `LifeLoggerAI/urai-labs-llc` | To be confirmed | `main` | URAI Labs public/corporate surface | Separate from product runtime |
| Legacy demo | `LifeLoggerAI/UrAi` | repository root app | `main` | Conservative V1 sample memory demo | REJECTED AS CANONICAL PUBLIC RUNTIME |
| Legacy development | `LifeLoggerAI/UrAi-Dev` | To be inventoried | default branch | Development/reference only | REJECTED AS PRODUCTION AUTHORITY |
| Legacy production | `LifeLoggerAI/UrAiProd` | To be inventoried | default branch | Rollback/migration reference only unless evidence says otherwise | REJECTED AS CANONICAL AUTHORITY |
| Staging | `LifeLoggerAI/urai-staging` | To be inventoried | default branch | Staging/reference | Must not overwrite canonical production automatically |

## Authority rules

- `urai-spatial/urai-tier1/main` is the only current public-product authority.
- PR #415 owns the canonical machine ledger, release receipt, Status evidence, and deployment boundary.
- PR #431 owns live content/slash/query/SHA certification.
- PR #433 owns bounded public route and static-source corrections only.
- Service repositories own their domain contracts and production receipts; they do not independently declare the whole ecosystem live.
- Legacy repositories may provide migration or rollback evidence but may not auto-deploy over the canonical product.
- A repository is not production-live until its exact deployed SHA, rollback SHA, provider environment, smoke, monitoring and security evidence are recorded.
- Intended IP-holding references must use `URAI IP Holdings LLC` only where legally reviewed and factually supported.
