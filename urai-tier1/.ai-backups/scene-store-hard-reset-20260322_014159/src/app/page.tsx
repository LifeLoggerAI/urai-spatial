"use client";

import { useEffect } from "react";
import SpatialScene from "../spatial/scene/SpatialScene";
import { useSceneStore } from "../spatial/state/sceneStore";

export default function Page() {
  const returnHome = useSceneStore((s) => s.returnHome);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") returnHome();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [returnHome]);

  return <SpatialScene />;
}
