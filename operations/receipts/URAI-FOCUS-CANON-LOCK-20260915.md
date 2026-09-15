# URAI Focus Canon Lock Receipt — 2026-09-15

## Scope

This receipt records the terminology/source reconciliation for the current UrAi Focus experience. It does not certify visual acceptance, merge, deployment, or production release.

## Source authority

- Repository: `LifeLoggerAI/urai-spatial`
- Base branch: `main`
- Base SHA at branch creation: `731f9312a3f0d6dbf945ada85c6f46e957e1b2d9`
- Companion branch: `focus-canon-lock-main-20260915`
- Active parallel PR #1177 branch: `home-final-v24-certify-20260826`
- Active PR #1177 actual GitHub head observed during reconciliation: `3b1ec817c82195a7e3d9fb4b2a3dec6a6265083d`
- PR #1177 body still named predecessor `0d9500dc32bb969a43234fa1ad281ed3c1d5d7aa` as exact live head at observation time; live GitHub branch metadata was treated as authoritative.

The companion branch was intentionally rooted from `main`, not PR #1177, so this terminology work does not absorb or race the active #1177 source-writing lane.

## Google Drive authority consulted

1. `01 — URAI — Canon, Architecture, Estate & Guardrails`
   - Confirms UrAi product naming, current spatial journey, repository authority, accessibility canon, visual acceptance rules, and exact-head evidence discipline.
2. `URAI Document Authority Register and Mixed-Era Decision Record — 2026-07-10`
   - Explicitly classifies the older `focus.txt` desktop/productivity Focus concept as future/historical and non-governing for the current spatial web journey.
3. `focus.txt`
   - Preserved as historical/future-product research; not current `/focus` route authority.
4. `camera focus replay.txt`
   - Supporting design history for Life Map -> Focus -> Replay and unwind behavior; not deployment/certification evidence.

No historical Drive artifact was deleted or rewritten.

## Canon decisions locked

- `Focus` is the canonical user-facing selected-memory experience between Life Map and Replay.
- `Focus Observatory` is reserved for neutral direct `/focus` entry with no authorized selected memory.
- Internal names such as `FocusChamberClient`, `MemoryAperture`, `entryPortal`, and governed asset filenames may remain.
- `LifeMapNode` remains generic; not every node is a memory.
- `Memory Star` is the Life Map-scale identity of a memory.
- Generic nearby graph entities are `Related Context`; use `Related Memories` only for actual memory entities.
- `Close Inspection` replaces the new design use of `Deep Focus`.
- The public Replay action is `Enter Replay`.
- Internal portal/aperture names do not authorize visible portal/ring/tunnel imagery.
- Existing Life Map journey phases remain authoritative; cinematic sub-beats do not create a competing state machine.

## Source changes

- `urai-tier1/src/app/focus/page.tsx`
  - Normalized route description around canonical Focus rather than chamber-as-product naming.
- `urai-tier1/src/spatial/scene/focusState.ts`
  - Renamed generic hover semantics from Related Memory Preview to Related Context Preview without changing state identifiers or transitions.
- `docs/FOCUS_CANONICAL_TERMINOLOGY_LOCK.md`
  - Added repository-native terminology and experience authority.
- `docs/ARCHITECTURE_LOCK.md`
  - Added Focus terminology authority inside the existing architecture lock.
- `urai-tier1/tests/focus-canonical-terminology-contract.test.mjs`
  - Added narrow regression coverage for public Focus naming, neutral Observatory semantics, Related Context, existing state-machine authority, selected-memory identity, internal chamber/aperture vocabulary, and historical productivity Focus separation.

## Verification boundary

Local repository execution was not available in the working container because outbound GitHub network resolution is disabled. Therefore this receipt does not claim local test/build success.

Repository CI/checks on the companion PR are the required executable verification surface. Any successor commit must re-earn exact-head evidence.

No literal-pixel visual acceptance is claimed by this terminology-only companion change. The active #1177 visual lane remains separately governed.

## Release truth

- NOT MERGED
- NOT DEPLOYED
- NOT LIVE-CERTIFIED BY THIS RECEIPT
- NO INDEPENDENT APPROVAL CLAIMED
- NO #1177 SOURCE MUTATION PERFORMED
