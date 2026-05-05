## Summary

- What changed?
- Why is it needed?

## Source-of-truth impact

- [ ] Does not change canonical source-of-truth files
- [ ] Changes canonical source-of-truth files and updates `docs/URAI_SPATIAL_SOURCE_OF_TRUTH_LOCK.md`

Canonical spatial files include:

- `urai-tier1/src/app/page.tsx`
- `urai-tier1/src/app/home/page.tsx`
- `urai-tier1/src/app/life-map/page.tsx`
- `urai-tier1/src/app/focus/page.tsx`
- `urai-tier1/src/spatial/scene/SpatialScene.tsx`
- `firebase.json`
- `firebase/firestore.rules`
- `firebase/firestore.indexes.json`
- `.github/workflows/spatial-production-lock.yml`
- `tests/spatial-lock.mjs`

## Spatial flow evidence

- [ ] Home renders
- [ ] Home -> Ascent works
- [ ] Ascent -> LifeMap works
- [ ] LifeMap -> Focus works
- [ ] Focus -> Replay works
- [ ] ESC unwind works from Replay -> Focus -> LifeMap -> Home
- [ ] Browser back does not corrupt spatial state
- [ ] Replay pause/resume works
- [ ] Mobile viewport checked
- [ ] Desktop viewport checked

## Automation evidence

- [ ] Frozen install passed
- [ ] Typecheck passed
- [ ] Build passed
- [ ] Functions build/tests passed
- [ ] App tests passed
- [ ] E2E lock flow passed
- [ ] Firebase deploy references validated

### Check output matrix (required)

| Command | Pass/Fail | Exact output summary | Legacy vs feature-specific |
| --- | --- | --- | --- |
| `pnpm typecheck` |  |  |  |
| `pnpm build` |  |  |  |
| `pnpm test` |  |  |  |

### Life Map interaction matrix (required)

| Area | Status | Evidence (test/log/manual) | Notes |
| --- | --- | --- | --- |
| `/life-map` route |  |  |  |
| Focus interaction |  |  |  |
| Chapter click interaction |  |  |  |
| Resolve interaction |  |  |  |
| Reduced-motion behavior |  |  |  |

## Visual review

- [ ] Layout alignment checked
- [ ] Spacing checked
- [ ] Typography checked
- [ ] Z-index/overflow checked
- [ ] Motion timing checked
- [ ] Console checked for warnings/errors

## Remaining risks

List anything that should block production lock or merge.
