import type { SpatialMode, SpatialState, UserSpatialPreferences } from './lifeMapTypes';

export type SpatialEvent =
  | { type: 'OPEN_SKY' }
  | { type: 'ASCENT_COMPLETE' }
  | { type: 'SELECT_NODE'; nodeId: string }
  | { type: 'CLOSE_NODE' }
  | { type: 'START_REPLAY'; replayPathId: string }
  | { type: 'STOP_REPLAY' }
  | { type: 'OPEN_MIRROR'; mirrorStateId?: string }
  | { type: 'CLOSE_MIRROR' }
  | { type: 'RETURN_HOME' }
  | { type: 'ESCAPE' }
  | { type: 'REDUCED_MOTION_ASCENT' };

export const defaultPreferences: UserSpatialPreferences = {
  motionMode: 'full',
  highContrast: false,
  hiddenNodeTypes: [],
  showNarratorCaptions: true,
  showWhyThis: true,
  allowHaptics: false,
  defaultPrivacyLevel: 'privateSummary',
};

export const initialSpatialState: SpatialState = {
  mode: 'home',
  navigationStack: [],
  preferences: defaultPreferences,
};

function push(stack: SpatialMode[], mode: SpatialMode) {
  return [...stack, mode].slice(-8);
}

export function reduceSpatialState(state: SpatialState, event: SpatialEvent): SpatialState {
  switch (event.type) {
    case 'OPEN_SKY':
      return { ...state, mode: 'ascent', previousMode: state.mode, navigationStack: push(state.navigationStack, state.mode) };
    case 'REDUCED_MOTION_ASCENT':
    case 'ASCENT_COMPLETE':
      return { ...state, mode: 'lifeMap', previousMode: 'ascent', navigationStack: push(state.navigationStack, 'ascent') };
    case 'SELECT_NODE':
      return { ...state, mode: 'focus', selectedNodeId: event.nodeId, previousMode: state.mode, navigationStack: push(state.navigationStack, state.mode) };
    case 'CLOSE_NODE':
      return { ...state, mode: 'lifeMap', selectedNodeId: undefined, previousMode: 'focus' };
    case 'START_REPLAY':
      if (!state.selectedNodeId) return state;
      return { ...state, mode: 'replay', activeReplayPathId: event.replayPathId, previousMode: 'focus', navigationStack: push(state.navigationStack, 'focus') };
    case 'STOP_REPLAY':
      return { ...state, mode: 'focus', activeReplayPathId: undefined, previousMode: 'replay' };
    case 'OPEN_MIRROR':
      return { ...state, mode: 'mirror', activeMirrorStateId: event.mirrorStateId, previousMode: state.mode, navigationStack: push(state.navigationStack, state.mode) };
    case 'CLOSE_MIRROR': {
      const previous = state.navigationStack.at(-1) ?? state.previousMode ?? 'home';
      return { ...state, mode: previous, activeMirrorStateId: undefined, navigationStack: state.navigationStack.slice(0, -1), previousMode: 'mirror' };
    }
    case 'RETURN_HOME':
      return { ...state, mode: 'returning', previousMode: state.mode, navigationStack: push(state.navigationStack, state.mode), selectedNodeId: undefined, activeReplayPathId: undefined, activeMirrorStateId: undefined };
    case 'ESCAPE':
      if (state.mode === 'mirror') return reduceSpatialState(state, { type: 'CLOSE_MIRROR' });
      if (state.mode === 'replay') return reduceSpatialState(state, { type: 'STOP_REPLAY' });
      if (state.mode === 'focus') return reduceSpatialState(state, { type: 'CLOSE_NODE' });
      if (state.mode === 'lifeMap' || state.mode === 'ascent') return { ...initialSpatialState, preferences: state.preferences };
      if (state.mode === 'returning') return { ...initialSpatialState, preferences: state.preferences };
      return state;
    default:
      return state;
  }
}

export function describeSpatialMode(mode: SpatialMode) {
  const copy: Record<SpatialMode, string> = {
    home: 'Home is the embodied present.',
    ascent: 'Ascent is the sky opening into memory-depth.',
    lifeMap: 'Life Map is the living galaxy of becoming.',
    focus: 'Focus is a star becoming a memory portal.',
    replay: 'Replay is a light path through a symbolic life thread.',
    mirror: 'Mirror reflects the pattern of becoming.',
    returning: 'Returning reforms the present world.',
  };
  return copy[mode];
}
