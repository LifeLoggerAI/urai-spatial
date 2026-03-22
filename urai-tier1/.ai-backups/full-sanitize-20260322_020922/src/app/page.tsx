"use client";

import { useEffect } from "react";
import SpatialScene from "../spatial/scene/SpatialScene";
import { useSceneStore } from "../spatial/state/sceneStore";

export default function Page() {
  const returnHome = useSceneStore((s) => s.returnHome);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") returnHome();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [returnHome]);

  return <SpatialScene />;
}
