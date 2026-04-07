"use client";

import { useEffect } from "react";
import { useSceneStore } from "../state/sceneStore";

export default function SceneController() {
  const { mode, setMode } = useSceneStore();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;

      if (mode === "home") {
        setMode("sky");
      } else if (mode === "lifemap") {
        setMode("home");
      } else if (mode === "focus") {
        useSceneStore.setState({ selectedStar: null });
        setMode("lifemap");
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, setMode]);

  return null;
}
