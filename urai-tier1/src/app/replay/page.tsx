import { Suspense } from "react";
import SpatialScene from "@/spatial/scene/SpatialScene";

export default function ReplayRoute() {
  return (
    <Suspense fallback={null}>
      <SpatialScene />
    </Suspense>
  );
}
