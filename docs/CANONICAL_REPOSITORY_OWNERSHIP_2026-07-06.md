# URAI Repository Ownership and Release Authority

Date: 2026-07-06

Evidence boundary: this register defines source ownership and current release authority. It does not certify deployment. Production certification still requires an exact tested SHA, deployed SHA, rollback SHA, environment receipt, live route proof, monitoring evidence, and applicable provider/device receipts.

| System | Canonical repository | Runtime root | Branch | Role | Current state |
| --- | --- | --- | --- | --- | --- |
| Public spatial product | `LifeLoggerAI/urai-spatial` | `urai-tier1` | `main` | Canonical public URAI experience at `urai.app` | PARTIALLY IMPLEMENTED; live route drift exists |
| Studio | `LifeLoggerAI/urai-studio` | `apps/studio` | `main` | Creator/admin studio and orchestration UI | IMPLEMENTED BUT NOT DEPLOYED at PR #56 |
| Asset generation | `LifeLoggerAI/asset-factory` | `assetfactory-studio` plus workers | `main` | Asset contracts, proof renderers, and provider pipeline | PARTIALLY IMPLEMENTED; paid/provider generation gated |
| Jobs | `LifeLoggerAI/urai-jobs` | Firebase Functions and Cloud Run workers | `main` | Internal asynchronous execution fabric | IMPLEMENTED BUT NOT DEPLOYED at PR #75 |
| Privacy | `LifeLoggerAI/urai-privacy` | Next/Firebase privacy control plane | `main` | Consent, data rights, and privacy governance | PARTIALLY IMPLEMENTED; PR dependency stack open |
| Analytics | `LifeLoggerAI/urai-analytics` | TypeScript API/workers | `main` | Privacy-safe signal and B2B analytics | IMPLEMENTED BUT NOT DEPLOYED at PR #28/#29 |
| Content | `LifeLoggerAI/urai-content` | root package and `apps/web` | `main` | Canonical content schemas and publication runtime | Source hardening open; deployment blocked |
| Admin | `LifeLoggerAI/urai-admin` | `apps/urai-admin` | `main` | Protected operations console | Source present; live authorization proof blocked |
| Marketing | `LifeLoggerAI/urai-marketing` | static Vite/Firebase surface | `main` | Acquisition, waitlist, and trust surface | Public fallback exists; strict backend proof incomplete |
| Investors | `LifeLoggerAI/urai-investors` | Next/Firebase portal | `main` | Investor thesis and gated diligence | Remediation active; not investor-send-ready |
| B2B | `LifeLoggerAI/B2Bportal` | Vite/React/Firebase portal | `main` | Enterprise intake and partner cockpit | Source cohesive; external environment blocked |
| Storytime | `LifeLoggerAI/urai-storytime` | Next/Firebase app | `main` | Private narrative/story engine | External safety/deploy proof blocked |
| Foundation | `LifeLoggerAI/urai-foundation` | static publication source | `main` | Formation-stage standards and governance | Custom-domain evidence blocked |
| Communications | `LifeLoggerAI/urai-communications` | provider/Firebase application | `main` | Communications and delivery intelligence | PARTIALLY IMPLEMENTED; provider-active evidence gated |
| Corporate site | `LifeLoggerAI/urai-labs-llc` | repository public site | `main` | URAI Labs operating/corporate surface | Separate from product runtime and IP-holding authority |
| Legacy demo | `LifeLoggerAI/UrAi` | repository root app | `main` | Conservative V1 sample/reference application | REJECTED AS CANONICAL PUBLIC RUNTIME |
| Legacy development | `LifeLoggerAI/UrAi-Dev` | repository-specific | default branch | Development/reference only | REJECTED AS PRODUCTION AUTHORITY |
| Legacy production | `LifeLoggerAI/UrAiProd` | repository-specific | default branch | Rollback/migration reference only unless proven otherwise | REJECTED AS CANONICAL AUTHORITY |
| Staging | `LifeLoggerAI/urai-staging` | repository-specific | default branch | Staging/reference | Must not overwrite canonical production automatically |

## Spatial authority rules

- `LifeLoggerAI/urai-spatial/urai-tier1/main` is the only current public-product source authority.
- PR #442 on `release-authority-20260706` is the current manual exact-SHA release-authority candidate and now carries the consolidated release receipt and production-truth status.
- PR #433 remains the bounded route/static-source correction input until its non-conflicting changes are incorporated into the release-authority candidate or merged independently.
- PR #415 is a broad historical/audit candidate and must not be force-merged while non-mergeable or used as production authority without current-main reconciliation.
- Service repositories own their domain contracts and receipts; no service repository may independently declare the whole ecosystem live.
- Legacy repositories may provide migration or rollback evidence but may not auto-deploy over the canonical product.
- A repository is not production-live until its exact deployed SHA, rollback SHA, provider environment, smoke, monitoring, security, and recovery evidence are recorded.
- Intended IP-holding references use `URAI IP Holdings LLC` only where legally reviewed and factually supported; `URAI Labs LLC` remains the separate operating/corporate-facing entity.

## Current live truth

- `https://urai.app/privacy-controls/` serves Home threshold content instead of the dedicated Privacy Controls route.
- `https://urai.app/focus/` serves the intended Selected memory chamber.
- `https://urai.app/focus?memoryId=quiet-reset` serves a legacy URAI shell.
- `https://urai.app/status/` claims Launch/live route state without tested, deployed, and rollback SHA evidence.

These defects are deployment-parity failures, not permission to weaken route checks or rewrite status claims as complete.
