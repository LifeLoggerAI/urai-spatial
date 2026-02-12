
'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, CatmullRomCurve3, Camera } from 'three';
import { SpatialTransitionFSM, SpatialTransitionState } from '@/packages/spatial-core/src/fsm/SpatialTransitionFSM';

const COMMIT_DURATION_MS = 2200; // Increased for a more cinematic feel
const WARP_FOV_MULTIPLIER = 3.5;

// --- Context for exposing controller methods ---
interface ISpatialCameraContext {
  controller: SpatialCameraController | null;
  fsm: SpatialTransitionFSM | null;
  focusOnChapter: (targetNodePosition: Vector3) => void;
  returnToStarfield: () => void; // New method
}

const SpatialCameraContext = createContext<ISpatialCameraContext | null>(null);

// --- 1. The Controller Class (Engine) ---

export class SpatialCameraController {
  private fsm: SpatialTransitionFSM;
  private camera: Camera & { fov: number; updateProjectionMatrix: () => void; };
  private transitionStartTime: number | null = null;
  private commitSpline: CatmullRomCurve3 | null = null;
  private isWarping: boolean = false;
  private initialFov: number | null = null;
  private lookAtTarget: Vector3 | null = null;
  private isLookAtTransition: boolean = false;

  constructor(fsm: SpatialTransitionFSM, camera: Camera) {
    this.fsm = fsm;
    this.camera = camera as Camera & { fov: number; updateProjectionMatrix: () => void; };
  }

  public startCommit(spline: CatmullRomCurve3, isWarp: boolean = false) {
    this.commitSpline = spline;
    this.transitionStartTime = Date.now();
    this.isWarping = isWarp;
    if (isWarp) {
      this.initialFov = this.camera.fov;
    }
  }

  public focusOnChapter(targetNodePosition: Vector3) {
    if (this.fsm.state !== SpatialTransitionState.IDLE) return;
    const from = this.camera.position.clone();
    const to = targetNodePosition.clone().add(new Vector3(0, 1, 5));
    const controlPoint1 = new Vector3().lerpVectors(from, to, 0.3).add(new Vector3(5, 2, 0));
    const controlPoint2 = new Vector3().lerpVectors(from, to, 0.7).add(new Vector3(-5, -1, 0));
    const chapterSpline = new CatmullRomCurve3([from, controlPoint1, controlPoint2, to]);

    this.fsm.send('START_TRANSITION');
    this.startCommit(chapterSpline);
    this.lookAtTarget = targetNodePosition.clone();
    this.isLookAtTransition = true;
  }

  /**
   * New method to transition from anywhere back to the main starfield view.
   */
  public returnToStarfield() {
    if (this.fsm.state !== SpatialTransitionState.IDLE) return;

    const from = this.camera.position.clone();
    // A designated "home" position, slightly above origin, looking forward.
    const to = new Vector3(0, 2, 10);
    
    const controlPoint1 = new Vector3().lerpVectors(from, to, 0.25).add(new Vector3(0, 5, 0));
    const controlPoint2 = new Vector3().lerpVectors(from, to, 0.75).add(new Vector3(0, 2, -10));
    const returnSpline = new CatmullRomCurve3([from, controlPoint1, controlPoint2, to]);
    
    this.fsm.send('START_TRANSITION');
    this.startCommit(returnSpline);

    // Look towards the start of the timeline
    this.lookAtTarget = new Vector3(0, 0, 0);
    this.isLookAtTransition = true;
  }

  private onCommitComplete() {
    this.commitSpline = null;
    this.transitionStartTime = null;
    this.fsm.send('REVEAL_COMPLETE');
    if (this.isWarping) this.isWarping = false;
    if (this.isLookAtTransition) {
      this.isLookAtTransition = false;
      this.lookAtTarget = null;
    }
  }

  public update() {
    if (this.fsm.state !== SpatialTransitionState.COMMITTING || !this.commitSpline || !this.transitionStartTime) {
      if (this.initialFov && this.camera.fov !== this.initialFov) {
        this.camera.fov = this.initialFov;
        this.camera.updateProjectionMatrix();
      }
      return;
    }

    const progress = (Date.now() - this.transitionStartTime) / COMMIT_DURATION_MS;
    const easedProgress = 1 - Math.pow(1 - progress, 4);

    if (progress >= 1) {
      this.camera.position.copy(this.commitSpline.getPoint(1));
      this.onCommitComplete();
      return;
    }

    this.camera.position.copy(this.commitSpline.getPoint(easedProgress));

    if (this.isLookAtTransition && this.lookAtTarget) {
      // Smoothly interpolate the lookAt target for a more natural camera movement
      const currentLookAt = this.camera.getWorldDirection(new Vector3()).multiplyScalar(10).add(this.camera.position);
      currentLookAt.lerp(this.lookAtTarget, 0.05);
      this.camera.lookAt(this.lookAtTarget);
    }

    if (this.isWarping && this.initialFov) {
      const warpProgress = Math.sin(Math.PI * progress);
      this.camera.fov = this.initialFov + (WARP_FOV_MULTIPLIER * this.initialFov - this.initialFov) * warpProgress;
      this.camera.updateProjectionMatrix();
    }
  }
}

// --- 2. The React Provider (Interface) ---

export function SpatialCamera({ children }: { children: React.ReactNode }) {
  const { camera } = useThree();
  const fsm = useMemo(() => new SpatialTransitionFSM(), []);
  const controller = useMemo(() => new SpatialCameraController(fsm, camera), [fsm, camera]);

  useFrame(() => controller.update());

  const contextValue = useMemo(() => ({
    controller,
    fsm,
    focusOnChapter: (pos: Vector3) => controller.focusOnChapter(pos),
    returnToStarfield: () => controller.returnToStarfield(),
  }), [controller, fsm]);

  return (
    <SpatialCameraContext.Provider value={contextValue}>
      {children}
    </SpatialCameraContext.Provider>
  );
}

export const useSpatialCamera = () => {
  const context = useContext(SpatialCameraContext);
  if (!context) {
    throw new Error('useSpatialCamera must be used within a SpatialCamera provider');
  }
  return context;
};
