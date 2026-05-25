export const SPATIAL_ROUTES = {
  home: "/spatial",
  lifeMap: "/spatial/life-map",
  biome: "/spatial/biome",
  shadow: "/spatial/shadow",
  legacy: "/spatial/legacy",
  arVr: "/spatial/ar-vr",
} as const;

export const SPATIAL_BREAKPOINTS = {
  mobile: 640,
  tablet: 1024,
  largeDesktop: 1440,
} as const;

export const SPATIAL_WORLD_CONFIG = {
  sceneName: "Spatial Home",
  sceneSubtitle: "Sky View",
  primaryCta: "Enter Life Map",
  publicPreviewBadge: "URAI V1 · LOCAL DEV",
  maxDpr: 1.5,
  mobileParticleBudget: 32,
  desktopParticleBudget: 96,
} as const;
