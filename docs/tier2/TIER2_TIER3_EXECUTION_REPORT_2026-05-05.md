# Tier-2 / Tier-3 Structured Audit (2026-05-05)

## Scope of this pass
This pass performs the first required execution slice:
1. Repo-wide Tier-1/2/3 inventory.
2. Tier-2 completion-readiness snapshot with concrete blockers.
3. Tier-3 completion-readiness snapshot with concrete blockers.

No Tier-1 redesign changes were made.

## Repo inventory

### Tier-1 (locked runtime surface)
- Primary app routes present in `urai-tier1/src/app/*` including `/home`, `/focus`, `/life-map`, `/mirror`, `/replay`.
- Core spatial scene + narrator + replay modules are present under:
  - `urai-tier1/src/spatial/scene`
  - `urai-tier1/src/spatial/narrator`
  - `urai-tier1/src/spatial/replay`

### Tier-2 (interactive/personal systems) discovered
- Canon + contracts:
  - `src/canon/tier2.ts`
  - `urai-tier1/src/spatial/canon/tier2Canon.ts`
  - `urai-tier1/src/spatial/canon/tier2Assert.ts`
- LifeMap data + UI systems:
  - `src/lib/life-map/*`
  - `src/components/life-map/*`
  - `src/app/life-map/page.tsx`
- Insight pipeline (detectors, ranking, sentence/proof engines):
  - `urai-tier1/src/lib/urai-insights/*`

### Tier-3 (storytelling/constellation/replay expansion) discovered
- Canon:
  - `src/canon/tier3.ts`
  - `urai-tier1/src/spatial/canon/tier3Narrator.ts`
- Replay + narrator + memory graph systems:
  - `urai-tier1/src/spatial/replay/*`
  - `urai-tier1/src/spatial/narrator/*`
  - `src/components/life-map/LifeMapReplayEngine.tsx`
  - `src/components/life-map/RelationshipOrbitLayer.tsx`

## Tier-2 completion status (current)
- Route-level presence: YES
- Data/types presence: YES
- Insight engine modules: YES
- Full production lock evidence: PARTIAL

### Tier-2 blockers to "locked"
1. Need explicit Tier-2 lock checklist execution artifact in-repo for current HEAD (pass/fail matrix against canon + UX + error/loading/empty states).
2. Need route-by-route verification of empty/error/permission states for all life-map interactions against Firestore adapter paths.
3. Need cross-check that all `mockRunner` or demo-only code paths are gated from production path usage.

## Tier-3 completion status (current)
- Canon definitions: PRESENT
- Feature scaffolding: PRESENT
- End-to-end proof (UI → state → API/Firebase → narrator/timeline replay): PARTIAL

### Tier-3 blockers to "done done"
1. `PHASE7_TODO.md` indicates at least one explicit unfinished replay phase contract artifact.
2. Need end-to-end validation matrix for narrator/replay/timeline/memory flows under real data + empty data.
3. Need lock-level report proving no stub-only behavior remains in Tier-3 execution paths.

## Next execution slices (committed plan)
1. Build Tier-2 lock matrix file with per-route/per-service checks and close all failing cells.
2. Execute Tier-3 E2E wiring matrix and close unresolved replay/narrator/timeline integration gaps.
3. Produce final lock reports for Tier-2 and Tier-3 with command evidence.
