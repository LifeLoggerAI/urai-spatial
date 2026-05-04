import { Suspense } from "react";
import SpatialScene from "@/spatial/scene/SpatialScene";

export default function FocusRoute() {
  return (
    <Suspense fallback={null}>
      <SpatialScene />
    </Suspense>
  );
}
