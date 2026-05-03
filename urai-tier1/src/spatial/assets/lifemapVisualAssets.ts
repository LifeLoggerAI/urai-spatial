export const LIFE_MAP_VISUAL_ASSETS = {
  starGlow: "/assets/urai/lifemap/surgical-star-glow.svg",
  nebulaVeil: "/assets/urai/lifemap/surgical-nebula-veil.svg",
  depthFog: "/assets/urai/lifemap/surgical-depth-fog.svg",
} as const;

const loaded = new Set<string>();

export function preloadLifeMapVisualAssets(): void {
  if (typeof window === "undefined") return;

  Object.values(LIFE_MAP_VISUAL_ASSETS).forEach((src) => {
    if (loaded.has(src)) return;
    const image = new Image();
    image.decoding = "async";
    image.loading = "eager";
    image.src = src;
    loaded.add(src);
  });
}
