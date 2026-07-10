# Launch, QA, and Beta Plan

## Objective

Move URAI from a substantial fallback/demo spatial experience to a narrow, claim-safe public beta without confusing source implementation with production proof.

## Public-beta definition

A public beta is ready only when:

- One exact commit is approved, built, deployed, and recorded.
- A distinct rollback commit and command are recorded before deployment.
- The canonical workflow produces immutable verification and deployment receipts.
- Home, Ground, Life Map, Focus, Replay, Mirror, Passport, Status, and Privacy Controls match source on the public domain.
- Slash and query variants preserve route identity.
- Desktop and mobile screenshots are reviewed.
- No private data appears in the demo.
- Authentication and user/tenant isolation are proven for every enabled real-user data path.
- Export, deletion, revocation, and closed-by-default permissions work for every enabled data class.
- Public copy matches the evidence ledger.
- Monitoring and rollback ownership are assigned.

Provider-backed assets, XR, wearables, body signals, and broader versions remain separately gated and do not need to block a narrow V1 beta when they are clearly disabled and not claimed.

## Launch sequence

### Gate 1 — Freeze the candidate

- Select one commit on `main`.
- Stop unrelated launch-surface changes.
- Record the candidate SHA.
- Record a tested rollback ancestor.
- Confirm one production deployment authority.

### Gate 2 — Verify source

Run from the canonical runtime root using the repository-prescribed commands:

- Frozen dependency installation.
- Typecheck.
- Unit and integration tests.
- Privacy and ownership tests.
- Accessibility and reduced-motion checks.
- Normal and static builds.
- Route exposure and query-parity audits.
- Tier 1 and Tier 5 verification.
- Performance-budget audit.

Attach exact output to the release receipt. A green local run is not a substitute for the canonical workflow artifact.

### Gate 3 — Review visual and interaction quality

Review at minimum:

- Desktop Chrome.
- Desktop Safari or Firefox where supported.
- Current iPhone-sized viewport.
- Current Android-sized viewport.
- Reduced-motion mode.
- Low-performance or fallback mode.
- Slow network and failed-asset behavior.
- Keyboard-only navigation.
- Screen-reader naming for critical controls.

### Gate 4 — Deploy and prove

- Deploy only the exact approved SHA.
- Record Firebase project and domain.
- Verify public markup or metadata identifies the deployed SHA.
- Run live route, slash, query, missing-resource, console-error, and interaction smoke.
- Capture desktop and mobile screenshots.
- Confirm the Status page reports the same receipt truth.
- Rehearse or verify the rollback command.

### Gate 5 — Beta operations

- Publish the beta disclosure.
- Open feedback and support channels.
- Assign incident owner and backup owner.
- Review analytics for privacy-safe events only.
- Hold a daily launch review during the first week.
- Do not expand claims because a route is reachable.

## Route QA matrix

| Route | Primary purpose | Must prove | Critical failure |
| --- | --- | --- | --- |
| `/` | Entry threshold | Correct owner, stable first load, no stale shell | Wrong product root or blank screen |
| `/home` | Canonical spatial home | Rendering, fallback, navigation | Legacy owner or unusable mobile load |
| `/ground` | Operating world | Human-approved framing, safe fallback | Autonomous-action implication |
| `/life-map` | Spatial memory map | Sample-data disclosure, selection works | Private data or false persistence claim |
| `/focus` | Selected memory chamber | Query identity preserved | Wrong memory, stale shell, unsafe reflected input |
| `/replay` | Memory film | Return path and query preserved | Source/AI boundary obscured |
| `/mirror` | Reflection | Non-diagnostic copy | Medical or certainty claim |
| `/passport` | Permission and identity UX | Closed layers stay closed | Permission bypass |
| `/privacy-controls` | Dedicated controls | Correct fingerprint and controls | Home content served instead |
| `/status` | Evidence control room | Exact claim boundaries and receipt identity | Claims certification without receipts |
| `/demo` | Public walkthrough | Sample data only | Private state or unsupported claim |
| `/spatial/ar-vr` | XR preview | Preview label and safe fallback | Device-certified claim without proof |

## Beta cohort design

Start with 15-30 testers in three groups:

1. **Clarity testers** — people with no prior URAI context. Measure whether they understand the product after one journey.
2. **Use-case testers** — people with a specific memory, caregiving, creative, founder, veteran, education, or legacy use case.
3. **Trust testers** — privacy, accessibility, safety, security, and product experts asked to challenge the permission model.

Do not mix broad public acquisition with unresolved high-risk data collection.

## Tester instructions

> You are testing an early URAI spatial web experience. The current beta may use sample data and fallback visuals. Please do not enter highly sensitive personal, medical, legal, financial, biometric, or third-party information unless the test instructions explicitly authorize it. Focus on whether the journey is understandable, emotionally appropriate, controllable, and technically reliable.

Ask each tester to complete:

1. Enter Home.
2. Find Life Map without coaching.
3. Select one memory or chapter.
4. Move into Focus.
5. Enter Replay and return.
6. Find Passport or Privacy Controls.
7. Explain in their own words what URAI is.
8. Identify what they believe is real, simulated, inferred, or still being built.

## Feedback form

### Understanding

- In one sentence, what do you think URAI is?
- Which route or moment made the concept clear?
- What felt confusing or overpromised?

### Value

- Which problem would URAI solve for you?
- Which part would bring you back next week?
- What would you never use?

### Trust

- Did you understand what data the system could access?
- Did you know when sample data was being used?
- Did anything feel diagnostic, invasive, manipulative, or overly certain?
- What control was missing?

### Experience

- Where did you hesitate or get lost?
- Did motion, audio, text, or visual density cause discomfort?
- Did the product work on your device and connection?

### Commitment

- Would you test again?
- Would you invite one trusted person?
- Would you join a paid or sponsored pilot when the stated use case is ready?

## Bug severity model

### P0 — Stop launch

- Private or cross-user data exposure.
- Authentication or Passport bypass.
- Public write/read permissions that expose user information.
- Wrong production deployment or unknown deployed SHA.
- Core route consistently broken.
- No rollback path.
- Medical, legal, safety, or investment copy creating immediate material risk.

### P1 — Fix before expanding beta

- Focus/Replay identity loss.
- Mobile journey unusable.
- Frequent blank canvas or unrecoverable WebGL failure.
- Sample-data disclosure missing.
- Status or Privacy Controls drift.
- Serious accessibility blocker.
- Data deletion, export, or revocation failure for enabled real-user data.

### P2 — Schedule promptly

- Visual mismatch, confusing copy, intermittent transition issue, non-critical performance regression, or feedback-flow failure.

### P3 — Backlog

- Cosmetic polish, optional animation, non-blocking enhancement, or future-version request.

## Beta metrics

Use privacy-safe, minimal events:

- Successful Home load.
- First spatial frame.
- Life Map reached.
- Memory selected.
- Focus reached.
- Replay reached and returned.
- Passport or Privacy Controls opened.
- Session completed without fatal error.
- Voluntary feedback submitted.

Do not treat raw page views as proof of product value. The first meaningful indicators are journey completion, return intent, trust comprehension, and repeated use for a defined purpose.

## Go/no-go meeting template

- Candidate SHA:
- Rollback SHA:
- Verification receipt:
- Deployment receipt:
- Live smoke receipt:
- Open P0 issues:
- Open P1 issues:
- Privacy owner decision:
- Accessibility owner decision:
- Product owner decision:
- Operations owner decision:
- Final decision: `GO`, `LIMITED GO`, or `NO-GO`
- Exact public claims approved for this release:
- Capabilities explicitly disabled or not claimed:
