# URAI Spatial Parallel Execution Ledger — 2026-07-17

## Authority

- Repository: `LifeLoggerAI/urai-spatial`
- Canonical branch: `main`
- Ledger base: `17ed2057212b2be418b8a78e167b823265fd7582`
- Release-control repair in review: PR #672 at `2f231553f26b468ce359c263a1a363537b570c8d`
- Production mutation remains owned exclusively by `.github/workflows/spatial-live-deploy.yml`.
- No feature branch may claim production certification from branch CI.

## Serialization rules

1. Release-control, shared world contracts, route ownership, global scene orchestration, deployment workflows, lockfiles, and canonical documentation each have one owner.
2. Independent feature lanes must use separate branches and avoid shared files.
3. Every feature branch refreshes from current remote `main` before review and again before merge.
4. No stale PR is rebased wholesale when its useful work can be recreated as a focused current-main change.
5. No merge occurs with unresolved review findings, a moving head, or missing exact-head evidence.
6. The final deployment waits until the selected merged-main SHA is stable.

## Current serialized release spine

| Order | Scope | Authority | State | Merge condition |
|---:|---|---|---|---|
| 1 | Navigation checkpoint validation | PR #669 / `bb9bd6f3...` | Merged | Complete |
| 2 | Fingerprint-aware dispatch | PR #670 / `17ed2057...` | Merged | Complete, but follow-up required |
| 3 | Live rollback SHA authority | PR #672 / `2f231553...` | In review | Exact-head checks green; no unresolved findings |
| 4 | Stable merged-main verification | resulting `main` | Pending | All required checks terminal-success |
| 5 | Protected deployment | `spatial-live-deploy.yml` | Pending | Exact stable main SHA and validated live rollback SHA |
| 6 | Live certification | apex + `www` | Pending | SHA parity, route journey, console/network, monitoring and rollback evidence |

## Parallel lane ownership matrix

| Lane | Owned paths or artifacts | Must not edit | Dependencies | Current disposition |
|---|---|---|---|---|
| Shared contracts | `src/spatial/contracts/**`, typed settings and fixtures | Route pages, deployment workflows | Release spine stable | Serialize as first product merge |
| Living sky/weather | isolated environment modules, shaders and tests | Global scene owner | Shared time/mood interfaces | Safe to develop independently |
| Terrain/materials | isolated terrain material modules and tests | Ground route owner | Quality-tier interface | Safe to develop independently |
| Spatial audio | audio assets, buses, mixers and tests | Route orchestration | Accessibility/audio contracts | Safe to develop independently |
| Home NPCs | isolated behavior and deterministic test modules | Home route owner | Navigation boundary interface | Safe to develop independently |
| Home props | isolated authored prop components/data adapters | Home route owner | Memory-state interface | Safe to develop independently |
| Ground blockout | destination package and scene-local tests | Destination registry, global router | Shared entry-volume interface | One Ground integration owner |
| Council Hall | `destinations/council/**` | Ground master scene | Entry/audio/light contracts | Independent package |
| Memory Archive | `destinations/archive/**` | Memory schema/global auth | Privacy and loading contracts | Independent package |
| Privacy/Passport | destination-local modules | Global privacy schema | Secure-state contract | Independent packages |
| Focus lighting | focus-local lighting modules | Focus route owner | Mood/reduced-flash contract | Independent module |
| Focus grade | focus-local post-processing modules | Focus route owner | Mood/accessibility contract | Independent module |
| Focus transitions | transition sequences/tests | Global route controller | Cancellation/navigation contract | Integrate after shared contracts |
| Replay camera | replay-local camera module/tests | Replay route owner | Reduced-motion contract | Independent module |
| Replay narration | cue queue/captions/provider adapter | Global audio bus | Audio and memory contracts | Independent module |
| Replay score | score layers/mixer tests | Global audio bus | Audio contract | Independent module |
| Replay operations | fresh extraction from PR #663 | Navigation/shared storage owners | Persistence contract | Recreate; do not merge #663 wholesale |
| QA/evidence | tests, profiling scripts, evidence docs | Product ownership files | Every lane | Continuous parallel lane |

## Stale PR disposition

| PR | Status | Required action |
|---:|---|---|
| #666 | Superseded | Closed; preserved by #670/#672 |
| #663 | Stale combined continuation | Extract useful Replay operations into focused current-main PRs, then close |
| #660 | Historical final candidate | Close as superseded by current main |
| #659 | Old-base Ground candidate | Recreate selected Ground changes from current main only |
| #653 | Old-base Home replacement | Diff against current main; extract only missing authored work |
| #651 | Historical receipt-ledger branch | Close if current main already contains and runs ledger workflow |
| #645 | Old-base Focus/Replay visual repair | Audit current captures; recreate only remaining defects |
| #643 | Old-base route-return repair | Confirm current main contains behavior; extract missing tests only |
| #641 | Old-base host-parity work | Confirm current main contains verifier/workflow; close if superseded |
| #631 | Old-base provider security | Recreate security changes from current main after release spine |
| #630/#629/#625/#623 | Historical audit/visual/proof branches | Evidence only; close after current-main equivalence audit |

## Required evidence for every feature PR

- frozen install or lockfile verification;
- formatting/lint;
- type checking;
- unit and focused contract tests;
- production build;
- affected-route smoke;
- keyboard, touch and accessibility behavior;
- reduced-motion/reduced-sensory behavior;
- console and network error checks;
- asset and bundle budget checks when applicable;
- exact head SHA recorded in the PR;
- all review threads resolved before merge.

## Final acceptance boundary

Completion requires all of the following on the same exact merged-main authority:

- Home, Ground, Life Map, Focus and Replay behave as one continuous world journey;
- Council Hall, Archive, Privacy and Passport read as believable enterable places;
- no permanent fictional user history or production demo identity;
- complete loading, empty, locked, degraded, offline, denied and error states;
- measured performance evidence and accessibility verification;
- exact protected deployment receipt;
- apex and `www` SHA parity;
- live route-chain smoke with clean console/network evidence;
- monitoring and rollback evidence;
- Google Drive Launch Control synchronized with repository and production reality.
