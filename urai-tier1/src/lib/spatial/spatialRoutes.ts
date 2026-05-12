export const spatialRoutes = {
  home: "/spatial",
  lifeMap: "/spatial/life-map",
  memory: (nodeId: string) => `/spatial/memory/${nodeId}`,
  biome: "/spatial/biome",
  shadow: "/spatial/shadow",
  legacy: "/spatial/legacy",
  arVr: "/spatial/ar-vr",
} as const;
