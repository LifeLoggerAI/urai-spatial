# URAI Home World V2 asset contract

Home World V2 is now data-driven and has CSS fallbacks, but final production fidelity still requires the asset pack below.

## Required folders

```txt
public/assets/home-world/
  sky/
  horizon/
  ground/
  orb/
  avatar/
  particles/
  lighting/
  rive/
  lottie/
```

## Required assets

```txt
sky/
  sky-tier-1-muted.webp
  sky-tier-2-clearing.webp
  sky-tier-3-weather.webp
  sky-tier-4-aurora.webp
  sky-tier-5-portal.webp

horizon/
  horizon-mist-far.webp
  horizon-mist-mid.webp
  horizon-mist-near.webp
  distant-mountains-far.svg
  distant-hills-mid.svg
  symbolic-threshold-tier-4.svg
  symbolic-threshold-tier-5.svg
  horizon-bloom.webp

ground/
  ground-tier-1-dormant.webp
  ground-tier-2-sprouts.webp
  ground-tier-3-roots.webp
  ground-tier-4-blooms.webp
  ground-tier-5-constellation-roots.webp
  root-network-tier-3.svg
  root-network-tier-4.svg
  ritual-bloom-field-tier-5.webp

orb/
  orb-tier-1.svg
  orb-tier-2.svg
  orb-tier-3.svg
  orb-tier-4.svg
  orb-tier-5.svg
  orb-aura.webp
  orb-ring-symbolic.svg
  orb-lens-bloom.webp

avatar/
  avatar-silhouette-neutral.svg
  avatar-silhouette-low.svg
  avatar-silhouette-recovery.svg
  avatar-silhouette-awakened.svg
  avatar-rim-light.webp
  avatar-aura.webp

particles/
  dust-motes.json
  recovery-sparks.json
  dream-particles.json
  shadow-embers.json
  ritual-fireflies.json
  memory-petals.json

lighting/
  foreground-vignette.webp
  ground-bounce-light.webp
  sky-light-rays.webp
  atmosphere-haze.webp

rive/
  HomeSky_Idle.riv
  OrbCompanion_StateMachine.riv
  GroundGrowth_Tiers.riv
  SkyToLifeMap_Transition.riv

lottie/
  narrator-speaking-shimmer.json
  tier-upgrade-bloom.json
```

## Current V2 fallback coverage

The React/CSS implementation currently provides fallback layers for:

- deep sky
- portal glow
- aurora
- clouds
- stars
- constellation web
- horizon bloom
- three mist bands
- symbolic threshold
- far/mid/near terrain
- ground tiers
- root network
- bloom field
- particles
- avatar/aura
- orb/rings/glyph/beam
- narrator shimmer
- foreground vignette
- reduced motion

Production assets should replace or enrich these fallback layers without removing the data attributes and CSS variable contract.
