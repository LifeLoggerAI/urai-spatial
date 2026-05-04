import { Suspense } from "react";
import SpatialScene from "@/spatial/scene/SpatialScene";

export default function MirrorRoute() {
  return (
    <Suspense fallback={null}>
      <SpatialScene />
    </Suspense>
  );
}
