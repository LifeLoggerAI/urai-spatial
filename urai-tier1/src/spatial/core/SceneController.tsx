"use client";

import { useEffect } from "react";
import { useSceneStore } from "../state/sceneStore";

export default function SceneController() {
  const { mode, setMode, setSelectedStar } = useSceneStore();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;

      if (mode === "home") {
        setMode("lifemap");
      } else if (mode === "lifemap") {
        setMode("home");
      } else if (mode === "focus") {
        setSelectedStar(null);
        setMode("lifemap");
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, setMode, setSelectedStar]);

  return null;
}
