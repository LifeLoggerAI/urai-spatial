# URAI Tiered Implementation Prompt (Codex-Ready)

You are Codex operating inside the URAI repository. Your mission is to finish all remaining polish, complete missing implementation, and prepare URAI for a production-quality demo launch while preserving its core vision: passive, magical, emotionally intelligent, privacy-aware, visually simple, and launch-ready.

## Product context
URAI is a passive intelligent life-tracking app built with:
- FlutterFlow / Flutter
- Firebase (Auth, Firestore, Functions, Storage as applicable)
- React/TypeScript components where applicable
- AI enrichment systems (symbolic/emotional analysis, narrator insights, cognitive mirror, timeline playback, mood forecasts, relationship/social intelligence)
- Privacy controls, monetization/data marketplace concepts, polished magical UI experiences

## Non-negotiable execution rules
1. Inspect the repository first before editing anything.
2. Produce a concise implementation plan before major changes.
3. Prefer small, safe, incremental patches.
4. Do not delete major features unless clearly broken and unused.
5. Preserve current architecture unless a minimal safe refactor is required.
6. When uncertain, choose the safest production-ready implementation.
7. Add TODO comments only for genuine external dependencies/blockers.
8. Use wellness/supportive language; do not introduce unsafe medical or diagnostic claims.
9. Keep security/privacy-first defaults.
10. If something cannot be fully completed, leave a typed, documented, non-breaking stub.

## Tiered execution roadmap

### Tier 1 — Critical stability and launch blockers
- Fix all TypeScript/build/runtime errors.
- Resolve broken imports, duplicate types/interfaces, missing exports, stale references, and merge artifacts/conflicts.
- Verify Firebase config usage and environment variable handling (dev/prod safety, missing env fallbacks, no secrets hardcoded).
- Verify Firestore path consistency and security assumptions in client code.
- Ensure app boots cleanly in supported entrypoints.
- Add robust null-safe fallbacks for missing user/profile/passive data.
- Run install/lint/typecheck/test/build and capture exact results.

### Tier 2 — Core product completion
Complete end-to-end flows and screen readiness for:
- Home view
- Sky view
- Timeline
- Cognitive mirror
- Narrator insights
- Profile/settings
- Onboarding
- Privacy controls
- Dashboard/summary surfaces

Requirements:
- Correct Firestore read/write wiring for expected domain objects.
- Ensure passive data objects, enriched logs, mood states, relationship graph, rituals, insights, and timeline events render coherently.
- Add loading, empty, and error states for every critical async surface.
- Ensure auth/no-auth transitions are graceful and predictable.

### Tier 3 — UX polish and magical visual layer
- Improve UI consistency: spacing, type scale, card hierarchy, iconography consistency.
- Improve mobile responsiveness and interaction smoothness.
- Refine transitions/animations (subtle, premium, non-distracting).
- Polish aura/sky/constellation visuals and symbolic cards.
- Improve timeline interactions and narrator presentation quality.
- Remove clutter and over-explanation while preserving emotional richness.
- Add accessibility improvements (contrast, semantics/labels, focus/keyboard where relevant, reduced-motion fallback).

### Tier 4 — Intelligence, automation, and monetization polish
- Finalize insight generation hooks and data pipelines.
- Complete scheduled summary plumbing and mood forecast pipeline stubs.
- Tighten narrator prompt wiring and safe-output handling.
- Implement privacy-safe export scaffolding and consent flows.
- Finalize Pro tier feature gating logic and placeholder marketplace surfaces.
- Complete admin/review screens if present in repo structure.
- Ensure all unfinished pieces are explicitly typed, non-breaking, and documented inline.

### Tier 5 — Production readiness and demo launch
- Produce a final QA checklist in-repo.
- Add/refresh seed/demo data strategy where appropriate.
- Verify routing, auth states, permissions, Firestore rules expectations, and deployment assumptions.
- Update README with exact run/lint/test/build/demo steps.
- Add concise launch notes so a human can run one command sequence and view a polished demo.

## Implementation procedure (required order)

1. **Repository audit**
   - Map project structure, app entrypoints, feature modules, Firebase integration points, functions, and scripts.
   - Identify broken areas and missing pieces by scanning for TODO/FIXME/stubs and failing commands.

2. **Plan**
   - Provide a concise step-by-step implementation plan grouped by Tier 1→5.
   - Call out dependencies and risk hotspots.

3. **Execute**
   - Implement Tier 1 completely before Tier 2, etc.
   - Keep diffs focused and reversible.
   - For each tier, include:
     - What you changed
     - Why
     - Any assumptions

4. **Verification**
   - Run all available relevant checks:
     - install
     - lint
     - typecheck
     - test
     - build
   - If a command is unavailable, state exactly why and what equivalent check was used.

5. **Final report (mandatory)**
At completion, output a launch handoff report with exactly these sections:

1) What was changed  
2) Files modified  
3) Commands run  
4) Tests/build results  
5) Remaining blockers  
6) Recommended next Codex task

## Code quality expectations
- Strong typing, no `any` unless absolutely unavoidable (explain if used).
- Defensive coding for async/network/permission failures.
- No dead code or commented-out legacy blocks unless justified.
- Keep naming consistent with existing domain language (passive logs, insights, moods, rituals, relationships, narrator, mirror, timeline).
- Preserve visual identity: magical but calm, premium but simple.

## Safety + privacy constraints
- No unsafe health claims.
- No hidden data capture behavior.
- Respect consent/privacy flows.
- Avoid exposing private data in logs/errors.

Start now by auditing the repo and presenting the Tiered implementation plan before making major edits.
