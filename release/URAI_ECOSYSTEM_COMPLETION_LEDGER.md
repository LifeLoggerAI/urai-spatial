# URAI Ecosystem Completion Ledger

Ledger date: 2026-07-06  
Canonical public owner: `LifeLoggerAI/urai-spatial`  
Canonical public runtime: `urai-tier1`  
Canonical public branch: `main`  
Public domain: `https://urai.app`  
Current public certification: **NOT RELEASE-CAPABLE**

## Status vocabulary

- `VERIFIED LIVE` — externally verified on the production domain at an identified deployed SHA.
- `VERIFIED IN REPOSITORY` — source/configuration and repository evidence verified, but not certified live.
- `IMPLEMENTED BUT NOT DEPLOYED` — implementation exists with repository checks, without deployment evidence.
- `PARTIALLY IMPLEMENTED` — material source exists but required behavior, integration, tests, or evidence is incomplete.
- `BLOCKED` — completion depends on an external authority, credential, payment, device, or unresolved P0 dependency.
- `ROADMAP` — capability is not in the current release scope.
- `REJECTED OR OBSOLETE` — duplicated or superseded implementation that must not own production.

## Canonical ownership

| System | Canonical repository | Branch/runtime | Current classification | Evidence |
| --- | --- | --- | --- | --- |
| Public spatial application | `LifeLoggerAI/urai-spatial` | `main`; `urai-tier1` | VERIFIED IN REPOSITORY; PARTIALLY LIVE | `README.md`, `STATUS.md`, `EVIDENCE.md` |
| Studio/operator control plane | `LifeLoggerAI/urai-studio` | `main`; `apps/studio`, `functions` | PARTIALLY IMPLEMENTED | Studio PR #56 and audit set |
| Asset generation | `LifeLoggerAI/asset-factory` | `main`; `assetfactory-studio` | PARTIALLY IMPLEMENTED | Main SHA `bda96f72c86186abc553947dddd66360e12bfc26`; production validation failure receipt workflow |
| Job/release planning | `LifeLoggerAI/urai-jobs` | `main`; Functions and workers | PARTIALLY IMPLEMENTED | Main SHA `f364c5b8497203d886108e22d262bb9460604ec4`; plan-only sequencer |
| Privacy operations | `LifeLoggerAI/urai-privacy` | `main` | PARTIALLY IMPLEMENTED | Spatial cross-repo privacy gate; operational proof pending |
| Content/schema | `LifeLoggerAI/urai-content` | `main` | PARTIALLY IMPLEMENTED | Spatial cross-repo content/schema gate; production contract proof pending |
| Administration | `LifeLoggerAI/urai-admin` | `main` | PARTIALLY IMPLEMENTED | Spatial cross-repo admin gate; release approval/feature-flag proof pending |
| Analytics | `LifeLoggerAI/urai-analytics` | `main` | PARTIALLY IMPLEMENTED | Repository accessible; production ingestion/query/retention proof pending |
| Marketing | `LifeLoggerAI/urai-marketing` | `main` | PARTIALLY IMPLEMENTED | Repository accessible; canonical public-claim and live integration proof pending |
| Communications | `LifeLoggerAI/urai-communications` | `main` | PARTIALLY IMPLEMENTED | Repository accessible; notification/provider proof pending |
| B2B portal | `LifeLoggerAI/B2Bportal` | `main` | PARTIALLY IMPLEMENTED | Repository accessible; authenticated Studio contract proof pending |
| Storytime | `LifeLoggerAI/urai-storytime` | `main` | ROADMAP / PARTIALLY IMPLEMENTED | Repository accessible; current release relationship not certified |
| Investor surface | `LifeLoggerAI/urai-investors` | `main` | PARTIALLY IMPLEMENTED | Repository accessible; not production-critical to public route certification |
| Staging/release train | `LifeLoggerAI/urai-staging` | `main` | PARTIALLY IMPLEMENTED | Spatial release-train dependency gate exists; staging deploy receipt pending |
| Legacy app repositories | `LifeLoggerAI/UrAi`, `UrAi-Dev`, `UrAiProd`, other historical roots | varies | REJECTED OR OBSOLETE for public ownership unless a decision record says otherwise | `urai-spatial` authority decision |

## Completion ledger

| ID | System / repository | Requirement | Current evidence | Severity | Dependencies | Implementation location | Validation method | Target | Status | Blocking authority | Final receipt location |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ECO-SPAT-001 | Spatial | Record exact production deployed SHA, target Firebase project, environment, and rollback SHA | `STATUS.md` and `EVIDENCE.md` say all are unrecorded | P0 | Passing release gates; deployment authority | `.github/workflows/spatial-live-deploy.yml`, `EVIDENCE.md` | Deployment receipt plus external domain smoke | Current release | BLOCKED | Firebase/GitHub deployment authority | `EVIDENCE.md` deployment table + workflow artifact |
| ECO-SPAT-002 | Spatial | Correct `/privacy-controls/` so it serves its dedicated route, not Home | Verified blocker in `STATUS.md` | P0 | Build/export/deploy | `urai-tier1/src/app/privacy-controls`, export/hosting config | Browser assertion and content marker on custom domain | V1 | PARTIALLY IMPLEMENTED | Repository + deployment | Spatial workflow receipt and screenshots |
| ECO-SPAT-003 | Spatial | Make `/focus`, `/focus/`, and query variants render the same current chamber | Verified stale shell/query parity blocker | P0 | Routing/export fix | `urai-tier1/src/app/focus`, static hosting config | Deep-link browser matrix with `memoryId=quiet-reset` | V1 | PARTIALLY IMPLEMENTED | Repository + deployment | Query-parity artifact and live smoke |
| ECO-SPAT-004 | Spatial | Stop catch-all static rewrite from masking missing pages as successful Home responses | `firebase.static.json` catch-all noted in `STATUS.md` | P0 | Hosting strategy decision | `firebase.static.json`, export output | Missing-route test must return intentional 404/fallback, not Home | V1 | PARTIALLY IMPLEMENTED | Firebase hosting decision | Hosting-config diff + live negative-route receipt |
| ECO-SPAT-005 | Spatial | Prevent expired `FIREBASE_TOKEN` from overriding service-account credentials | Verified deployment workflow blocker | P0 | Workflow patch and dry-run | `.github/workflows/spatial-live-deploy.yml` | Service-account mode environment assertion; deploy dry gate | V1 | PARTIALLY IMPLEMENTED | GitHub Actions/Firebase credentials | Workflow run artifact |
| ECO-SPAT-006 | Spatial | Pass frozen install, full tier/XR release verification, browser and accessibility gates on current main | Gates wired; current-main run not recorded | P0 | ECO-SPAT-002–005 | Root scripts, `urai-tier1`, release matrix | `pnpm live:check`, browser/E2E, reduced-motion, accessibility | V1 | PARTIALLY IMPLEMENTED | CI runners | Release workflow run + artifact |
| ECO-STU-001 | Studio | Merge verified Studio hardening and canonical audit set | Draft PR #56; Health Guard previously passed; final-head workflows rerunning | P0 | CI green; review findings resolved | `LifeLoggerAI/urai-studio` PR #56 | Frozen install, guards, lint, typecheck, tests, build, HTTP smoke | V50 foundation | IMPLEMENTED BUT NOT DEPLOYED | GitHub CI/review | PR #56 + workflow receipt artifacts |
| ECO-STU-002 | Studio | Complete canonical membership/RBAC model and emulator authorization matrix | Issue #52; current rules require redesign | P0 | Product role model; Firebase emulators | `firestore.rules`, `storage.rules`, API/callable policy | Cross-tenant allow/deny, role-transition, revocation tests | V50 | PARTIALLY IMPLEMENTED | Security/product decision | Issue #52, CI emulator artifact |
| ECO-STU-003 | Studio | Record Studio deployed SHA, rollback SHA, production smoke | Issue #43 and pending evidence ledger | P0 | ECO-STU-001/002 | Studio deploy workflow/runbook | Production `/readyz`, protected API, tenant isolation, live smoke | V50 | BLOCKED | Firebase deployment authority | Studio release evidence ledger |
| ECO-AF-001 | Asset Factory | Resolve current production asset validation failure | Main workflow now captures diagnostic; latest main describes failure | P0 | Exact validation artifact | `.github/workflows/asset-factory-pipeline-proof.yml`, manifests | Production asset validation command passes with artifact | V1 asset certification | PARTIALLY IMPLEMENTED | CI/provider evidence | Asset Factory workflow artifact |
| ECO-AF-002 | Asset Factory / Spatial | Generate, validate, promote, and wire V2 80-asset manifest | Spatial canonical handoff reports 0 ready / 80 missing | P0 for V2; not V1 launch blocker | Paid provider authorization, manifest, runtime wiring | Asset Factory manifests and Spatial runtime asset registry | 80/80 receipt, checksums, derivatives, visual tests, promotion | V2 | BLOCKED | Provider billing/approval | Provider receipt + promotion manifest + Spatial live proof |
| ECO-AF-003 | Asset Factory / Spatial | Generate, privacy-review, promote, and wire V3 39-asset manifest | Spatial canonical handoff reports 0 ready / 39 missing | P0 for V3 | Paid provider authorization; privacy review; runtime wiring | Asset Factory V3 manifest; Spatial relationship/pattern assets | 39/39 receipt, consent/privacy review, visual/runtime proof | V3 | BLOCKED | Provider billing + privacy approval | Provider receipt + privacy approval + live proof |
| ECO-JOB-001 | Jobs | Replace plan-only release sequencer with bounded authorized execution workers | Current main explicitly reports plan-only, dry-run, no side effects, not ready for execution | P1 | Canonical job schema, RBAC, provider controls | `functions`, `workers` | Queue, idempotency, retries, cancellation, DLQ, audit, rollback tests | V100 | PARTIALLY IMPLEMENTED | Architecture/security/provider authority | Jobs workflow + deployment receipt |
| ECO-JOB-002 | Jobs | Deploy and prove job workers, queue/DLQ, monitoring and rollback | Spatial jobs dependency gate says proof not recorded | P1 | ECO-JOB-001 | Jobs deployment config | Worker revision, queue smoke, failure/retry/DLQ test | V100 | BLOCKED | Cloud deployment authority | Jobs deployment artifact |
| ECO-PRIV-001 | Privacy | Prove consent, revocation, export, deletion, audit, redaction and legal-hold operations | Cross-repo gate exists; operational evidence absent | P0 before sensitive provider/XR claims | Canonical data inventory and identity model | `urai-privacy` plus owning repos | End-to-end data-rights tests and deletion receipts | V100 / claim gate | PARTIALLY IMPLEMENTED | Legal/privacy/security review | Privacy evidence ledger |
| ECO-SEC-001 | Ecosystem | Unify tenant identity and authorization contracts across Studio, Spatial, Jobs, Asset Factory and Storage | Separate models and pending Studio issue #52 | P0 | Canonical membership schema | Shared contracts plus each repo's rules/API | Multi-service two-tenant integration suite | V100 | PARTIALLY IMPLEMENTED | Security architecture decision | Cross-repo authorization receipt |
| ECO-INT-001 | Ecosystem | Replace URL/config-only integrations with authenticated versioned contracts and live receipts | Studio/Spatial docs explicitly say gates exist but production proof does not | P1 | ECO-SEC-001, schemas, deployed services | Integration adapters in each owner repo | Contract tests, auth, timeouts, retries, idempotency, observability | V100 | PARTIALLY IMPLEMENTED | Repo owners and deployment credentials | Per-integration receipt index |
| ECO-OPS-001 | Ecosystem | Central monitoring, release metadata, alerts, incident and rollback evidence | Logs/guards exist; deployed revisions, SLOs, alerts and restore tests incomplete | P1 | Deployed services | Admin/analytics/communications + owner repos | Synthetic checks, alert exercise, rollback/restore drill | V100 | PARTIALLY IMPLEMENTED | Cloud monitoring authority | Operations evidence bundle |
| ECO-XR-001 | Spatial | Physical Quest certification | Source preflight exists; no physical-device proof | P0 before Quest claim | Physical headset and tester | Spatial XR runtime | Controller/hand input, lifecycle, comfort, thermal/performance recording | V4 | BLOCKED | Physical device validation | Device-lab receipt |
| ECO-XR-002 | Spatial | WebXR/mobile AR provider and privacy certification | Gates wired; provider/device/privacy evidence absent | P0 before XR/AR live claim | Browser/device matrix, camera permission/privacy approval | Spatial XR runtime, Privacy | Real-device matrix, permissions, fallback, reduced-motion, privacy tests | V4 | BLOCKED | Device/provider/privacy authority | Browser/device evidence bundle |
| ECO-LEGAL-001 | Ecosystem | Make legal/IP ownership references consistently use `URAI IP Holdings LLC` | Intended entity established; repositories include older `urai-labs-llc` naming | P1 | Counsel-approved document scope | Legal docs, notices, repository ownership maps | Search/consistency check plus counsel sign-off where required | V50/V100 | PARTIALLY IMPLEMENTED | Legal approval | Legal consistency receipt |
| ECO-ACC-001 | Public product | Certify keyboard, touch, screen-reader, reduced-motion and mobile journeys across the public chain | Source-level accessibility gates exist; complete external journey proof absent | P0 before public certification | Stable build and route parity | `urai-tier1`, Playwright/a11y suites | Desktop/mobile browser matrix and assistive-tech evidence | V1 | PARTIALLY IMPLEMENTED | CI/device validation | Accessibility artifact/screenshots |
| ECO-PERF-001 | Public product | Enforce performance and asset budgets on mobile and desktop | Not recorded in canonical evidence | P1 | Final assets and route stability | Spatial CI/build | Bundle, LCP/INP/CLS, memory/GPU budgets | V1/V2 | PARTIALLY IMPLEMENTED | CI/browser infrastructure | Performance artifact |
| ECO-REL-001 | Ecosystem | Produce immutable release receipt index for every material completion claim | Per-repo ledgers exist but no complete ecosystem index | P0 certification gate | All preceding receipts | This ledger and per-repo evidence files | Every completed row links commit, workflow, deploy, live, rollback evidence | Current certification | PARTIALLY IMPLEMENTED | All owners | `release/URAI_ECOSYSTEM_RECEIPT_INDEX.md` |

## Version certification

| Version | Evidence-backed purpose | Current status | Certification blocker |
| --- | --- | --- | --- |
| V1 | Public spatial foundation and core journey | PARTIALLY IMPLEMENTED; partially live; NOT CERTIFIED | Route/query parity, rewrite masking, deployment credential precedence, current-main release run, deployed/rollback SHA, browser/mobile/a11y proof |
| V2 | Living world and 80 provider assets | BLOCKED | 0/80 promoted; paid provider receipt, checksums, runtime wiring and live visual proof absent |
| V3 | Relationships/patterns and 39 provider assets | BLOCKED | 0/39 promoted; paid provider receipt, privacy approval, runtime/device proof absent |
| V4 | WebXR/Quest/AR spatial computing | BLOCKED | Provider/browser/device/privacy certification absent |
| V5 | Mirror/legacy/provenance/whole-life convergence | PARTIALLY IMPLEMENTED / ROADMAP | Canonical implementation, privacy/data-rights, provider, tests, deployment and live proof incomplete |
| V10 | No stable canonical definition verified | ROADMAP | Must be defined through accepted capability and evidence criteria before use |
| V50 | Stable coherent foundation | PARTIALLY IMPLEMENTED | Studio P0 authorization/release evidence; ecosystem source/receipt consolidation |
| V100 | Complete production platform | ROADMAP / PARTIALLY IMPLEMENTED rails | Real provider, job, integration, privacy, observability and promotion systems |
| V150 | Bounded autonomous operating system | ROADMAP | V100 production spine, policy gates, self-healing and human override |
| V200 | Mature global ecosystem platform | ROADMAP | Multi-region, residency, enterprise governance, SDK, localization and global release controls |

## Release rule

No row becomes `VERIFIED LIVE` until its receipt records repository, branch, commit, workflow, tests, deployment target, deployed SHA, public URL verification, provider or asset receipt where applicable, rollback SHA, and remaining caveats.
