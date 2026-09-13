# URAI / UrAi — Current-State Handoff for ChatGPT and AI Agents

**Snapshot:** 2026-09-13, approximately 09:41 America/Chicago  
**Canonical repository:** `LifeLoggerAI/urai-spatial`  
**Canonical runtime root:** `urai-tier1`  
**Purpose:** Give a new ChatGPT/Codex/AI session enough verified context to catch up quickly without relying on chat memory, stale screenshots, or old PR prose.

> **Golden rule:** Re-fetch live GitHub refs before acting. A branch head, `main`, deployment receipt, or provider readback can move after this document is written. If a PR body names an older exact SHA than the PR's current `head.sha`, the live GitHub ref wins. Never transfer CI, review, visual, governance, deployment, or provider evidence from a predecessor SHA to a successor.

This is a coordination and catch-up document. It is **not** itself release authority, visual approval, deployment proof, legal advice, provider certification, or a substitute for exact-head receipts.

---

## 1. Read this first in a new AI session

Before making changes:

1. Read this file completely.
2. Re-fetch `main` and the live heads of PRs `#1177`, `#1195`, `#1193`, and any lane you intend to edit.
3. Check whether PR text is stale relative to its actual `head.sha`.
4. Read the exact changed files and current workflow status for the head you will touch.
5. Treat retained screenshots as evidence only after literally inspecting the pixels; a successful workflow name is not visual acceptance.
6. Keep independent lanes isolated. Do not modify the active Spatial Gold Master branch merely to update documentation, billing, public-discovery, legal, or provider work.
7. Do not call something production-live merely because source exists, CI is green, a PR is merged, or a route has a file.

### Current repository anchors at this snapshot

- `main`: `731f9312a3f0d6dbf945ada85c6f46e957e1b2d9`
- `main` most recent merge: PR `#1194`, **Fix custom-domain smoke current route fingerprints**
- Active Spatial / Gold Master lane: PR `#1177`, branch `home-final-v24-certify-20260826`
- Live PR `#1177` branch head at this snapshot: `28500d4cbdf5f83b89127ae337dd5cb793176ae1`
- PR `#1177` description still names older `aca01cdd97dbed58433128b615196e5c8b0a135c` as a product head. That description is now stale with respect to the live branch head.
- PR `#1177` currently records the deployed production lineage as older protected release `748e50398d85effeaa4ed17aaf78d4076dddbb45`; **reverify live deployment authority before repeating this as current production truth.**

---

## 2. Non-negotiable truth and governance rules

The repository has accumulated strong exact-head and fail-closed conventions. Preserve them.

- **Exact head means exact head.** Any source mutation creates a successor and makes predecessor workflow/review/pixel conclusions non-authoritative for the successor.
- **Source-ready != merged != deployed != live-verified != visually accepted.** Keep those states separate in every report.
- **Machine green != literal visual approval.** Open retained captures and inspect the actual composition.
- **A PR description can become stale.** Always compare the body SHA to GitHub's actual PR head.
- **Do not weaken tests or acceptance thresholds to make a lane green.** Repair the demonstrated runtime, proof-harness, or source-contract defect at its owner.
- **No force merge, fake review, fabricated receipt, fake provider proof, or predecessor approval transfer.**
- **No unsupported public claims.** In particular, source presence does not establish provider certification, medical outcomes, active legal/fundraising status, live billing, device certification, or production deployment.
- **Home/Ground/Life Map have different world canons.** Do not flatten them into one art language.
- **Orb ownership is bounded.** The authored physical Orb belongs to Home. Do not reintroduce it as a Life Map control or duplicate visual owner.
- **Privacy, accessibility, reduced motion, recovery/fallback, semantic navigation, performance budgets, and release-security contracts are preservation requirements, not optional polish.**

---

## 3. Most recent Spatial work — what changed today

The most important recent change is a correction of the **Life Map's visual ontology**, plus continued Focus hierarchy work and world convergence.

### 3.1 The rejected path: terrestrial Life Map geography

Several September 13 commits explored or strengthened an inhabited-terrain/geography framing for Life Map and improved portrait occupancy. That work is useful history but **is not current visual authority**.

Recent historical commits include, among others:

- `b96fc692e8ca8c0fea876bf15ccfe69708591f30` — Strengthen Life Map geography and portrait framing
- `916c9be99999c5dde5473142ceee4dd32fc622f1` — Deepen Life Map geography and portrait occupancy
- `371140b0b9883eedc31e07d5dea1dde0c14e507a` — Strengthen Life Map portrait world occupancy
- `fd555c60fcc5872027f618f744a7862e39aa343e` — Reframe Life Map as inhabited geography
- `d85c7dc4a1880045de8186c960e67397c1863a4c` / `0924f06f5b27e94985c225f3b50320aaa8ae3e08` — advance/lock the then-current Life Map framing review contracts

Literal retained-pixel review rejected that direction. The failure was conceptual as well as compositional: too much dead sky remained in portrait, and—more importantly—the Life Map was being represented as terrestrial terrain/geography when the intended product canon is a personal universe.

**Do not revive those terrain/geography commits as visual authority merely because they are newer-looking than old galaxy code. They were superseded by explicit review.**

### 3.2 Current Life Map canon: cosmic, personal, no ground

The current direction explicitly restores Life Map as a navigable personal universe.

Core canon:

- **No continuous ground, floor, or terrestrial horizon owner** in the canonical Life Map route.
- Deep starfield and personal galaxy.
- Memory stars at meaningful 3D positions.
- Constellation relationships between memories.
- Nebula / emotional-weather fields.
- Selected memory stays celestial during departure/travel/approach/arrival inside Life Map.
- The user crosses into an authored terrestrial/interior memory chamber only when entering **Focus** or **Replay**.
- Existing Life Map data/privacy semantics remain authoritative.
- Direct-route selection repair, software-renderer handoff, Focus/Replay identity, reduced motion, WebGL recovery, semantic fallback, and exact-head render-proof markers must remain intact.

Current implementation owner includes:

- `urai-tier1/src/components/lifemap/CosmicComposedLifeMapScene.tsx`
- `urai-tier1/src/components/lifemap/LifeMapRouteBoundary.tsx`
- `urai-tier1/tests/lifemap-overview-framing.test.mjs`

The current scene declares the cosmic visual authority and explicit no-ground state, including the semantic concepts `life-map-deep-space`, `life-map-personal-galaxy`, `life-map-memory-stars`, constellations, nebulae, and emotional weather. The regression contract rejects reintroduction of old terrain owners.

Key successor commits:

- `febf4d3e9b2e2e2fb040e7b39023538b4b22a0f4` — restore cosmic Life Map canon
- `d29e6980b5cf1451fdfffcb6f23d9e250b87166a` — bind performance audit to the actual cosmic Life Map owner without weakening budgets
- `aca01cdd97dbed58433128b615196e5c8b0a135c` — align Life Map framing tests with cosmic canon
- `52963a063f39164a4b2839b151d4cd0bc902d510` — converge spatial worlds and cosmic Life Map
- `28500d4cbdf5f83b89127ae337dd5cb793176ae1` — restore the exact spatial successor tree; **this is the live #1177 branch head at this snapshot**

### 3.3 Current Life Map status

**Current classification: source successor present, not yet Gold-Master visually accepted.**

The next agent must not claim visual completion until the unchanged current exact head earns the required fresh source/build/browser/mobile/accessibility/performance matrix and retained pixels are literally inspected. If the branch moves again, restart exact-head reasoning from the new SHA.

### 3.4 Focus work in the same recent lineage

Focus was also tightened during the September 13 pass. Relevant commits include:

- `5f8e04602cbd873ce7e90e99019db2f72c6e96a0` — strengthen Focus selected-memory hierarchy
- `8d4c8bd542548ed42f7c8ddd967bc8dbdf5f99eb` — strengthen Focus living-memory focal hierarchy
- `ff0791e58dafeac1656747cfbfce2596d13154f3` — align Focus production contract with the then-current composition
- `4eb607276ef517965d25054685cd47e4dc91cfb4` — align Focus regression contract
- `3f174fe998311ec02ed12c58c500ee5c704b13e7` — align Life Map→Focus contract

The durable product rule is more important than any one interim V-number: **Focus is the selected memory chamber.** It must preserve the exact selected-memory identity from Life Map, give that memory dominant visual hierarchy, preserve Replay continuity, and must not regress into an error overlay, generic empty star, or unrelated Orb experience.

---

## 4. Spatial world canon that must survive future repair

### Home

Home is the embodied sanctuary / world entry. It may be terrestrial and physically grounded. It owns the authored companion Orb. The intended travel language remains:

- ascend / cross the Home sky threshold toward Life Map;
- descend / cross the grounded threshold toward Ground;
- semantic accessible navigation must coexist with cinematic in-world travel;
- the real authored physical Orb should have sole visual ownership, with accessible interaction mapped to it rather than a duplicate visible control.

Current Home work across the active lineage preserves authored assets, embodied movement, input ownership, route provenance, recovery, reduced motion, and Orb state/animation ownership.

### Ground

Ground remains terrestrial/embodied by design. It is the operational/private headquarters layer, not a galaxy. Preserve believable eye-level scale, paths and destinations, human/workforce presence, constraints/collision where owned, mobile movement, accessibility, and enterable thresholds.

### Life Map

Life Map is **not Ground in space** and must not have a continuous terrain/floor owner. It is the private galaxy/personal universe described above.

### Focus

Focus is the selected-memory manifestation/chamber. It continues the exact selected memory from Life Map, with the memory itself—not a generic interface—owning attention.

### Replay

Replay remains a protected strong lane. Preserve visible Save/Hide/Correct behavior where current authority provides it, selected-memory continuity, privacy/account isolation, offline/retry/idempotent persistence semantics, history/audit behavior, cinematic timing, and a deterministic return path.

The replay transition authority currently documented in PR `#1172` treats:

- URA-068 as Focus → Replay governed travel;
- URA-069 as Replay → previous destination, deterministically Focus when no prior destination exists;
- reduced-motion travel as shorter than normal deep travel;
- the legacy “return-to-galaxy” label as **not** authorization for a hard Replay → Life Map jump.

### Mirror / Passport / Status / Location Map

These remain distinct product/trust surfaces. Do not collapse their ownership into the Spatial visual lane. Mirror remains a reflection realm; Passport remains identity/consent/ownership; Status must tell release truth; Location Map owns global/emotional-weather interpretation, not Life Map's personal-memory graph.

---

## 5. `main` and recent release-control work

### `main@731f9312...`

Current `main` contains merged PR `#1194`, which repaired stale custom-domain route-fingerprint expectations while preserving fail-closed detection of genuinely stale deployment proof. The merge message records an exact-head technical matrix and Release Governance Guard pass for the reviewed predecessor head.

Do not infer from that merge that the active #1177 cosmic successor is deployed. `main` and the #1177 Gold Master candidate are different authorities right now.

### Custom-domain / post-deploy authority

PR `#1181` is a separate open lane that hardens custom-domain/post-deploy verification so it is explicitly bound to a supplied 40-character deployed SHA that must resolve to canonical history. It removes weak schedule/workflow-run assumptions and keeps live smoke as a deliberate post-deployment action. It remains dependent on current visual/review/governance convergence.

---

## 6. Active PR ledger — what another ChatGPT needs to know

This table is a **snapshot**. Re-fetch live heads/status before action.

| PR | Lane | Snapshot truth | Required caution |
|---|---|---|---|
| `#1177` | Spatial / Gold Master | Open. Live branch head at snapshot `28500d4c...`. Cosmic no-ground Life Map has replaced rejected terrestrial geography. Focus hierarchy/convergence work is present. | **Do not touch from unrelated lanes.** Fresh exact-head technical + literal visual acceptance + legitimate governance/review required before merge/deploy. PR body SHA is stale. |
| `#1195` | Route compatibility + Home provenance | Open. Actual head at snapshot `d00bedd5ae357f87146fa0e6b5e94f4d982073ba`; body still names older `8ae6ddb...`. Adds/repairs expected compatibility routes, Life Map selection observer behavior, Home travel provenance, embodied Home telemetry, accessible Orb hit ownership. | Must reconcile onto final frozen `#1177` authority; do not merge ahead of it. Body exact-head text is stale. |
| `#1193` | Robots / sitemap | Open. Head `b11612840aafb3cfd0461a67542632e35ea157fc`. Only public-discovery files. | Its #1177 parent has since advanced. Re-restack/reverify after Gold Master freezes. Search Console property was not yet registered through the connected path. |
| `#1188` | Commerce website readiness | Draft/open. Adds fail-closed commerce/pricing/support/legal surfaces for website review. Live billing remains OFF. | Do not invent final commercial terms, refund/cancellation promises, support SLA, or customer pricing. Reconcile after #1177. |
| `#1182` | Stripe integration | Open. TEST and LIVE provider inventories were separated; live billing remains OFF. Live Pro/Therapist pricing evidence existed, but live Portal/webhook authority was absent at the recorded snapshot. | Provider-side state is mutable. Re-read before any action. Do not create TEST webhooks against production or infer a live Founder price from a TEST smoke price. |
| `#1183` | Credential/deployment documentation | Open. Removes long-lived Firebase credential guidance and stale local production-deploy instructions; aligns source toward short-lived WIF/managed identity. | Source/docs hardening is not provider-side IAM/revocation/deployment proof. Reconcile after Gold Master if needed. |
| `#1181` | Deployed-SHA smoke authority | Open. Binds post-deploy/custom-domain smoke to explicit canonical deployed SHA. | Visual + governance + review still separate. |
| `#1180` | Asset authority | Draft/open. Hardens governed-asset ownership and prevents historical/non-authoritative receipts from promoting current assets. | Workflow success called “promotion” is not automatically production asset approval. #1177 visual acceptance remains upstream. |
| `#1179` | Public identity / legal-evidence boundary | Open. Records first-party identity/disambiguation and direct state-record evidence. | Legal/entity status does not authorize fundraising, tax-exempt claims, IP chain-of-title claims, or provider authority beyond verified evidence. |
| `#1178` | Intelligence evaluation | Draft/open. Deterministic synthetic P0 evaluation control plane exists. | Synthetic green is not provider/model semantic certification. Provider/version/config-bound evaluation + independent review still required. |
| `#1172` | Replay transition enforcement | Draft/open. Makes existing transition authority mandatory in focused CI/docs. | Does not by itself visually certify Replay or create duplicate transition media. |

### Closed/rejected work to avoid resurrecting by accident

- PR `#1187` authentication/signup repair was closed unmerged. Do not assume its source is on main.
- PRs `#1184` / `#1185` public-authority cleanup attempts were closed unmerged after scope review found unsafe reversions.
- Earlier visual Home candidates and terrestrial Life Map versions are provenance/history, not current visual acceptance.

---

## 7. Route-compatibility work in #1195

The active compatibility lane currently intends these public behaviors:

- `/login` — Firebase-backed identity entry.
- `/signup` — compatibility redirect to `/login?from=signup`.
- `/onboarding` — redirect to `/home?onboarding=1`.
- `/settings/privacy` — redirect to `/privacy-controls?from=settings-privacy`.
- `/waitlist` — fail closed to `/status?from=waitlist`.
- `/system` — redirect to `/status?from=system`.
- `/support` — noindex/fail-closed surface when no support path is legitimately published on that lineage.

The same lane also carries important Home/Life Map runtime repairs:

- bounded direct-Life-Map selection repair rather than unbounded document mutation;
- a more narrowly scoped MutationObserver around actual Life Map mode/child changes;
- Home→Life Map provenance carrying `from=home-sky`, `entryPortal=home-sky`, and `cameraCheckpoint=home-sky-ascent-complete`;
- real Sacred Home spawn/telemetry ownership and exact `embodied-third-person` camera marker;
- preservation of one authored physical Orb with a transparent accessible hit target rather than duplicate visible ownership.

Because #1177 has advanced after #1195's older body text, **the next action is reconciliation, not blind merge.**

---

## 8. Asset, renderer, accessibility, and recovery truth

Durable constraints from the recent convergence:

- Authored GLB/asset candidates are governed through explicit asset authority rather than “file exists = production.”
- Home has used authored chamber/Orb/portal assets and real Orb animation clips in the convergence lineage.
- Focus has an authored memory-chamber asset path in the convergence lineage.
- MakeHuman V4 human presence was wired into Home/Council lineage, but art-lock details and visual acceptance remain evidence-driven.
- Adaptive quality, reduced motion, hidden/inactive rendering behavior, WebGL recovery, semantic fallback, software-renderer handling, and performance budgets are first-class release contracts.
- On software rendering, Life Map/route handoff work has historically been repaired specifically to avoid starving transitions; do not remove those safeguards casually while simplifying visuals.
- Accessibility proof should validate the current semantic behavior, not stale implementation literals. Do not weaken Axe/contrast/focus/target thresholds to preserve an obsolete test string.

---

## 9. Security / credentials / provider boundaries

Merged WIF/credential-canon work established an important source policy:

- protected cloud identity should use GitHub OIDC / Workload Identity Federation / short-lived ADC where applicable;
- do not reintroduce long-lived Firebase/GCP service-account JSON or token fallback as the normal deployment authority;
- source proof of WIF wiring does **not** establish provider-side IAM correctness, historical-key revocation, least privilege, runtime deployment, or rollback by itself.

Provider work must remain mode- and environment-separated. In particular:

- TEST evidence cannot authorize LIVE billing.
- LIVE catalog existence does not mean live billing is active or the application is deployed/configured to charge.
- Webhook and Billing Portal state must be read from the provider before mutation.
- A provider write must be authorized by the connected account/permission boundary; do not work around missing permission with guessed secrets or long-lived credentials.
- Production API/provider claims require actual exact-runtime readback, not source expectation.

---

## 10. Public identity / corporate truth boundary

PR `#1179` records the following evidence boundary. Reverify current government records before making consequential claims:

- **URAI LABS LLC:** direct Wyoming evidence recorded it as active/current and in good standing at that snapshot.
- **URAI IP Holdings LLC:** direct Wyoming evidence recorded it as active/current and in good standing at that snapshot.
- **URAI Foundation:** Texas evidence recorded the nonprofit corporation as **involuntarily terminated effective April 28, 2026** at that snapshot.

Therefore:

- do **not** represent URAI Foundation as currently active, tax-exempt, 501(c)(3), donation-deductible, or fundraising-authorized based solely on historical formation;
- LLC good standing does not by itself establish EIN, operating agreement, ownership/control, signatory authority, or complete IP chain of title;
- public identity/disambiguation work does not authorize legal, securities, fundraising, or tax claims outside its evidence.

---

## 11. Intelligence / semantic-evaluation truth

The repository contains a fail-closed intelligence release-evaluation control plane and synthetic P0 corpus work. This is useful engineering evidence but has a strict boundary:

- deterministic/synthetic suites can prove the evaluator and committed synthetic expectations;
- they do **not** prove the real external model/provider/version has acceptable semantic quality;
- provider-backed evaluation must bind exact model/provider/version/configuration, exact Git SHA, timestamps, outputs/receipts as permitted, hashes, scores, and appropriate independent technical/safety/privacy review;
- no real-user sensitive memory should be introduced merely to make evaluation more realistic.

---

## 12. What is actually left in the active Spatial release lane

For #1177 / current Gold Master candidate, the work is no longer “invent the product.” The immediate release sequence is evidence/convergence work:

1. Re-fetch the **actual current #1177 head**. At this document snapshot it is `28500d4c...`; do not assume that later.
2. Verify the exact successor tree contains the intended cosmic/no-ground Life Map and the latest intended Home/Ground/Focus/Replay ownership.
3. Run/observe the complete applicable exact-head technical matrix.
4. Capture the required desktop/mobile/reduced-motion/fallback visual matrix from the same unchanged head.
5. Literally inspect the retained pixels. Reject anything that visually violates canon even if the workflow is green.
6. Obtain the legitimate independent exact-head review/governance evidence required by the repository policy. Do not transfer predecessor approval.
7. Merge only the unchanged accepted expected head under current repository governance.
8. Protected-deploy that resulting canonical main SHA through the authorized release path.
9. Prove live custom-domain parity/fingerprints/deployed SHA and rollback from the actual runtime.
10. Then restack/reconcile release-dependent children such as #1195 and #1193 onto the accepted authority, rerunning their own exact-head evidence.

Until that closes, phrases such as “Gold Master accepted,” “new cosmic build is live,” or “production is on the #1177 head” are unsupported.

---

## 13. Work order across the other recent lanes

After or in parallel with the Spatial acceptance lane—without editing the same branch—another AI can safely continue:

1. **Route compatibility (#1195):** restack on frozen Gold Master, preserve route truth, Home provenance, Orb accessibility, direct-arrival behavior; earn new exact-head browser/pixels/review.
2. **Discovery (#1193):** restack robots/sitemap after Gold Master freeze; then handle Search Console property ownership/verification separately.
3. **Deployment security (#1183 / #1181):** converge short-lived identity guidance and explicit deployed-SHA smoke onto current main without weakening protected runtime proof.
4. **Assets (#1180):** reconcile governed asset authority against final accepted visual owners; do not promote from historical receipts.
5. **Commerce / Stripe (#1188 / #1182):** keep live billing off until website terms, provider configuration, exact dynamic runtime, webhooks/portal, secrets, E2E, monitoring/recovery, rollback, and applicable review are proven.
6. **Public/legal (#1179):** preserve evidence classes and do not overstate entity, foundation, fundraising, or IP authority.
7. **Intelligence (#1178):** add real provider/model evaluation only with exact provenance and appropriate privacy/safety controls.
8. **Replay transition (#1172):** reconcile source/enforcement changes if still needed after accepted main, preserving current Replay runtime semantics.

---

## 14. Existing older handoff material

`docs/founder-readiness/AUDIT_AND_HANDOFF.md` is useful historical structure but its snapshot is from **July 10, 2026** and is not current enough to drive September release decisions by itself.

Other useful repository references include current release checklists, source-of-truth locks, evidence/receipt ledgers, asset manifests, and PR-specific receipts. Their dates and exact SHAs matter; filenames alone are not authority.

This file is intentionally named `CHATGPT_HANDOFF.md` at repository root so a future AI session can find the catch-up entry point quickly.

---

## 15. Suggested bootstrap prompt for the next ChatGPT

Use this as the first instruction in a new session:

```text
Work from LifeLoggerAI/urai-spatial.

Read CHATGPT_HANDOFF.md first. Then re-fetch current main and the live heads/bodies/checks for PRs #1177, #1195 and #1193, plus any lane you intend to edit. Treat live GitHub refs as authoritative if a PR description contains an older SHA. Do not transfer predecessor CI, review, pixels, deployment, governance or provider evidence to a successor.

Before changing anything, state the actual current authority:
- main SHA
- current #1177 head
- whether #1177 is merged/deployed/visually accepted
- current production deployed SHA if independently verified
- exact lane you will own

Preserve this product canon:
- Home and Ground may be physically grounded/terrestrial.
- Life Map is a cosmic personal universe: deep starfield, galaxy, memory stars, constellations, nebula/emotional-weather fields, and NO continuous ground/floor/terrestrial horizon owner.
- Selected memory remains celestial inside Life Map until crossing into Focus or Replay.
- Focus is the selected living-memory chamber.
- Replay preserves selected-memory continuity and its privacy/persistence/audit contracts.
- The authored physical Orb belongs to Home; do not introduce a duplicate Life Map Orb control.

Do not weaken accessibility, privacy, reduced motion, performance, fallback/recovery, security, exact-head, review or governance gates. Work autonomously within the connected permissions, but fail closed at genuine provider/human/legal/authorization boundaries and continue other independent lanes instead of fabricating receipts.
```

---

## 16. Required completion report from future AI sessions

Every meaningful session should leave enough evidence for the next one to recover state. Return at minimum:

```text
Repository:
Lane:
Base branch/SHA:
Final branch/SHA:
Files changed:
PR/issue numbers:
Exact checks run:
Checks passed:
Checks failed/cancelled/not run and why:
Visual captures inspected literally:
Provider mutations performed (if any):
Deployment performed (if any):
Live deployed SHA independently verified:
New claims actually enabled by evidence:
Claims still blocked:
Open blockers:
Required next exact action:
```

If a branch moves after this report, mark the report predecessor-only rather than pretending its evidence transferred.

---

## Bottom line at this snapshot

URAI Spatial is in an advanced convergence/certification phase, not an early prototype phase. The recent pass materially corrected the Life Map back to its intended **cosmic, no-ground personal-universe canon** and continued to strengthen Focus and the cross-world composition. The active #1177 branch has advanced beyond the exact SHA named in its PR body, so any next agent must begin by re-fetching the live head. The new cosmic successor is **not yet entitled to a Gold-Master/live-production claim** until fresh unchanged-head evidence, literal pixel acceptance, legitimate governance/review, merge, protected deployment, and live verification close.

Keep the architecture. Keep the truth boundaries. Finish against the real current head, not the story left behind by an older one.
