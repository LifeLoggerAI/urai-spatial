# ONE URAI Genesis — Original cinematic world recovery (founder visual rejection)

Date: 2026-11-15. Base: `7b5a9f9026b0ecf72c628c83517f146633c6c2f3` (Spatial #2088). Status: **REVIEW ONLY / VISUAL NO-GO / PRODUCTION HOLD**.

## Founder observed runtime

At protected preview `urai-genesis-private-app-review-r1193-gqk4gb306.vercel.app`, founder's Android screenshot displays a grassy moonlit yard, sparse angular trees, hard stone path, benches, rocks, threshold panel, and movement pad. Banner identifies `7B5A9F9026B0`. Founder explicitly rejected this as not the original UrAi world. A READY deployment and passing journey tests **do not constitute visual approval**.

## Recover rather than redesign

1. Canonical Home visual requirement: issue #1773 — dominant unobstructed open star sky, no roof/canopy, embodied first-person sanctuary, grounded Orb, real spatial Ascent. Issue #863 requires founder visual approval; issue #639 requires one continuous spatial journey rather than page-stack UI.
2. Asset authority: issue #473 — `urai-tier1/public/assets/urai/generated/{models,skyboxes,textures,audio,loading}` and `operations/assets/**`; source legacy repos `UrAi`, `UrAiProd`, `UrAi-Dev` are read-only donor candidates until hashes, licensing and visual review are satisfied.
3. Existing cinematic asset candidate pack: issue #1054 — Home entry chamber, portal ring, Life Map galaxy HDR, Memory Star, Focus chamber, Replay environment, Orb. Compare actual asset bytes and authored visual outputs, do not infer approval from filenames.
4. Current #2088 Home code: `urai-tier1/src/spatial/layout/HomeWorldProductionPolished.tsx`. Existing authored candidate paths include `/assets/urai/generated/models/home-entry-chamber-v1.glb`, `/assets/urai/world001-preview/URAI_WORLD001_FOUNDER_HOME_ARCHITECTURE_v3.glb`, `/assets/urai/generated/models/urai-orb-avatar-v1.glb`. The Wave13 architecture is explicitly gated to review; do not turn it on in production without inspecting and accepting it.
5. #2088 already restored fern diffuse/normal/ARM/alpha and stone PBR and reused root placements. See `operations/assets/recovered-visual-integration-20261115.md`. Preserve this work. The historical Jacaranda GLB was **rejected for close-range use** due to coarse opaque triangular leaves; do not reintroduce it.
6. Source-pinned #2087 desktop, mobile, Ascent recordings: `27ba25f812e7e32659fdd31b6c3cae28152b5302`; Google Drive IDs `1JEP-LZvGsv7FdyMM8RYXTtJ45m-oFsJS`, `10YirSMjtphJL3kUQ8CIIxXuex3w6WZsp`, `1MdUdMPtn5J4KCjs6rCxsEFcCXhlSsNvy`; archive `1jrUuREbdf7SCougQMytE1JvE_6ezd1ry`. They do not prove #2088 final visuals.

## Implementation order for next worker

- **A. Source inventory:** inspect original authored Home and Orb, galaxy/skybox, Focus and Replay implementations and approved visual evidence in existing repos/branches. Create a path+SHA+license+visual comparison matrix. Mark unavailable items UNKNOWN, not missing.
- **B. Home recovery:** compare exact #2088 screenshot with original authored candidate render and approved art bible. Restore original coherent visual composition in the existing Home runtime, not a replacement page. Preserve open sky, natural Ascent, functional Orb, accessible movement, reduced-motion and fallback behavior. Avoid primitive debug/fallback visual ownership.
- **C. Life Map/Focus/Replay:** retain canonical selected-memory identity and navigation; integrate original galaxy, Focus and Replay assets where provenance and visual acceptance support them. Fix distant Replay wedge, hard edges and perimeter vegetation. Do not invent memories or misrepresent demo as owner-authorized content.
- **D. Proof:** use existing capture scripts and 417-screenshot/#2088 receipts first. Only capture missing comparisons at exact SHA, desktop + Android mobile, full journey and reduced motion. Record GPU tier, screenshots, recording hashes, actual visual defects, performance and founder verdict.
- **E. Release:** independent review required; no public promotion, private-memory writes, merge, production settings or paid compute without separately authorized action.

## Current acceptance

- #2087 canonical navigation/browser proof: reported PASS.
- #2088 photographic restoration and controls: implementation + reported browser proof; **founder visual rejection of preview Home**.
- Original intended cinematic composition restored: **NOT PROVEN**.
- Real-user end-to-end and security certification: **NOT PROVEN**.
- Production: **HOLD**.

This branch documents the recovery scope. It does not claim a runtime implementation or final visual certification.
