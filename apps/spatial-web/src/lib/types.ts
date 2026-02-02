
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
