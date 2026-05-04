import type { HomeWorldTier } from "../homeWorldTypes";

const base = "/assets/home-world";

export const homeWorldAssets = {
  sky: {
    1: `${base}/sky/sky-tier-1-muted.webp`,
    2: `${base}/sky/sky-tier-2-clearing.webp`,
    3: `${base}/sky/sky-tier-3-weather.webp`,
    4: `${base}/sky/sky-tier-4-aurora.webp`,
    5: `${base}/sky/sky-tier-5-portal.webp`,
  } as Record<HomeWorldTier, string>,
  horizon: {
    mistFar: `${base}/horizon/horizon-mist-far.webp`,
    mistMid: `${base}/horizon/horizon-mist-mid.webp`,
    mistNear: `${base}/horizon/horizon-mist-near.webp`,
    mountainsFar: `${base}/horizon/distant-mountains-far.svg`,
    hillsMid: `${base}/horizon/distant-hills-mid.svg`,
    threshold4: `${base}/horizon/symbolic-threshold-tier-4.svg`,
    threshold5: `${base}/horizon/symbolic-threshold-tier-5.svg`,
    bloom: `${base}/horizon/horizon-bloom.webp`,
  },
  ground: {
    1: `${base}/ground/ground-tier-1-dormant.webp`,
    2: `${base}/ground/ground-tier-2-sprouts.webp`,
    3: `${base}/ground/ground-tier-3-roots.webp`,
    4: `${base}/ground/ground-tier-4-blooms.webp`,
    5: `${base}/ground/ground-tier-5-constellation-roots.webp`,
  } as Record<HomeWorldTier, string>,
  orb: {
    1: `${base}/orb/orb-tier-1.svg`,
    2: `${base}/orb/orb-tier-2.svg`,
    3: `${base}/orb/orb-tier-3.svg`,
    4: `${base}/orb/orb-tier-4.svg`,
    5: `${base}/orb/orb-tier-5.svg`,
    aura: `${base}/orb/orb-aura.webp`,
    ring: `${base}/orb/orb-ring-symbolic.svg`,
    lensBloom: `${base}/orb/orb-lens-bloom.webp`,
  } as Record<HomeWorldTier, string> & { aura: string; ring: string; lensBloom: string },
  avatar: {
    neutral: `${base}/avatar/avatar-silhouette-neutral.svg`,
    low: `${base}/avatar/avatar-silhouette-low.svg`,
    recovery: `${base}/avatar/avatar-silhouette-recovery.svg`,
    awakened: `${base}/avatar/avatar-silhouette-awakened.svg`,
    rimLight: `${base}/avatar/avatar-rim-light.webp`,
    aura: `${base}/avatar/avatar-aura.webp`,
  },
  particles: {
    dust: `${base}/particles/dust-motes.json`,
    recovery: `${base}/particles/recovery-sparks.json`,
    dream: `${base}/particles/dream-particles.json`,
    shadow: `${base}/particles/shadow-embers.json`,
    ritual: `${base}/particles/ritual-fireflies.json`,
    petals: `${base}/particles/memory-petals.json`,
  },
  lighting: {
    vignette: `${base}/lighting/foreground-vignette.webp`,
    groundBounce: `${base}/lighting/ground-bounce-light.webp`,
    rays: `${base}/lighting/sky-light-rays.webp`,
    haze: `${base}/lighting/atmosphere-haze.webp`,
  },
  rive: {
    sky: `${base}/rive/HomeSky_Idle.riv`,
    orb: `${base}/rive/OrbCompanion_StateMachine.riv`,
    ground: `${base}/rive/GroundGrowth_Tiers.riv`,
    transition: `${base}/rive/SkyToLifeMap_Transition.riv`,
  },
  lottie: {
    narrator: `${base}/lottie/narrator-speaking-shimmer.json`,
    tierUpgrade: `${base}/lottie/tier-upgrade-bloom.json`,
  },
};
