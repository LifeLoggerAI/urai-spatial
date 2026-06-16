'use client';

import { useReducer } from 'react';
import type { UnifiedCameraMode } from './UnifiedCameraTypes';
import {
  createUnifiedCameraState,
  unifiedCameraReducer,
} from './unifiedCameraReducer';

export function useUnifiedCamera(initialMode: UnifiedCameraMode = 'home') {
  return useReducer(
    unifiedCameraReducer,
    initialMode,
    createUnifiedCameraState,
  );
}
