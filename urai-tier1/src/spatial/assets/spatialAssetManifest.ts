export type SpatialAssetKind =
  | "terrain"
  | "water"
  | "flora"
  | "crystal"
  | "architecture"
  | "portal"
  | "avatar"
  | "constellation"
  | "memory"
  | "atmosphere";

export type SpatialRealmId =
  | "home-sanctuary"
  | "living-ground"
  | "life-map-observatory"
  | "mirror-of-becoming"
  | "shadow-realm"
  | "passport-archive"
  | "council-chamber";

export type SpatialAssetDefinition = {
  id: string;
  realm: SpatialRealmId;
  kind: SpatialAssetKind;
  procedural: true;
  interactive: boolean;
  lod: "hero" | "mid" | "ambient";
  description: string;
};

export const SPATIAL_ASSET_MANIFEST: readonly SpatialAssetDefinition[] = [
  {
    id: "home.living-terrain",
    realm: "home-sanctuary",
    kind: "terrain",
    procedural: true,
    interactive: false,
    lod: "hero",
    description: "Layered walkable sanctuary terrain with terraces, stepping stones, and reflective basins.",
  },
  {
    id: "home.biome-flora",
    realm: "home-sanctuary",
    kind: "flora",
    procedural: true,
    interactive: false,
    lod: "mid",
    description: "Instanced bioluminescent flowers, stems, and low ground growth.",
  },
  {
    id: "home.crystal-landmarks",
    realm: "home-sanctuary",
    kind: "crystal",
    procedural: true,
    interactive: true,
    lod: "hero",
    description: "Crystal landmarks that anchor the home valley and future portal entrances.",
  },
  {
    id: "home.waterfall-field",
    realm: "home-sanctuary",
    kind: "water",
    procedural: true,
    interactive: false,
    lod: "mid",
    description: "Layered translucent waterfall ribbons and reflective water planes.",
  },
  {
    id: "ground.root-network",
    realm: "living-ground",
    kind: "terrain",
    procedural: true,
    interactive: true,
    lod: "hero",
    description: "Elevated living root paths and growth rings for the Ground realm.",
  },
  {
    id: "lifemap.star-islands",
    realm: "life-map-observatory",
    kind: "constellation",
    procedural: true,
    interactive: true,
    lod: "hero",
    description: "Floating memory islands, orbital paths, and constellation architecture around the live starfield.",
  },
  {
    id: "mirror.memory-ring",
    realm: "mirror-of-becoming",
    kind: "portal",
    procedural: true,
    interactive: true,
    lod: "hero",
    description: "Monumental reflective memory ring surrounded by layered memory monoliths.",
  },
  {
    id: "shadow.fracture-field",
    realm: "shadow-realm",
    kind: "terrain",
    procedural: true,
    interactive: true,
    lod: "hero",
    description: "Walkable fractured obsidian field with suspended shards and ember seams.",
  },
  {
    id: "passport.archive-gates",
    realm: "passport-archive",
    kind: "architecture",
    procedural: true,
    interactive: true,
    lod: "hero",
    description: "Permission archive gates and translucent identity vaults.",
  },
  {
    id: "council.luminous-presences",
    realm: "council-chamber",
    kind: "avatar",
    procedural: true,
    interactive: true,
    lod: "hero",
    description: "Six monumental light-built Council presences seated around a spatial dais.",
  },
  {
    id: "global.weather-volume",
    realm: "home-sanctuary",
    kind: "atmosphere",
    procedural: true,
    interactive: false,
    lod: "ambient",
    description: "Volumetric-feeling particle weather, aurora ribbons, and depth haze shared across realms.",
  },
] as const;

export function assetsForRealm(realm: SpatialRealmId) {
  return SPATIAL_ASSET_MANIFEST.filter((asset) => asset.realm === realm);
}

export function realmForPhase(phase: string): SpatialRealmId {
  switch (phase) {
    case "GROUND":
      return "living-ground";
    case "LIFEMAP":
      return "life-map-observatory";
    case "FOCUS":
      return "mirror-of-becoming";
    case "REPLAY":
      return "shadow-realm";
    case "PASSPORT":
      return "passport-archive";
    case "STATUS":
      return "council-chamber";
    case "ASCENT":
    case "HOME":
    default:
      return "home-sanctuary";
  }
}
