export type Vec3 = readonly [number, number, number];

export type UnifiedCameraMode =
  | 'home'
  | 'lifeMap'
  | 'replay'
  | 'focus'
  | 'place'
  | 'xr'
  | 'transition';

export type CameraPriority = 'base' | 'cinematic' | 'scene' | 'lock' | 'xr';

export interface UnifiedCameraPose {
  position: Vec3;
  target: Vec3;
  fov: number;
  near: number;
  far: number;
  damping: number;
}

export interface CameraAuthority {
  writer: string;
  priority: CameraPriority;
  rank: number;
}

export interface UnifiedCameraTransition {
  from: UnifiedCameraMode;
  to: UnifiedCameraMode;
  startedAt: number;
  durationMs: number;
  progress: number;
}

export interface UnifiedCameraState {
  mode: UnifiedCameraMode;
  previousMode: UnifiedCameraMode | null;
  pose: UnifiedCameraPose;
  locked: boolean;
  xrActive: boolean;
  transition: UnifiedCameraTransition | null;
  authority: CameraAuthority;
  lastWriter: string;
}

export type UnifiedCameraAction =
  | { type: 'CAMERA/SET_MODE'; mode: UnifiedCameraMode; writer?: string }
  | {
      type: 'CAMERA/REQUEST_POSE';
      pose: Partial<UnifiedCameraPose>;
      writer: string;
      priority?: CameraPriority;
    }
  | { type: 'CAMERA/FOCUS_TARGET'; target: Vec3; writer: string }
  | { type: 'CAMERA/LOCK'; writer?: string }
  | { type: 'CAMERA/UNLOCK'; writer?: string }
  | { type: 'CAMERA/XR_START'; pose?: Partial<UnifiedCameraPose>; writer?: string }
  | { type: 'CAMERA/XR_END'; writer?: string }
  | {
      type: 'CAMERA/TRANSITION_TO';
      mode: UnifiedCameraMode;
      durationMs?: number;
      writer?: string;
    }
  | { type: 'CAMERA/TICK_TRANSITION'; now: number };
