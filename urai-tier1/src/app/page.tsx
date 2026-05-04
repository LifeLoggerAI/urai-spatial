import { Suspense } from "react";
import SpatialScene from "@/spatial/scene/SpatialScene";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SpatialScene />
    </Suspense>
  );
}
