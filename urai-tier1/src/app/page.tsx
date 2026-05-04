import { Suspense } from "react";
import SpatialHomeWorld from "@/spatial/home/SpatialHomeWorld";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SpatialHomeWorld />
    </Suspense>
  );
}
