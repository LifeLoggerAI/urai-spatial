// CAMERA AUTHORITY LOCK: XR disabled for Tier1 canonical mode
"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useArPlacementStore } from "@/spatial/xr/arPlacementStore";
import {
  createEmptyArPlacementPose,
  type ArPlacementPose,
} from "@/spatial/xr/arPlacementTypes";

type AnyXR = any;

function samePose(a: ArPlacementPose, b: ArPlacementPose): boolean {
  return (
    a.visible === b.visible &&
    a.hasPlane === b.hasPlane &&
    a.x === b.x &&
    a.y === b.y &&
    a.z === b.z &&
    a.qx === b.qx &&
    a.qy === b.qy &&
    a.qz === b.qz &&
    a.qw === b.qw
  );
}

export default function ArHitTestBridge() {
  const gl = useThree((s) => s.gl as AnyXR);
  const camera = useThree((s) => s.camera as any);
  const setPose = useArPlacementStore((s) => s.setPose);
  const reset = useArPlacementStore((s) => s.reset);

  const hitTestSourceRef = useRef<any>(null);
  const refSpaceRef = useRef<any>(null);
  const viewerSpaceRef = useRef<any>(null);
  const sessionRef = useRef<any>(null);
  const lastPoseRef = useRef<ArPlacementPose>(createEmptyArPlacementPose());

  useEffect(() => {
    const xr = gl?.xr;
    if (!xr) return;

    const onEnd = () => {
      hitTestSourceRef.current = null;
      refSpaceRef.current = null;
      viewerSpaceRef.current = null;
      sessionRef.current = null;
      lastPoseRef.current = createEmptyArPlacementPose();
      reset();
    };

    const setup = async () => {
      const session = xr.getSession?.();
      if (!session || session === sessionRef.current) return;
      sessionRef.current = session;

      try {
        const refSpace =
          (await session.requestReferenceSpace?.("local-floor")) ||
          (await session.requestReferenceSpace?.("local")) ||
          null;

        const viewerSpace = (await session.requestReferenceSpace?.("viewer")) || null;

        if (session.requestHitTestSource && viewerSpace) {
          const source = await session.requestHitTestSource({ space: viewerSpace });
          hitTestSourceRef.current = source || null;
        }

        refSpaceRef.current = refSpace;
        viewerSpaceRef.current = viewerSpace;

        session.addEventListener?.("end", onEnd);
      } catch (_err) {
        hitTestSourceRef.current = null;
        refSpaceRef.current = null;
        viewerSpaceRef.current = null;
      }
    };

    const maybeSetup = () => {
      if (xr.isPresenting) {
        void setup();
      } else {
        onEnd();
      }
    };

    maybeSetup();

    xr.addEventListener?.("sessionstart", maybeSetup);
    xr.addEventListener?.("sessionend", onEnd);

    return () => {
      xr.removeEventListener?.("sessionstart", maybeSetup);
      xr.removeEventListener?.("sessionend", onEnd);
      sessionRef.current?.removeEventListener?.("end", onEnd);
      onEnd();
    };
  }, [gl, reset]);

  useFrame(() => {
    const xr = gl?.xr;
    if (!xr?.isPresenting) {
      const empty = createEmptyArPlacementPose();
      if (!samePose(lastPoseRef.current, empty)) {
        lastPoseRef.current = empty;
        setPose(empty);
      }
      return;
    }

    const frame = xr.getFrame?.();
    const refSpace = refSpaceRef.current;
    const hitTestSource = hitTestSourceRef.current;

    if (!frame || !refSpace || !hitTestSource) {
      const fallback: ArPlacementPose = {
        visible: false,
        x: camera?.position?.x ?? 0,
        y: (camera?.position?.y ?? 0) - 1.25,
        z: (camera?.position?.z ?? 0) - 2,
        qx: 0,
        qy: 0,
        qz: 0,
        qw: 1,
        hasPlane: false,
      };
      if (!samePose(lastPoseRef.current, fallback)) {
        lastPoseRef.current = fallback;
        setPose(fallback);
      }
      return;
    }

    const results = frame.getHitTestResults?.(hitTestSource) ?? [];
    if (results.length > 0) {
      const pose = results[0].getPose?.(refSpace);
      const t = pose?.transform;
      if (t?.position && t?.orientation) {
        const next: ArPlacementPose = {
          visible: true,
          x: Number(t.position.x ?? 0),
          y: Number(t.position.y ?? 0),
          z: Number(t.position.z ?? 0),
          qx: Number(t.orientation.x ?? 0),
          qy: Number(t.orientation.y ?? 0),
          qz: Number(t.orientation.z ?? 0),
          qw: Number(t.orientation.w ?? 1),
          hasPlane: true,
        };
        if (!samePose(lastPoseRef.current, next)) {
          lastPoseRef.current = next;
          setPose(next);
        }
        return;
      }
    }

    const none = createEmptyArPlacementPose();
    if (!samePose(lastPoseRef.current, none)) {
      lastPoseRef.current = none;
      setPose(none);
    }
  });

  return null;
}
