"use client";

import { useEffect, useState } from "react";
import SpatialSceneClient from "@/spatial/client/SpatialSceneClient";

export default function LifeMapClient() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <main>
        <h1>Life Map</h1>
        <p>Loading spatial scene...</p>
      </main>
    );
  }

  return <SpatialSceneClient />;
}
