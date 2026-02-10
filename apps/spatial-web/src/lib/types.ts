

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Transform {
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
}

export interface Component {
  kind: string;
  data: any;
}

export interface Entity {
  id: string;
  type: string;
  name: string;
  tags: string[];
  transform: Transform;
  components: Component[];
}

export interface Asset {
  assetId: string;
  kind: string;
  uri: string;
  buildRef: string;
}

export interface Scene {
  schemaVersion: string;
  sceneId: string;
  worldId: string;
  name: string;
  slug: string;
  description: string;
  units: string;
  time: {
    defaultTimescale: number;
    fixedDelta: number;
  };
  environment: {
    skybox: {
      type: string;
      assetRef: string;
      intensity: number;
    };
    fog: {
      type: string;
      density: number;
      near: number;
      far: number;
    };
    postFX: {
      bloom: {
        enabled: boolean;
        strength: number;
      };
      chromaticAberration: {
        enabled: boolean;
        amount: number;
      };
    };
  };
  entrypoint: {
    type: string;
    entityId: string;
  };
  assets: Asset[];
  entities: Entity[];
}

export type Memory = Entity & {
  emotionalWeight: number;
  recency: number;
  intensity: number;
  archetype: string;
  activeRelevance: boolean;
  constellationId?: string;

  // STEP 1: Implicit Narrative Fields
  resonance?: number; // 0.0–1.0
  gravity?: number; // 0.0–1.0
  silenceWeight?: number; // 0.0–1.0
  orbitBias?: "inward" | "outward" | "drift";
  lightTemperature?: "cool" | "neutral" | "warm";
};
