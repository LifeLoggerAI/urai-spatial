"use client";

import dynamic from "next/dynamic";

const SpatialScene = dynamic(
  () => import("../spatial/scene/SpatialScene"),
  { ssr: false }
);

export default function Page() {
  return (
    <main style={{ width: "100vw", height: "100vh", margin: 0 }}>
      <SpatialScene />
    </main>
  );
}
