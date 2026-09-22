# URAI Canon Reference Authority Cleanup — 2026-09-21

## Scope

This receipt records the bounded reference-authority cleanup performed from Spatial convergence authority `c4a3dffc2bb03a4477521ca9fed95ec7a5b6e264` on branch `audit/reference-authority-cleanup-20260921`.

It does **not** claim Gold Master, merge, deployment, independent review, or literal inspection of every active image candidate.

The governing rule remains: exact-head visual acceptance does not transfer across head moves.

## Confirmed current canon

- Home: governed Avatar presentation -> embodiment transition -> bodyless non-XR first-person Home.
- Non-XR first-person: camera-only; no synthetic hands, arms, visible avatar body, or FPS body rig.
- Ground: physical material crossing and believable lived-world terrain; no portal/radial-tunnel ownership and no follower Orb.
- Life Map: layered navigable memory galaxy with near/mid/far depth, parallax and occlusion; no flat node graph, star wallpaper, portal/ring or solar-system UI.
- Memory Star: stellar point / hot photosphere / layered corona; no visible planet surface, crystal, geode, orbit-shard or hard ring identity.
- Focus: the **same selected Memory Star** resolves at close range with the authorized memory visible within/through the stellar phenomenon. Terrain/cavity Focus lineage V272-V322 is rejected/superseded.
- Replay: the user is inside the memory environment; no theater, projection wall, film portal, media player, fabricated source audio or fake evidence.
- Passport: physical Home artifact is distinct from conventional Passport UI and must preserve exact Home return origin.
- Shadow: embodied safe realm; no portal-card/crystal/fantasy ownership.
- Possible Futures: spatial, explicitly hypothetical, unranked scenario world; never visually masquerades as autobiographical memory.

## Authority leaks found

### 1. Portal ring still presented as active global authority

Artifacts / slots:
- `portal-ring-master-glb-v1`
- `portal-ring-proof-fallback`
- `home.lifeMapAperture`

Classification:
- Binary/provenance: retain historically.
- Literal visual/reference authority: **SUPERSEDED / REJECTED**.

Reason:
Current Home/Ground/Life Map canon explicitly rejects portal/ring ownership.

### 2. Focus tunnel/chamber fallback language

Artifacts / slots:
- `focus-star-tunnel-proof-fallback`
- `focus-memory-chamber-v1`
- `focus.starPortalShell`

Classification:
- Historical/compatibility geometry may remain.
- Tunnel/chamber as visual authority: **REJECTED**.

Reason:
Focus is owned by same-star continuity and contained memory, not tunnel/chamber travel grammar.

### 3. Replay film-portal/theater fallback language

Artifacts / slots:
- `replay-film-portal-proof-fallback`
- `procedural-replay-theater`
- `replay.memoryThreadTunnel`

Classification:
- Historical/compatibility geometry may remain only if it does not control rendered experience.
- Film portal/theater/player as visual authority: **REJECTED**.

Reason:
Replay is an immersive memory interior with truthful source grammar.

### 4. Historical Memory Star binary

Artifact:
- `life-map-memory-star-v1.glb`

Classification:
- **REUSABLE SUPPORTING REFERENCE / NOT LITERAL VISUAL AUTHORITY**.

Reason:
Current visible morphology is source-derived point/photosphere + layered corona. Historical binary naming, orbit/shard structures, visible hard sphere, crystal or ring morphology must not define accepted pixels.

## Focus literal diagnostic

Current-lineage retained Focus pixels were machine-green on predecessor exact heads but still required literal visual correction because the first read could become a large glowing sphere / sun / planet / target instead of an unmistakable selected Memory Star containing the memory.

Acceptance remains OPEN until unchanged-head retained pixels satisfy:
- same selected star identity;
- dimensional photosphere/corona;
- contained memory visible within/through the stellar phenomenon;
- no planet/sphere-first read;
- no target/ring;
- no crystal/shard;
- no tunnel/chamber ownership;
- continuity into Replay and back to Life Map.

## Cleanup applied on this branch

1. `operations/visual/urai-visual-gold-master-manifest.v1.json`
   - added explicit reference-authority rules;
   - quarantined portal/tunnel/film-portal authority;
   - updated Focus authority to V349+ current lineage;
   - recorded Shadow and Possible Futures source convergence;
   - extended negative canon.

2. `urai-tier1/src/spatial/assets/worldAssetManifest.ts`
   - stopped legacy portal/tunnel/film-portal compatibility slots from claiming to be canonical;
   - labeled them explicitly as legacy compatibility only.

3. `docs/URAI_VISUAL_GOLD_MASTER_INDEX_V1.md`
   - corrected Home to Avatar-presentation -> embodiment -> bodyless FPV;
   - replaced stale Focus V318 terrain/cavity authority with current V349+ selected-Memory-Star authority;
   - removed stale claims that predecessor exact-head pixels remain accepted after head moves;
   - recorded Shadow embodied-realm convergence.

## Still intentionally not mutated

The old GLB/GLTF files themselves are not deleted by this cleanup. Historical binaries are useful provenance and may still be referenced by compatibility code/tests.

Deleting or rewiring runtime assets should happen only after:
1. exact consumer reachability is proven;
2. semantic/no-WebGL fallbacks are preserved;
3. current visual proof remains green;
4. no compatibility or performance path silently depends on the file.

## Remaining exact visual queue

1. Focus literal acceptance.
2. Memory Star MEMSTAR-001..012 accepted pack.
3. Home exact-head presentation + FPV pixels.
4. Ground exact-head desktop / portrait / reduced-motion pixels.
5. Life Map exact-head overview / selected / travel / approach / arrival.
6. Physical Passport 15-state pack.
7. Personal Emotional Weather state pack.
8. Governed Global Emotional Field Earth states.
9. Shadow exact-head pack.
10. Legacy exact-head pack.
11. Council exact-head pack.
12. Ritual visual/audio/silence pack.
13. Possible Futures spatial scenario pack.
14. Audio Gold Master and physical-device haptic acceptance.
15. Final governed Avatar likeness sheet when a legitimate likeness candidate exists.

## Non-terminal boundary

This cleanup fixes authority language and records which old assets must not steer implementation. It does not by itself certify the pixels.

The definitive acceptance surface remains fresh unchanged-head retained visual proof plus literal inspection.
