# URAI Spatial — Performance Hardening v3

## Scope
Reduce predictable render and data-load risks before production validation.

---

## ✅ Implemented

### Manifest Cap
- `CONSTELLATION_MANIFEST_LIMIT = 18`
- Firestore query uses `limit(CONSTELLATION_MANIFEST_LIMIT)`
- Client-side slice keeps the returned list bounded after validation

### Cluster Computation
- Constellation clustering is memoized with `useMemo`
- Node positions are deterministic from cluster + index

### Frame Work
- Per-frame updates stay limited to transforms only
- React state is not mutated inside `useFrame`

---

## Current Performance Budget

| Area | Budget |
|---|---:|
| Constellation manifests | 18 max |
| Node geometry | 1 sphere mesh per visible node |
| Active full manifest render | 1 selected manifest |
| Target FPS | 45+ on modern laptop browser |

---

## Remaining Risks

- Node rendering still uses one mesh per node; instancing is not yet implemented.
- Full asset rendering can be expensive for video and GLB assets.
- Mobile GPU performance remains unverified.
- No WebGL context loss recovery yet.

---

## Required Validation

- Run with 1, 5, 10, and 18 manifests.
- Confirm click-to-focus remains smooth.
- Confirm speech + HUD does not overlap after rapid clicks.
- Confirm FPS stays acceptable during camera fly-to.

---

## Status

✔ Data loading bounded
✔ Computation bounded
✔ Render loop safer
✖ Not yet GPU-instanced
✖ Not runtime-certified
