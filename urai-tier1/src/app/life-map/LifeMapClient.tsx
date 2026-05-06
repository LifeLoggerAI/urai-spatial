"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const SpatialSceneClient = dynamic(() => import("../../spatial/client/SpatialSceneClient"), {
  ssr: false,
});

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
