"use client";

import { RefObject, useEffect } from "react";
import { SceneMode, useSceneStore } from "../state/sceneStore";

function distance(
a: Touch | null | undefined,
b: Touch | null | undefined,
): number | null {
if (!a || !b) return null;
const dx = a.clientX - b.clientX;
const dy = a.clientY - b.clientY;
return Math.hypot(dx, dy);
}

export function useGestures(
containerRef: RefObject<HTMLElement | null>,
mode: SceneMode,
): void {
const goHome = useSceneStore((s) => s.goHome);
const goSky = useSceneStore((s) => s.goSky);
const goGround = useSceneStore((s) => s.goGround);
const exitReplay = useSceneStore((s) => s.exitReplay);
const exitObject = useSceneStore((s) => s.exitObject);
const enterReplay = useSceneStore((s) => s.enterReplay);

useEffect(() => {
const el = containerRef.current;
if (!el) return;

let startY: number | null = null;
let startDistance: number | null = null;

const onWheel = (event: WheelEvent): void => {
  if (Math.abs(event.deltaY) < 6) return;

  if (mode === "lifemap" && event.deltaY < 0) {
    goHome();
    return;
  }
  if (mode === "ground" && event.deltaY < 0) {
    goHome();
    return;
  }
  if (mode === "focus" && event.deltaY > 0) {
    enterReplay();
    return;
  }
  if (mode === "replay" && event.deltaY < 0) {
    exitReplay();
    return;
  }
  if (mode === "object" && event.deltaY < 0) {
    exitObject();
    return;
  }
  if (mode === "home" && event.deltaY > 0) {
    goSky();
    return;
  }
  if (mode === "home" && event.deltaY < 0) {
    goGround();
  }
};

const onTouchStart = (event: TouchEvent): void => {
  startY = event.touches[0]?.clientY ?? null;
  startDistance = distance(event.touches[0], event.touches[1]);
};

const onTouchMove = (event: TouchEvent): void => {
  const currentY = event.touches[0]?.clientY ?? null;
  if (currentY !== null && startY !== null) {
    const deltaY = currentY - startY;

    if (mode === "lifemap" && deltaY > 50) {
      goHome();
      startY = null;
      return;
    }
    if (mode === "ground" && deltaY < -50) {
      goHome();
      startY = null;
      return;
    }
    if (mode === "focus" && deltaY < -50) {
      enterReplay();
      startY = null;
      return;
    }
    if (mode === "replay" && deltaY > 50) {
      exitReplay();
      startY = null;
      return;
    }
    if (mode === "object" && deltaY > 50) {
      exitObject();
      startY = null;
      return;
    }
  }

  const nextDistance = distance(event.touches[0], event.touches[1]);
  if (startDistance !== null && nextDistance !== null) {
    const pinchDelta = nextDistance - startDistance;

    if (mode === "lifemap" && pinchDelta < -24) {
      goHome();
      startDistance = null;
      return;
    }
    if (mode === "ground" && pinchDelta > 24) {
      goHome();
      startDistance = null;
      return;
    }
    if (mode === "focus" && pinchDelta > 24) {
      enterReplay();
      startDistance = null;
      return;
    }
    if (mode === "replay" && pinchDelta < -24) {
      exitReplay();
      startDistance = null;
    }
  }
};

el.addEventListener("wheel", onWheel, { passive: true });
el.addEventListener("touchstart", onTouchStart, { passive: true });
el.addEventListener("touchmove", onTouchMove, { passive: true });

return () => {
  el.removeEventListener("wheel", onWheel);
  el.removeEventListener("touchstart", onTouchStart);
  el.removeEventListener("touchmove", onTouchMove);
};

}, [containerRef, mode, goHome, goSky, goGround, exitReplay, exitObject, enterReplay]);
}
