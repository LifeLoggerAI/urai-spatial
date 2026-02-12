'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, CatmullRomCurve3, Camera } from 'three';
import { SpatialTransitionFSM, SpatialTransitionState } from '@/packages/spatial-core/src/fsm/SpatialTransitionFSM';

const COMMIT_DURATION_MS = 1400; // Fixed duration for the cinematic zoom

// --- 1. The Controller Class (Engine)

export class SpatialCameraController {
  private fsm: SpatialTransitionFSM;
  private camera: Camera;
  private transitionStartTime: number | null = null;
  private commitSpline: CatmullRomCurve3 | null = null;

  constructor(fsm: SpatialTransitionFSM, camera: Camera) {
    this.fsm = fsm;
    this.camera = camera;
  }

  public startCommit(start: Vector3, end: Vector3) {
    this.commitSpline = new CatmullRomCurve3([
      start,
      start.clone().lerp(end, 0.5).add(new Vector3(0, 2, 0)),
      end
    ]);
    this.transitionStartTime = performance.now();
  }

  public update() {
    if (this.fsm.state === SpatialTransitionState.COMMITTING && this.commitSpline && this.transitionStartTime) {
      const now = performance.now();
      const t = Math.min((now - this.transitionStartTime) / COMMIT_DURATION_MS, 1.0);
      const newPosition = this.commitSpline.getPoint(t);
      this.camera.position.copy(newPosition);

      if (t >= 1.0) {
        this.commitSpline = null;
        this.transitionStartTime = null;
        this.fsm.next(); // COMMITTING -> PRELOADING
      }
    }
  }
}

// --- 2. React Context (Wiring)

interface ISpatialCameraContext {
  fsm: SpatialTransitionFSM;
  controller: SpatialCameraController | null;
}

const SpatialCameraContext = createContext<ISpatialCameraContext | null>(null);

export const useSpatialCamera = () => {
  const context = useContext(SpatialCameraContext);
  if (!context) {
    throw new Error('useSpatialCamera must be used within a SpatialCameraProvider');
  }
  return context;
};

// --- 3. The React Component (Chassis)

export const SpatialCamera = ({ children }: { children: React.ReactNode }) => {
  const camera = useThree(state => state.camera);
  const { fsm, controller } = useMemo(() => {
    const fsm = new SpatialTransitionFSM();
    const controller = new SpatialCameraController(fsm, camera);
    return { fsm, controller };
  }, [camera]);

  useFrame(() => {
    controller.update();
  });

  return (
    <SpatialCameraContext.Provider value={{ fsm, controller }}>
      {children}
    </SpatialCameraContext.Provider>
  );
};
