"use client";

import dynamic from "next/dynamic";

const SpatialScene = dynamic(() => import("../scene/SpatialScene"), {
  ssr: false,
  loading: () => null,
});

export default function SpatialSceneClient() {
  return <SpatialScene />;
}
