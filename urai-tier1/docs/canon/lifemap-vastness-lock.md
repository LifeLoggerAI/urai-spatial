# LifeMap Vastness Canon Lock

Status: LOCKED  
Scope: Tier-1 / Tier-2 visual and perceptual canon for LifeMap only

## Non-Negotiable Outcomes

LifeMap must read as a vast spatial field, not a zoomed-out flat layer.

The following must be true at the same time:

1. True depth layering
2. Star density logic
3. Constellation logic
4. Brightness attenuation by distance
5. Fog and volumetric separation
6. Camera composition that feels vast, not merely farther away

## Implementation Laws

### 1) True Depth Layering
- Stars must exist in multiple depth bands, not a single shell.
- Minimum of 4 depth bands:
  - near
  - mid-near
  - mid-far
  - far
- Each band must differ in:
  - count
  - size
  - opacity
  - brightness
  - parallax sensitivity
- Near stars must move more relative to camera drift than far stars.
- Far stars must never look equal in scale or intensity to near stars.

### 2) Star Density Logic
- Density must not be uniform.
- Center composition should preserve readability around selected/focus subject.
- Density should increase in some far-field regions to imply scale.
- Empty pockets are allowed and desirable if they create navigable sky volumes.
- A selected star must have local breathing room around it.

### 3) Constellation Logic
- Constellation links must be selective, sparse, and meaningful.
- No full mesh, no random spaghetti.
- Links should form local narrative clusters.
- Link opacity must be lower than star opacity.
- Link brightness must attenuate with distance at least as aggressively as stars.
- Constellations should reinforce chapter/group structure, not dominate the frame.

### 4) Brightness Attenuation by Distance
- Distance must reduce apparent intensity.
- Far-field stars:
  - smaller
  - dimmer
  - lower alpha
  - lower bloom/glow
- Near-field stars:
  - slightly larger
  - clearer halo
  - stronger visual priority
- Selected star can break attenuation rules slightly, but only locally.

### 5) Fog and Volumetric Separation
- Atmospheric separation must make depth legible.
- Fog must not flatten the scene.
- Fog should soften far-field stars and links.
- Mid-depth haze may be used to create layered world thickness.
- Background color/fog/clear color must support deep-space readability.

### 6) Camera Composition Must Feel Vast
- Vastness is not just higher Z distance.
- Camera must frame:
  - negative space
  - layered star depth
  - off-axis field extension
  - enough far field to imply continuation beyond frame
- Camera should avoid a dead-center, UI-like, orthographic-feeling composition.
- Slight cinematic drift is allowed if subtle.
- Selected star framing must preserve surrounding scale context.

## Recommended Technical Shape

Grounded by implementation notes:
- circular sprite or point-based stars
- alpha/gradient textures or shader-masked disks
- additive blending only where restrained
- distance-based attenuation for opacity/size/glow
- depth-banded generation logic
- optional sparse line segments for constellations
- fog tuned for separation, not washout

## Acceptance Test

LifeMap is locked only if:
- depth is visible without clicking anything
- far stars clearly read as farther away
- selected star still lives inside a large world
- constellation lines are sparse and legible
- no flat wallpaper feel
- no “just zoomed out” feel
- screenshot at rest communicates scale immediately

## Failure Conditions

Fail the pass if any are true:
- stars look same-sized across the scene
- stars look equally bright regardless of depth
- camera reads as a flat poster shot
- constellation lines clutter the frame
- fog makes everything equally vague
- selected star consumes the composition and destroys scale
