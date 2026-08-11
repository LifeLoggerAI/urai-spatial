# URAI Final Production Audit — 2026-06-23

> Historical audit with updated release instructions as of July 10, 2026. Route observations below describe the June 23 deployment and are not current production certification. The operative closure procedure is `docs/P0_VERIFICATION_CLOSURE_RUNBOOK.md`, issue #461, and `.github/workflows/spatial-live-deploy.yml`.

Scope: `LifeLoggerAI/urai-spatial` as the public production source of truth, with system-of-systems findings for Studio, Marketing, legacy UrAi, Asset Factory, Jobs, Content, Admin, Analytics, and connected integration surfaces.

## Historical executive verdict

On June 23, URAI Spatial was reachable as a public route spine, but the public deployment did not match source: `/privacy-controls` served the Home fallback and several routes used older copy. That observation remains historical evidence only. It must be replaced by an exact deployed-SHA receipt and current custom-domain smoke before any production-certification claim.

Do not call the entire URAI system-of-systems fully production-locked until the live cloud, provider, worker, billing, storage, domain, observability, privacy, rollback, and evidence gates are cleared.

## Production source of truth

- Repository: `LifeLoggerAI/urai-spatial`
- Branch: `main`
- Static Hosting config: `firebase.static.json`
- Published directory: `urai-tier1/out`
- Root package manager: `pnpm@10.0.0`
- Root Node engine: `>=22`
- Canonical public URL: `https://urai.app`
- Current release boundary: `.github/workflows/spatial-live-deploy.yml` is verification-only and records NO-GO

## Historical route observations

| Route | June 23 observation | Current evidence requirement |
| --- | --- | --- |
| `/` and `/home` | Home threshold rendered. | Exact-SHA custom-domain fingerprint and screenshot |
| `/ground` | Ground operating-world surface rendered. | Exact-SHA interaction, claim, and screenshot proof |
| `/life-map` | Public-safe Life Map rendered. | Current adaptive scene, query, refresh, Back, and screenshot proof |
| `/focus` | The Quiet Reset chamber rendered. | `memoryId` and return-context proof |
| `/replay` | Memory film rendered. | `memoryId` and `manifestId` preservation proof |
| `/mirror` | Reachable but older/thinner than source. | Current copy and visual parity |
| `/passport` | Reachable but older/thinner than source. | Current consent/ownership UX parity |
| `/privacy-controls` | Incorrect Home fallback. | Dedicated Privacy Controls fingerprint; no Home markers |
| `/location-map` | Reachable symbolic atlas. | Current symbolic/place boundary and visual parity |
| `/status` | Older status surface. | Exact deployed SHA, rollback identity, and receipt-backed boundaries |

None of these historical observations is evidence for the current release candidate.

## Superseded deployment instructions

All former local and workflow dispatch commands—including `firebase deploy`, `pnpm live:deploy`, `pnpm publish:live`, and release/rollback/confirmation inputs to `spatial-live-deploy.yml`—are retired and must not be used.

The canonical workflow is verification-only, records **NO-GO**, exposes no production environment or provider credential, and cannot deploy or roll back. Legacy recovery and preview-channel workflows are also checks-only.

Restoring production authority requires a separately reviewed change after provider-side external-account WIF, least-privilege IAM, historical-key revocation, negative-auth, Cloud Audit Logs, protected settings/read-back, exact-head nonproduction validation, and eligible independent approval are proven.

## Original execution limitation

The June 23 ChatGPT container did not have a mounted repository workspace, Firebase credentials, or working DNS for `urai.app`; no build or deployment was run there. Browser inspection was used only for the historical route observations. That limitation is not a current release receipt.

## System readiness boundaries

| System | Historical posture | Remaining evidence before a stronger claim |
| --- | --- | --- |
| Spatial | Substantial source/demo route spine | Exact-head checks, protected deploy, rollback, live parity, screenshots |
| Studio | Repository-side surfaces and contracts | Release check, route capture, real render artifacts, provider evidence |
| Marketing | Static path; dynamic operations gated | Billing, managed secrets, deployment and monitoring evidence |
| Legacy UrAi | Compatibility system | Keep noncanonical; do not treat as primary production source |
| Asset Factory | Repository-side handoff | Exact binary/provider verification, storage/auth/worker/live evidence |
| Jobs | Repository-side verification | Production environment, worker URLs, health and release evidence |
| Content | Guarded | Provider, deployed smoke, end-to-end, observability and rollback evidence |
| Admin | Repository-side controls | Production preflight and live verification |
| Analytics | Repository-side checks | Live event, privacy, monitoring and failure evidence |

## Current blockers carried forward

- Historical-key revocation, negative-auth, Cloud Audit Log, WIF/IAM, protected-settings, and runtime read-back receipts are required before any release authority may be restored.
- `/privacy-controls` and `/status` must be externally verified after the current candidate is deployed.
- Provider-backed and physical-device claims remain separately gated.
- Final desktop/mobile screenshots and human review are required.
- Cross-system billing, secrets, workers, storage, observability, and recovery evidence remain separate.

## Current readiness call

This document does not declare production green. Spatial remains NO-GO. Exact-head source checks and independent approval must complete, provider closure must be proven, and production authority must be restored only through a separately reviewed keyless change before any deploy, rollback, public-beta, or live-parity claim.
