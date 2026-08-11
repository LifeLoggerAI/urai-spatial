# URAI Human + World Realism Standard

Status: active review rule
Date: 2026-08-11
Branch: `agent/real-world-human-pass`

URAI's spatial layer must read as believable reality before symbolic augmentation. The product may be magical, but its people, scale, materials, lighting, camera, and physical grounding cannot look like placeholders, mannequins, game icons, or glowing primitives.

## Human gate

A human-facing scene is not visually final when its primary person is a capsule/sphere mannequin, faceless silhouette, box avatar, or glowing outline with no believable anatomy.

Minimum review requirements:

- plausible real-world height and body proportions
- recognizable head, face, ears, eyes, nose, mouth, hair, torso, arms, hands, legs, and feet
- skin, hair, cloth, and footwear have materially distinct surface response
- grounded feet and contact shadow
- subtle breathing, gaze, head movement, and weight behavior rather than floating/bobbing
- varied appearances where multiple people share a scene
- scene contract remains compatible with later rigged/scanned GLB promotion

The renderer-authored human in `src/spatial/scene/HomeAvatar.tsx` is a realism bridge. It is not a substitute for final rigged/scanned character GLBs with provenance, animation, LOD, and rendered approval.

## World gate

Physical realms must use believable scale and motivated materials/lighting:

- terrain, soil, stone, wood, glass, water, vegetation, textiles, and metals use plausible roughness and reflectance
- lighting comes from visible or understandable sources such as sky/daylight, moonlight, lamps, firelight, or the orb
- shadows, reflections, depth haze, and contact grounding establish spatial presence
- camera height and lens behavior should feel human rather than like a miniature diorama or exaggerated game camera
- magical fields, portals, glyphs, emotional weather, and memory effects layer on top of physical space instead of replacing it

## Council rule

Council members are people first and archetypes second. Human bodies, faces, ordinary physical grounding, and a believable room must dominate the read. Role-specific color, light, particles, or glyphs remain restrained secondary signals.

## Home rule

Home is a traversable place. The orb is the extraordinary object inside a physically believable world. The user/avatar representation cannot regress to a primitive mannequin or icon at normal viewing distance.

## Final promotion sequence

1. Physical model/material quality
2. Human/world scale
3. Lighting and contact shadows
4. Camera composition
5. Interaction and animation
6. Symbolic/emotional VFX
7. Audio
8. Mobile/desktop/XR performance and accessibility proof
9. Provenance/rights evidence
10. Final rendered acceptance

If steps 1-4 fail, keep the asset or scene in review regardless of how impressive the effects look.
