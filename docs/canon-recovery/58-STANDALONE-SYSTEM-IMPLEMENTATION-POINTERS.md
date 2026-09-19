# URAI Standalone System Implementation Pointer Register

Status: SOURCE-POINTER SNAPSHOT COMPLETE / RELEASE CERTIFICATION SEPARATE  
Date: 2026-09-19

## Scope and truth boundary

This register closes the canon-recovery requirement to retain exact, inspectable source pointers for the active standalone URAI systems.

The SHA recorded here is the **exact `main` Git tree SHA returned by GitHub at recovery time**, not a claim that `main` is the newest open PR candidate, deployed production, visually accepted, independently reviewed, or release-certified.

Moving candidate PR heads, provider state, deployment state and live endpoints must be re-fetched separately before release decisions.

## Active standalone systems

| Repository | Main tree SHA snapshot | Current role | Representative implementation/source pointers | Representative verification/release pointers |
|---|---|---|---|---|
| `urai-admin` | `f0dabca401dff4df22a68a92b5b10e996b99c748` | operator/admin control plane | `app/api/admin/system-freeze/route.ts`; `app/api/admin/view-ledger/route.ts`; `app/api/federation/*`; `functions/src/index.ts` | `.github/workflows/ci.yml`; `.github/workflows/urai-production-verify.yml`; `.github/workflows/validate-admin.yml` |
| `urai-analytics` | `c183f742bbefaab3986e46d6c53e7c95b9c4fea7` | aggregate analytics/observability | `src/api/index.ts`; `src/frontend/viewModels/index.ts`; `src/privacy/index.ts`; `src/spatial/index.ts` | `.github/workflows/ci.yml`; `.github/workflows/production-lock.yml`; `.github/workflows/source-self-certify.yml` |
| `urai-content` | `4b38589be76dff88e310fc11b9bba5ce8b793d19` | versioned content/localization/creator intake | `apps/web/src/app/api/content/[[...slug]]/route.ts`; `apps/web/src/app/api/catalog/route.ts`; `apps/web/src/app/api/creator/submissions/*`; `src/index.ts` | `.github/workflows/ci.yml`; `.github/workflows/governance.yml`; `.github/workflows/release-evidence.yml`; `.github/workflows/urai-production-verify.yml` |
| `asset-factory` | `1ecff7c8f1b471bbc8acd38f655705af4ff0a78f` | asset generation/validation/provenance | `assetfactory-studio/app/api/generate/route.ts`; `assetfactory-studio/app/api/jobs/[jobId]/{approve,materialize,publish}/route.ts`; `assetfactory-studio/app/api/worker/asset-queue/route.ts`; `spatial-renderer-v1/src/index.ts` | `.github/workflows/ci.yml`; `.github/workflows/urai-production-verify.yml`; provider/model-forge workflows remain separately gated |
| `urai-studio` | `cae4ddc6fd2c3ec64664ed628f74434a93b4497c` | creative/media orchestration | `apps/studio/app/api/studio/video-factory/{route,render/route,assets/route}.ts`; `apps/studio/app/api/studio/exports/route.ts`; `apps/studio/app/api/integrations/asset-factory/*`; `apps/studio/app/studio/video-factory/page.tsx` | `.github/workflows/urai-production-verify.yml`; provider/compositor execution remains separately gated |
| `urai-jobs` | `65ec6f8cd33d351cbee66eceefd231326cff0bc3` | internal async execution fabric | `functions/src/core/{jobs,lease,results}.ts`; `functions/src/jobs/{createJob,executeJob,processQueueTick,retryExpiredLeases}.ts`; `workers/{asset-worker,narrator-worker,spatial-worker}/*` | `.github/workflows/urai-jobs-ci.yml`; `.github/workflows/urai-jobs-final-ci.yml`; `.github/workflows/urai-production-verify.yml` |
| `urai-communications` | `1a4e97aacd0b7fddebcf58723164169e0ee9224c` | communications/delivery/outreach | `functions/src/delivery/{adapters,consent,providers,queue,status}.ts`; `functions/src/processing/processCall.ts`; `functions/src/ewi/{index,policy}.ts` | `.github/workflows/ci.yml`; `.github/workflows/urai-production-verify.yml` |
| `urai-marketing` | `e40e55fd0932891b8c6c4a4069d8a1aca0cedb72` | marketing/public growth operations | `README.md`; `docs/MARKETING_OPERATIONS.md`; `docs/LIVE_API_CONTRACT.md`; `docs/URAI_MARKETING_SOURCE_OF_TRUTH_LOCK.md` | `.github/workflows/production-verify.yml`; `.github/workflows/urai-production-verify.yml` |
| `urai-investors` | `ad8103475d381e37a1dd28714e6e8aeb8b902bd4` | investor/public + gated data-room surface | `src/app/investor/data-room/page.tsx`; `src/app/investor/metrics/page.tsx`; `functions/src/{access,materials,audit}.ts`; `src/app/request-data-room/page.tsx` | `.github/workflows/ci.yml`; `.github/workflows/verify.yml`; `.github/workflows/urai-production-verify.yml` |
| `urai-foundation` | `ea5c39210c242a21af0e4c9c3d332e187bdd0b8a` | public-benefit/foundation programs | `functions/src/index.ts`; `docs/foundation/URAI_PROGRAM_MENU.md`; `docs/staff-backend-contract.md`; `docs/product-integration-contract.md` | `.github/workflows/check.yml`; publication/release authority remains governed by Foundation policy |
| `urai-labs-llc` | `4b8aa76575db20277f7fa36bdd599e578d594590` | Labs/corporate public authority | `functions/src/{index,forms}.ts`; `src/experience/index.ts`; `docs/PUBLIC_AUTHORITY.md`; `docs/PROPERTY_REGISTRY.md` | `.github/workflows/ci.yml`; `.github/workflows/deploy-public-authority.yml`; `.github/workflows/urai-production-verify.yml` |
| `urai-privacy` | `2f9fbf495379ffe53d425e32d48484e382b99d0d` | privacy/consent/data-rights authority | `functions/src/{consent-decision,consent-revocation,export-request,deletion-functions}.ts`; `app/privacy-center/*`; `app/data-controls/page.tsx` | `.github/workflows/privacy-release-verification.yml`; `.github/workflows/urai-production-verify.yml`; consent-decision validation workflow |
| `B2Bportal` | `e454d66882fa30775fe194fdf3975a038fff7953` | B2B partner/aggregate surface | `functions/src/index.ts`; `app/lib/actions.ts`; `docs/ROUTES_AND_MODULES.md`; `docs/PRIVACY_AND_CONSENT.md` | `.github/workflows/ci.yml`; `.github/workflows/production-evidence-gate.yml`; `.github/workflows/urai-production-verify.yml` |
| `urai-storytime` | `e43ed4c74c0f10ba90402ee1d94b9618cc15f454` | guardian-operated story creation/reading | `src/app/storytime/{page.tsx,[sessionId]/page.tsx,settings/page.tsx}`; `functions/src/{storytime,story-provider,generate-narrator-script,generate-weekly-story-scroll}.ts` | `.github/workflows/ci.yml`; `.github/workflows/release-promotion.yml`; `.github/workflows/urai-production-verify.yml` |
| `urai-staging` | `650f9ec9755727605681a109947209b668e8539e` | staging/integration environment | `functions/src/index.ts`; `functions/src/lib/{featureRegistry,stagingBoundaries,validation}.ts`; `docs/REPO_MAP.md` | `.github/workflows/ci.yml`; `.github/workflows/staging-deploy.yml`; `.github/workflows/urai-production-verify.yml` |

## Legacy/runtime-predecessor repositories

These remain source/history inputs, not current public runtime authority:

| Repository | Main tree SHA snapshot | Classification |
|---|---|---|
| `UrAi` | `82783e7e14d3f9123999d13ae6a2a22af86476d1` | legacy product/runtime lineage; current docs include explicit production-authority quarantine/guards |
| `UrAiProd` | `e2f78204e5a8be6bce5d2ff96bcd89fce9a8c48b` | historical production-era monolith; routes/features remain lineage, not current runtime authority |
| `UrAi-Dev` | `09ddb28186d39cbc1ed3873cbadca0fbd4b2fe16` | historical/dev/staging lineage; not current public runtime authority |

Current public spatial runtime authority remains `LifeLoggerAI/urai-spatial/urai-tier1`.

## Completion boundary

This register establishes **where the code/contracts/tests/workflows live** for recovery and traceability. It does not transfer CI green, merge approval, deployment authority, provider activation, legal approval, security review, visual acceptance, or live-production truth between repositories or SHAs.
