"use client";

import dynamic from "next/dynamic";

const SpatialScene = dynamic(() => import("../src/spatial/scene/SpatialScene"), {
  ssr: false,
});

export default function Page() {
  return (
    <main style={{ position: "fixed", inset: 0, overflow: "hidden", background: "#000" }}>
      <SpatialScene />
    </main>
  );
}
