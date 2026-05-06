"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const SpatialSceneClient = dynamic(() => import("../../spatial/client/SpatialSceneClient"), {
  ssr: false,
});

export default function ReplayClient() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <main>
        <h1>Replay</h1>
        <p>Loading spatial replay...</p>
      </main>
    );
  }

  return <SpatialSceneClient />;
}
