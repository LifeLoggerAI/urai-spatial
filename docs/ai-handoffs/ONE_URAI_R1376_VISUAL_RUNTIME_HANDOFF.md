# ONE URAI Genesis — R1376 Visual Runtime Handoff

**Audience:** future Chalk, Codex, Council, visual-certification, integration, release, and security workers  
**Repository:** `LifeLoggerAI/urai-spatial`  
**Visual PR:** #2113 — `R1371: AAA runtime visual convergence — Home, Life Map, Ground`  
**Visual branch:** `visual/r1371-aaa-runtime-convergence`  
**Exact certified visual candidate SHA:** `47336d9dd16cda90a2cb54fd332b0278688adb84`  
**Visual PR base at handoff time:** `main@da94837c2457b0a7590e26a7a644cd728de8afb8`  
**PR state at handoff time:** draft, mergeable  
**Documentation date:** 2026-11-16 America/Chicago / 2026-11-17 UTC

> This document is intentionally stored on a separate documentation branch so creating the handoff does **not** mutate the exact visual candidate SHA above.

---

## 1. Mission that produced R1376

The visual mission was not to create another mockup or another isolated asset. It was to make the **actual served ONE URAI Genesis runtime** use the strongest existing cinematic assets, models, pixels, and 3D interaction systems already present in the repository.

The acceptance method was changed from “builds/tests look green” to:

1. identify the actual visual owner for each canonical world;
2. inspect the live Vercel runtime;
3. compare the served pixels against the strongest shipped art already in the repo;
4. fix the visual owner/compositing path rather than rebuilding the product;
5. preserve live navigation, interaction geometry, Orb behavior, accessibility, privacy/truth contracts, and canonical world transitions;
6. deploy an exact locked SHA to protected Vercel;
7. capture the live runtime on desktop/mobile;
8. do not call a visual state complete merely because CI/builds pass.

The result is a **cinematic-hybrid runtime**: high-quality cinematic art owns the visible environment where the prior 3D shell looked prototype-grade, while real 3D interaction/navigation systems continue to run underneath or above it.

---

## 2. Current exact state

### Canonical visual candidate

`47336d9dd16cda90a2cb54fd332b0278688adb84`

PR: https://github.com/LifeLoggerAI/urai-spatial/pull/2113

The branch must be treated as an exact visual candidate. Before doing new work, fetch PR #2113 and verify whether its head is still this SHA. If it moved, do not assume the R1376 evidence applies to the new head.

### Protected Vercel review deployment

Deployment ID: `dpl_8AtV2LpyhCoqwS8SE926t2ioFdEQ`  
Protected host: `urai-genesis-private-app-review-r1193-5zxi1179b.vercel.app`  
Exact deployed SHA: `47336d9dd16cda90a2cb54fd332b0278688adb84`  
Vercel state: **READY**

Vercel source-lock receipt included:

```text
R1376_SOURCE_LOCK
repository=LifeLoggerAI/urai-spatial
sourceSha=47336d9dd16cda90a2cb54fd332b0278688adb84
productionAuthorized=false
privateMemoryWrites=DISABLED
```

The Vercel share token is temporary and must not be treated as durable documentation. Future workers should use the Vercel connector to generate a fresh protected share URL for this deployment or for a newly locked candidate.

### Existing PR receipt

A live visual-runtime receipt was pinned to PR #2113 as issue/PR comment ID `6938509178`.

---

## 3. What the actual runtime looks like at R1376

### Home

**Status:** materially upgraded; first serious AAA visual candidate.

Visible presentation is now the cinematic Home environment, with the live Orb and real navigation/threshold logic retained.

Desktop verified:
- cinematic memory architecture visible;
- live Orb visible and interactive;
- onboarding UI subordinate to the world;
- Canvas present;
- `data-home-assets-ready=true`;
- zero page errors in the certification capture.

Mobile verified:
- mobile-specific cinematic Home artwork visible;
- live Orb visible;
- first-run card fits without dominating the frame;
- Canvas present;
- `data-home-assets-ready=true`;
- zero page errors in the certification capture.

Primary Home art:
- `/assets/urai/home/home-threshold-main.webp`
- `/assets/urai/home/home-threshold-mobile.webp`
- `/assets/urai/home/home-sky-ascent.webp`
- `/assets/urai/home/home-ground-portal.webp`

Live/retained 3D assets:
- `/assets/urai/generated/models/home-entry-chamber-v1.glb`
- `/assets/urai/generated/models/urai-orb-avatar-v1.glb`
- `/assets/urai/home-production/cc0/polyhaven-fern-02-geometry-v1.glb`

Important: the weak prototype-looking Home geometry is still useful for navigation, thresholds, collision, readiness, and canonical interaction, but much of it is intentionally **not visible** in the cinematic presentation.

### Ground

**Status:** materially upgraded; premium cinematic infrastructure is the visible world.

Primary visible art:
- `/assets/urai/ground/ground-world-main.webp`
- `/assets/urai/ground/ground-world-mobile.webp`

Retained live model:
- `/assets/urai/generated/models/ground-world-terrain-v1.glb`

The GLB still provides authored destination/navigation structure, thresholds, model semantics, and interaction. The weak visible shell is suppressed.

Ground was visually verified in a clean browser at roughly 2.5 seconds after navigation and remained stable. Canvas and live navigation remained present.

### Life Map

**Status:** retained canonical cosmic owner.

The signed-out/default Life Map shows the cinematic stellar universe and explicitly states that no personal data is displayed. It does **not** mount private memories for a signed-out user.

Live certification capture:
- Canvas present;
- zero page errors.

### Focus

**Status:** retained canonical stellar Memory Star owner.

Signed-out/default Focus shows a neutral Memory Star field and asks the user to choose a memory from Life Map. It does not fabricate personal memory content.

Live certification capture:
- Canvas present;
- zero page errors.

### Replay

**Status:** visually sparse in the no-memory state by design; truth contract preserved.

When no memory is selected, Replay shows the neutral memory horizon and a “Choose a memory” affordance. This is intentionally less visually dense than Home/Ground.

Do **not** inject `replay-memory-film-main.webp` into the no-memory state merely to make it prettier. Replay distinguishes:
- disclosed demonstration content,
- real recorded source in original framing,
- neutral/no-source state.

The shipped Replay cinematic assets are:
- `/assets/urai/replay/replay-memory-film-main.webp`
- `/assets/urai/replay/replay-memory-film-mobile.webp`
- `/assets/urai/replay/replay-memory-film-fallback.svg`

They may be used only through the existing truthful admission rules. The current contract specifically prevents a generic cinematic image from masquerading as somebody’s real memory.

Live certification capture:
- Canvas present;
- zero page errors.

---

## 4. R1374 → R1376 implementation chronology

The pre-R1374 branch parent was:
`2c24cc0ac3f381a5aae303e1fc6de31c55ba9412`

### R1374 — make the strong art the actual visible runtime

`9a7f0e9b77c09f039a3c8b1fbe7a138171da3371`  
**R1374: make cinematic Home art the visible environment while preserving live 3D interaction**

Key change:
- Home cinematic art introduced as the visible environment.
- prototype-looking authored terrain/path/vegetation/pavilion/water/horizon elements visually suppressed where appropriate;
- live Orb, navigation surface, thresholds, transitions, collision, and readiness preserved;
- Home Canvas changed to support cinematic backdrop compositing.

`8720c43dfe9fce3a0ad8b4dbe33ad8e021219390`  
**R1374: make cinematic Ground art the visible world while preserving live 3D destinations**

Key change:
- Ground cinematic environment introduced;
- authored GLB retained for destination/navigation semantics.

`2fe4a0db375b024f95287e1843b9d70d3b849f41`  
**R1374: reduce onboarding chrome so cinematic worlds remain visually dominant**

Key change:
- first-run card reduced in size/visual weight.

`55df2b41a51ce98c626fc1cc178f350993f0ac67`  
**R1374: preserve opaque Ground renderer while using cinematic runtime background**

Key lesson:
- Ground's contract requires `gl={{ ... alpha:false }}`.
- A DOM image behind a transparent Canvas was the wrong architecture for Ground.
- Correct solution: load the cinematic Ground image as a WebGL background texture inside the existing opaque renderer.

`4614aa3aab40395e6efc1da3e0c5d07576c49741`  
**R1374: retain Ground canonical fallback background under cinematic texture**

Key lesson:
- keep the canonical `#102b38` fallback background even though the cinematic texture normally owns the visible frame.

`c34407ce9705b84dc8f646f28e43059f53047328`  
**R1374: preserve canonical Ground fog and fallback color under cinematic background**

This was the first combined R1374 exact-head candidate that passed:
- typecheck;
- focused visual/canon contracts;
- production build;
- 146/146 static pages;
- Vercel exact-source review deployment.

R1374 Vercel deployment:
- `dpl_8vUDwGCA5n5PCkBFBC8H1LefpZvC`
- host `urai-genesis-private-app-review-r1193-7o64uv8lx.vercel.app`

At this point Ground looked dramatically better, but Home still rendered as a dark/teal field because of a separate CSS compositing defect.

### R1375 — remove the Home canvas veil

`d9bab7d1c258583e8e9b8229a2abe83920041326`  
**R1375: remove opaque Home canvas veil so cinematic environment is visible**

Root cause:
- `HomeWorldProduction.module.css` painted an opaque gradient directly on the Canvas element.
- The hero art was correctly mounted behind it, but the CSS Canvas background completely covered it.

Fix:
- make the Home Canvas background transparent on desktop and mobile.

This changed the live Home from a dark empty field into the intended photoreal memory architecture with the live Orb.

R1375 Vercel deployment:
- `dpl_5XNEXH5Ztv1JhffrnF7AakY6PoRh`
- host `urai-genesis-private-app-review-r1193-5g7uh7s7e.vercel.app`

### R1376 — visual alignment and UI restraint without breaking canonical interaction geometry

`9a3d779e902640dc6e788c83fb2dea48099cad7d`  
**R1376: align live Orb with cinematic Home focal point and lift image grade**

Initial approach changed the Orb's canonical position. The canon contract correctly rejected that.

`e6cc4d7e14d1e1284274c2645e2860aebcfeb99d`  
**R1376: reduce first-run guidance to restrained glass control**

Key change:
- hide the onboarding card image;
- reduce card width;
- keep guidance present but subordinate to the scene.

`47336d9dd16cda90a2cb54fd332b0278688adb84`  
**R1376: preserve canonical Orb anchor with render-only cinematic alignment**

Final solution:
- restore the canonical interaction/telemetry anchor:
  `const ORB = new THREE.Vector3(0, 0.82, -4.25)`
- add:
  `const ORB_VISUAL_Y = ORB.y - .48`
- use the render-only Y offset for the visible Orb root while leaving canonical interaction geometry unchanged.

This is the current visual candidate.

---

## 5. Critical do-not-regress invariants

### Home Orb

Do not change the canonical Orb anchor casually:

```ts
const ORB = new THREE.Vector3(0, 0.82, -4.25)
```

Tests and telemetry/navigation proof depend on it.

If the visible Orb needs visual alignment, use a render-only offset such as the existing:

```ts
const ORB_VISUAL_Y = ORB.y - .48
```

Do not “fix” the pixel by moving the canonical interaction coordinate again.

### Home Canvas

`HomeWorldProduction.module.css` must not reintroduce an opaque Canvas background.

An opaque gradient on `.canvas` was the exact defect that hid the cinematic hero art.

The visible Home artwork belongs behind/through the Canvas composition; the Canvas CSS background must remain transparent for this hybrid architecture.

### Ground Canvas

Ground is the opposite of Home at the renderer level.

Ground's contract requires:
- `alpha:false`;
- canonical fallback `#102b38`;
- canonical fog `#173843, 0.012`;
- existing exposure/camera invariants.

Do not change Ground to a transparent Canvas just to place a DOM image underneath it.

Correct architecture:
- keep opaque WebGL renderer;
- load cinematic image using `useTexture`;
- attach it as the scene background;
- keep fallback background/fog in the scene graph;
- keep the GLB/nav graph live even when its visible geometry is suppressed.

### Replay truth

Do not fill the no-memory Replay state with a beautiful “memory” image unless the source is admitted as a disclosed demo or a real recorded source under the current replay admission rules.

Visual quality cannot override provenance/truth.

### Signed-out/default experience

A signed-out user must be able to see the visual language without seeing somebody else's private data.

Current default behavior:
- Home: generic cinematic environment;
- Ground: generic cinematic infrastructure;
- Life Map: signed-out empty universe / no personal data displayed;
- Focus: neutral stellar field;
- Replay: neutral no-memory horizon.

Do not use Adam's private memory data as the default visual fixture merely to make public/signed-out views look populated.

### Production authorization

This visual work did not authorize production.

Do not infer production approval from:
- Vercel READY;
- visual quality;
- passing typecheck;
- passing visual contracts;
- 146/146 static generation.

The exact Vercel source-lock metadata explicitly recorded:
- `productionAuthorized=false`
- `privateMemoryWrites=DISABLED`

Security/privacy/release certification remains a separate gate.

---

## 6. Exact validation evidence for R1376

Exact head:
`47336d9dd16cda90a2cb54fd332b0278688adb84`

### Local isolated certification worker

Runpod Pod:
- ID: `zcw6lzr1q9kbw1`
- name: `urai-r1333-visual-certification-isolated`
- CPU worker, no GPU required for these browser/build checks
- listed cost while running: $0.16/hr
- **status after certification: EXITED**

Do not restart it unless needed; it was intentionally stopped after proof to avoid unnecessary spend.

### Gates

Typecheck:
```text
PASS
```

Focused contracts:
```bash
node --test   tests/home-ground-lifemap-art-bible-contract.test.mjs   tests/embodied-exploration-contract.test.mjs   tests/continuous-spatial-restoration-contract.test.mjs
```

Result:
```text
PASS
```

Production build:
```bash
NEXT_PUBLIC_URAI_BUILD_SHA=47336d9dd16cda90a2cb54fd332b0278688adb84 pnpm --dir urai-tier1 build
```

Result:
- optimized build PASS;
- static generation **146/146**;
- only the already-seen protobuf dynamic dependency warning / ESLint plugin warning remained;
- no build failure.

### Protected Vercel proof

Deployment:
`dpl_8AtV2LpyhCoqwS8SE926t2ioFdEQ`

Vercel:
- exact source lock confirmed;
- production build completed;
- output deployed;
- final state **READY**.

### Live browser proof

Exact R1376 protected runtime was opened in Playwright.

Home desktop:
- Canvas present;
- `data-home-assets-ready=true`;
- zero page errors;
- cinematic Home art visible;
- live Orb visible.

Home mobile (390×844):
- Canvas present;
- `data-home-assets-ready=true`;
- zero page errors;
- mobile cinematic Home visible;
- live Orb visible;
- first-run glass guidance fits.

Life Map:
- Canvas present;
- zero page errors.

Focus:
- Canvas present;
- zero page errors.

Replay:
- Canvas present;
- zero page errors.

Ground:
- Canvas present;
- `data-ground-ready=true` in the earlier exact-head capture;
- zero page errors;
- clean-browser verification showed cinematic Ground visible by roughly 2.5 seconds and stable through later captures.

---

## 7. What failed during this run and why

Future workers should not repeat these dead ends.

### Failure: trusting green builds as visual acceptance

R1373 could build and run but Home/Ground still looked prototype-grade.

Lesson:
**served pixels are the acceptance gate.**

### Failure: Home hero art mounted but invisible

Symptom:
- live Home looked like an empty dark teal field with a floating Orb.

Cause:
- opaque CSS gradient on the Canvas element.

Fix:
- transparent Home Canvas CSS.

### Failure: transparent Ground Canvas approach

Attempt:
- place cinematic DOM image under Ground Canvas and make Canvas alpha transparent.

Why rejected:
- Ground canon explicitly requires `alpha:false`;
- the renderer architecture is intentionally opaque.

Correct fix:
- put cinematic image inside WebGL as the scene background texture.

### Failure: moving canonical Orb coordinate to match artwork

Attempt:
- moved `ORB.y` to visually align the live Orb with the hero art.

Why rejected:
- continuous spatial restoration contract requires the canonical Orb geometry marker;
- telemetry/navigation semantics depend on that anchor.

Correct fix:
- restore canonical Orb position;
- apply a render-only offset.

### Apparent failure: one dark Ground screenshot in a multi-route sweep

A single fast multi-route capture showed the fallback shell.

Clean-browser retest at approximately 2.5s / 6s / 9.5s showed the cinematic Ground art present and stable with zero page errors.

Treat this as a capture/load race unless reproducible in a clean browser. Do not immediately rewrite Ground because one compressed sweep frame is dark.

---

## 8. Files that own the important behavior

### Home
- `urai-tier1/src/spatial/layout/HomeWorldProductionPolished.tsx`
- `urai-tier1/src/spatial/layout/HomeWorldProduction.module.css`

### Ground
- `urai-tier1/src/app/GroundSpatialWorldClean.tsx`
- `urai-tier1/src/app/ground/GroundWorldModel.ts`

### First-run visual chrome
- `urai-tier1/src/app/v2-onboarding.css`

### Replay truth/visual admission
- `urai-tier1/src/app/replay/CinematicReplayClient.tsx`
- `urai-tier1/src/app/replay/replayVisualAdmission.ts`
- `urai-tier1/src/app/replay/ReplayRecordedSource.tsx`

### Key visual/canon tests
- `urai-tier1/tests/home-ground-lifemap-art-bible-contract.test.mjs`
- `urai-tier1/tests/embodied-exploration-contract.test.mjs`
- `urai-tier1/tests/continuous-spatial-restoration-contract.test.mjs`
- `urai-tier1/tests/replay-spatial-memory-theater-contract.test.mjs`

---

## 9. Visual architecture decision

The important architectural conclusion from this work is:

**Do not force every high-quality visual into literal real-time modeled geometry if the existing runtime geometry is useful for navigation but visibly weak.**

For ONE URAI Genesis, the current successful pattern is:

```text
Cinematic authored art
        ↓
visible environment / visual backbone
        +
live WebGL Orb / particles / transitions / effects
        +
invisible or visually suppressed authored 3D navigation geometry
        +
real thresholds / collision / travel / readiness / accessibility
        =
cinematic-hybrid runtime
```

This let the product use its strongest existing visual assets immediately without throwing away working spatial engineering.

Do not rebuild assets merely because they exist in different forms. First ask:
- Is there already stronger art in `public/assets/urai/*`?
- Is the bad-looking object actually needed for interaction rather than visibility?
- Can the runtime retain its semantics while changing its visible owner?

---

## 10. Definition of done for the next visual worker

Before claiming a future visual revision is better than R1376:

1. fetch PR #2113 and record the exact head SHA;
2. do not overwrite another active worker's branch without reconciling;
3. run typecheck;
4. run the focused visual/canon tests;
5. run a production build;
6. exact-lock that same SHA into a protected preview deployment;
7. verify the Vercel source-lock event;
8. capture **actual served pixels**;
9. inspect Home desktop;
10. inspect Home mobile;
11. inspect Ground in a clean browser;
12. inspect Life Map;
13. inspect Focus;
14. inspect Replay;
15. record page errors and Canvas presence;
16. preserve signed-out privacy truth;
17. preserve Orb canonical geometry;
18. preserve Ground opaque renderer invariants;
19. do not promote production merely because the visual review is green;
20. stop disposable compute after evidence capture.

If a visual change cannot beat the R1376 served pixels without breaking the above invariants, do not merge it.

---

## 11. Current visual assessment

R1376 is the first candidate in this run that materially changes the actual experience from prototype-looking Home/Ground shells into a coherent premium cinematic presentation.

Current assessment:
- **Home:** strong cinematic candidate; desktop/mobile verified.
- **Ground:** strong cinematic candidate; verified.
- **Life Map:** retained, visually coherent.
- **Focus:** retained, visually coherent.
- **Replay:** intentionally sparse in no-memory state; truthful.
- **Signed-out default:** exists and does not require exposing personal data.
- **Technical visual gates:** green for the exact candidate.
- **Subjective AAA+++ artistic sign-off:** should remain a human visual acceptance decision, not something inferred from automated tests.

---

## 12. Immediate next-worker execution order

1. Open PR #2113.
2. Verify the head SHA.
3. Read this handoff before editing.
4. Recreate a fresh protected Vercel share link if the old token expired.
5. Look at the runtime before changing code.
6. If the user says the visuals hit the target, do not keep polishing for its own sake.
7. If the user identifies a visible shortfall, patch the actual visual owner responsible for that pixel.
8. Re-run exact-head proof.
9. Reconcile with other active workers before branch convergence.
10. Keep production/security/private-write authorization separate.

The goal is **ONE integrated UrAi Genesis**, not endless parallel visual experiments.

---

## 13. Durable references

Visual PR:
https://github.com/LifeLoggerAI/urai-spatial/pull/2113

Current exact candidate commit:
https://github.com/LifeLoggerAI/urai-spatial/commit/47336d9dd16cda90a2cb54fd332b0278688adb84

First R1374 cinematic Home commit:
https://github.com/LifeLoggerAI/urai-spatial/commit/9a7f0e9b77c09f039a3c8b1fbe7a138171da3371

Protected R1376 host:
https://urai-genesis-private-app-review-r1193-5zxi1179b.vercel.app

Remember: the protected host may require a newly generated Vercel share URL. Do not hard-code temporary share tokens into durable automation.

---

## 14. One-sentence worker handoff

**Resume from PR #2113 at exact visual candidate `47336d9dd16cda90a2cb54fd332b0278688adb84`; preserve the cinematic-hybrid Home/Ground architecture, canonical Orb and Ground contracts, signed-out privacy truth, and exact-head live-pixel certification process; do not regress to prototype-visible geometry or treat visual readiness as production authorization.**
