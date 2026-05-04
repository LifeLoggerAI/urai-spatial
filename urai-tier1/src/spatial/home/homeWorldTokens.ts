export const HOME_WORLD_Z = {
  deepSky: 0,
  stars: 1,
  aurora: 2,
  clouds: 3,
  horizon: 4,
  terrain: 5,
  ground: 6,
  roots: 7,
  particles: 8,
  avatar: 30,
  orbBeam: 20,
  orb: 42,
  narrator: 50,
  vignette: 70,
  controls: 80,
} as const;

export const HOME_WORLD_MOTION = {
  ascentMs: 1180,
  skyBreatheMs: 8000,
  auroraDriftMs: 16000,
  cloudFastMs: 24000,
  cloudSlowMs: 31000,
  avatarBreathMs: 5200,
  orbFloatMs: 3800,
  rootFlowMs: 8000,
  particleRiseMs: 8000,
} as const;

export const HOME_WORLD_TIER_COPY = {
  1: {
    label: "Dormant",
    meaning: "The world is alive but sleeping. Signals are quiet and protected.",
  },
  2: {
    label: "Early Recovery",
    meaning: "Small growth has started. The ground answers the orb faintly.",
  },
  3: {
    label: "Active Growth",
    meaning: "Roots, weather, and energy are visibly moving again.",
  },
  4: {
    label: "Symbolic Bloom",
    meaning: "The world becomes rich with paths, flowers, and memory light.",
  },
  5: {
    label: "Awakened Ecosystem",
    meaning: "The sky and ground mirror each other as a living constellation system.",
  },
} as const;

export const HOME_WORLD_DEFINITION_OF_DONE = [
  "A user understands this is a world, not a dashboard, within three seconds.",
  "The orb reads as alive, expressive, and emotionally reactive.",
  "The ground reads as growth, recovery, and symbolic history.",
  "The sky reads as emotional weather and future/memory depth.",
  "The horizon reads as a cinematic threshold into the Life Map.",
  "The user can understand why the world changed from an explainability surface.",
] as const;
