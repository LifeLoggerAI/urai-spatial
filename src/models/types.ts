export interface SpatialMemory {
  id?: string;
  userId: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  metadata: Record<string, any>;
  timestamp: number;
}

export interface HomeWorld {
  id?: string;
  userId: string;
  worldName: string;
  config: {
    skybox: string;
    gravity: number;
    assets: string[];
  };
  lastModified: number;
}

export interface HomeWorldExplainability {
  id?: string;
  userId: string;
  reasoning: string;
  sourceEventId: string;
  timestamp: number;
}
