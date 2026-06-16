import {
  CAMERA_PRESETS,
  priorityRank,
} from './cameraPresets';
import type {
  CameraAuthority,
  CameraPriority,
  UnifiedCameraAction,
  UnifiedCameraMode,
  UnifiedCameraPose,
  UnifiedCameraState,
} from './UnifiedCameraTypes';

const DEFAULT_AUTHORITY: CameraAuthority = {
  writer: 'initial',
  priority: 'base',
  rank: priorityRank('base'),
};

function authority(writer = 'unknown', priority: CameraPriority = 'scene'): CameraAuthority {
  return {
    writer,
    priority,
    rank: priorityRank(priority),
  };
}

function mergePose(
  current: UnifiedCameraPose,
  next: Partial<UnifiedCameraPose>,
): UnifiedCameraPose {
  return {
    position: next.position ?? current.position,
    target: next.target ?? current.target,
    fov: next.fov ?? current.fov,
    near: next.near ?? current.near,
    far: next.far ?? current.far,
    damping: next.damping ?? current.damping,
  };
}

function canWritePose(
  state: UnifiedCameraState,
  nextAuthority: CameraAuthority,
): boolean {
  if (state.xrActive && nextAuthority.priority !== 'xr') {
    return false;
  }

  if (state.locked && nextAuthority.priority !== 'lock' && nextAuthority.priority !== 'xr') {
    return false;
  }

  return nextAuthority.rank >= state.authority.rank || state.authority.priority === 'base';
}

export function createUnifiedCameraState(
  mode: UnifiedCameraMode = 'home',
): UnifiedCameraState {
  return {
    mode,
    previousMode: null,
    pose: CAMERA_PRESETS[mode],
    locked: false,
    xrActive: mode === 'xr',
    transition: null,
    authority: DEFAULT_AUTHORITY,
    lastWriter: 'initial',
  };
}

export function unifiedCameraReducer(
  state: UnifiedCameraState,
  action: UnifiedCameraAction,
): UnifiedCameraState {
  switch (action.type) {
    case 'CAMERA/SET_MODE': {
      const writer = action.writer ?? 'set-mode';
      return {
        ...state,
        mode: action.mode,
        previousMode: state.mode,
        pose: CAMERA_PRESETS[action.mode],
        transition: null,
        authority: authority(writer, action.mode === 'xr' ? 'xr' : 'scene'),
        xrActive: action.mode === 'xr',
        lastWriter: writer,
      };
    }

    case 'CAMERA/REQUEST_POSE': {
      const nextAuthority = authority(action.writer, action.priority ?? 'scene');

      if (!canWritePose(state, nextAuthority)) {
        return state;
      }

      return {
        ...state,
        pose: mergePose(state.pose, action.pose),
        authority: nextAuthority,
        lastWriter: action.writer,
      };
    }

    case 'CAMERA/FOCUS_TARGET': {
      const nextAuthority = authority(action.writer, 'lock');

      if (!canWritePose(state, nextAuthority)) {
        return state;
      }

      return {
        ...state,
        pose: {
          ...state.pose,
          target: action.target,
        },
        authority: nextAuthority,
        lastWriter: action.writer,
      };
    }

    case 'CAMERA/LOCK': {
      const writer = action.writer ?? 'lock';
      return {
        ...state,
        locked: true,
        authority: authority(writer, 'lock'),
        lastWriter: writer,
      };
    }

    case 'CAMERA/UNLOCK': {
      const writer = action.writer ?? 'unlock';
      return {
        ...state,
        locked: false,
        authority: authority(writer, 'scene'),
        lastWriter: writer,
      };
    }

    case 'CAMERA/XR_START': {
      const writer = action.writer ?? 'xr-start';
      return {
        ...state,
        mode: 'xr',
        previousMode: state.mode,
        xrActive: true,
        locked: true,
        pose: mergePose(CAMERA_PRESETS.xr, action.pose ?? {}),
        transition: null,
        authority: authority(writer, 'xr'),
        lastWriter: writer,
      };
    }

    case 'CAMERA/XR_END': {
      const writer = action.writer ?? 'xr-end';
      const returnMode = state.previousMode && state.previousMode !== 'xr'
        ? state.previousMode
        : 'home';

      return {
        ...state,
        mode: returnMode,
        previousMode: 'xr',
        xrActive: false,
        locked: false,
        pose: CAMERA_PRESETS[returnMode],
        transition: null,
        authority: authority(writer, 'scene'),
        lastWriter: writer,
      };
    }

    case 'CAMERA/TRANSITION_TO': {
      const writer = action.writer ?? 'transition';
      const now = Date.now();

      return {
        ...state,
        previousMode: state.mode,
        mode: 'transition',
        transition: {
          from: state.mode,
          to: action.mode,
          startedAt: now,
          durationMs: action.durationMs ?? 650,
          progress: 0,
        },
        authority: authority(writer, 'cinematic'),
        lastWriter: writer,
      };
    }

    case 'CAMERA/TICK_TRANSITION': {
      if (!state.transition) {
        return state;
      }

      const elapsed = Math.max(0, action.now - state.transition.startedAt);
      const progress = Math.min(1, elapsed / state.transition.durationMs);

      if (progress >= 1) {
        const targetMode = state.transition.to;

        return {
          ...state,
          mode: targetMode,
          previousMode: state.transition.from,
          pose: CAMERA_PRESETS[targetMode],
          transition: null,
          authority: authority('transition-complete', targetMode === 'xr' ? 'xr' : 'scene'),
          xrActive: targetMode === 'xr',
          lastWriter: 'transition-complete',
        };
      }

      return {
        ...state,
        transition: {
          ...state.transition,
          progress,
        },
        pose: CAMERA_PRESETS[state.transition.to],
        lastWriter: 'transition-tick',
      };
    }

    default:
      return state;
  }
}
