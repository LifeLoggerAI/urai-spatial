import { Suspense } from "react";
import SpatialScene from "@/spatial/scene/SpatialScene";

export default function LifeMapRoute() {
  return (
    <Suspense fallback={null}>
      <SpatialScene />
    </Suspense>
  );
}
