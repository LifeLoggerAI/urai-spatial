import { Timestamp } from 'firebase/firestore';

export interface SpatialScene {
  name: string;
  type: 'lifeMap' | 'ritualAR' | 'planetarium' | 'companion';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  config: {
    seed: number;
    starDensity: number;
    dome: boolean;
    cameraPreset: 'OVERVIEW' | 'FOCUS' | 'ORBIT';
    allowedModes: ('xr' | 'desktop')[];
  };
}

export interface SpatialAnchor {
  sceneId: string;
  kind: 'star' | 'ritual' | 'dreamSymbol';
  position: { x: number; y: number; z: number };
  radius: number;
  label: string;
  ref: {
    targetType: 'memory' | 'ritual' | 'replay' | 'dream';
    targetId: string;
  };
  visibility: 'private' | 'publicPreview';
}

export interface SpatialSession {
  uid: string;
  sceneId: string;
  startedAt: Timestamp;
  endedAt: Timestamp;
  device: {
    xrSupported: boolean;
    mode: 'xr' | 'desktop';
    userAgent: string;
  };
  metrics: {
    selects: number;
    durationMs: number;
    fpsAvg: number;
  };
}

export interface SpatialAuditLog {
  ts: Timestamp;
  uid: string;
  action: string;
  resource: string;
  meta: any;
}
