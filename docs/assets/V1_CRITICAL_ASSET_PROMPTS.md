# URAI V1 Critical Asset Generation Prompts

Status: **ready for paid generation**  
Use with: asset provider, 3D artist, Blender workflow, Meshy/Luma/Tripo/Spline/export workflow, or approved Asset Factory provider adapter.

## Shared art direction

URAI should feel like a premium spatial AI life operating system, not a dashboard. The world language is cinematic, private, luminous, calm, powerful, and explorable.

Visual constants:

- Dark deep-space base.
- Premium black glass, smoked metal, obsidian, translucent panels.
- Cyan/violet/gold energy accents.
- Soft volumetric glow.
- Walkable scale.
- No cartoon style.
- No generic sci-fi clutter.
- No text baked into 3D assets unless explicitly requested.
- Mobile-readable silhouette from first frame.
- Low-poly enough for web, but high-quality enough to feel expensive.

Technical constants:

- Prefer GLB for 3D runtime assets.
- Keep origin centered and scale reasonable for Three.js.
- Keep geometry modular.
- Use named nodes/materials.
- Avoid huge texture payloads unless intentionally needed.
- Export with embedded or adjacent texture references that can survive repo storage.

---

## 1. Home Entry Chamber GLB

Required path:

```text
urai-tier1/public/assets/urai/generated/models/home-entry-chamber-v1.glb
```

Prompt:

```text
Create a premium cinematic 3D entry chamber for URAI, a spatial AI life operating system. The chamber must feel like a real navigable place, not a dashboard. Design a circular or semi-circular threshold space floating between a deep galaxy sky above and a walkable Ground world below. Include a central orb pedestal area, subtle floor rings, portal anchor points, vertical depth, luminous cyan/violet/gold accents, dark glass, obsidian metal, and soft volumetric atmosphere. It should feel calm, intelligent, private, powerful, and expensive. No text labels. No cartoon style. No clutter. Make the silhouette strong from a mobile first frame. Export as optimized GLB for Three.js/WebXR.
```

Acceptance:

- Looks like a place you can enter.
- Has obvious floor/walkable orientation.
- Supports portal placement visually.
- Does not look like a flat webpage or generic sci-fi room.

---

## 2. Portal Ring Master GLB

Required path:

```text
urai-tier1/public/assets/urai/generated/models/portal-ring-master-v1.glb
```

Prompt:

```text
Create a reusable premium 3D portal ring for URAI, a spatial AI life operating system. The portal should feel like a destination gateway, not a button. Design a floating ring or threshold arch made of black glass, obsidian metal, thin luminous cyan/violet/gold energy seams, subtle inner particle depth, and an opening that can frame different worlds. It must work for transitions to Ground, Life Map, Focus, and Replay. No text. No logos. No cartoon styling. Make it elegant, expensive, lightweight, and optimized for real-time Three.js/WebXR use. Export as GLB with named materials and centered origin.
```

Acceptance:

- Reads instantly as a spatial portal.
- Can be reused with different colors/positions.
- Does not feel like a UI button.

---

## 3. Ground World Terrain GLB

Required path:

```text
urai-tier1/public/assets/urai/generated/models/ground-world-terrain-v1.glb
```

Prompt:

```text
Create a walkable Ground world terrain for URAI, a spatial AI life operating system. The terrain should feel reachable below the default Home world, like a private command-world floor where memory, logistics, wellness, privacy, and operations can become rooms or zones. Design a premium dark terrain/floor system with subtle paths, platform layers, portal landing zones, soft luminous seams, calm depth, and a sense of scale. It should be abstract but walkable, cinematic but not cluttered, futuristic but human. No text baked into geometry. No cartoon style. Optimize for Three.js/WebXR as a GLB.
```

Acceptance:

- Makes Ground feel like a world below Home.
- Has believable walkable surfaces.
- Can receive future rooms/zones.

---

## 4. Life Map Galaxy Skybox HDR

Required path:

```text
urai-tier1/public/assets/urai/generated/skyboxes/life-map-galaxy-skybox-v1.hdr
```

Prompt:

```text
Create a cinematic HDR galaxy skybox for URAI Life Map. The Life Map should feel like looking upward into a private living memory galaxy, not opening a flat overlay. The skybox should contain deep spatial depth, layered star fields, subtle nebula clouds, luminous memory-star clusters, quiet cyan/violet/gold accents, and a premium calm atmosphere. Avoid noisy clutter, cartoon stars, text, planets dominating the frame, or harsh contrast. It must work as an immersive background for Three.js and still look beautiful on mobile.
```

Acceptance:

- Feels deep, private, and navigable.
- Leaves room for runtime memory-star nodes.
- Does not overpower UI or star interactions.

---

## 5. Global Cinematic Material Pack JSON

Required path:

```text
urai-tier1/public/assets/urai/generated/textures/global-cinematic-material-pack-v1.json
```

Prompt / contract:

```text
Create a JSON material style guide for URAI V1 spatial assets. Define named materials for obsidian_glass, smoked_metal, portal_energy, floor_luminous_seam, star_dust, memory_glow, privacy_shield, gold_provenance, and soft_volumetric_haze. Each material should include baseColor, emissiveColor, roughness, metalness, opacity, glowIntensity, and usage notes. The style should unify Home, Ground, Life Map, Focus, Replay, Passport, and Status. Use web-safe numeric values compatible with Three.js/PBR material mapping.
```

Minimum JSON shape:

```json
{
  "version": "v1",
  "system": "URAI Spatial",
  "materials": {
    "obsidian_glass": {
      "baseColor": "#05070d",
      "emissiveColor": "#0ea5e9",
      "roughness": 0.18,
      "metalness": 0.35,
      "opacity": 0.72,
      "glowIntensity": 0.2,
      "usage": "Primary premium glass surfaces."
    }
  }
}
```

Acceptance:

- Valid JSON.
- Has all required material keys.
- Can be consumed by runtime or artist pass.
- Makes all generated assets feel like one world.
