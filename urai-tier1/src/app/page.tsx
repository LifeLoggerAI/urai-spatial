import { Suspense } from "react";
import SpatialSceneHomeWorld from "@/spatial/scene/SpatialSceneHomeWorld";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SpatialSceneHomeWorld />
    </Suspense>
  );
}
