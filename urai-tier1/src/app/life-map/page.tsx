import { Suspense } from "react";
import SpatialScene from "@/spatial/scene/SpatialScene";
import { SpatialShell } from "@/spatial/layout/SpatialShell";
import { SpatialLoadingState } from "@/spatial/components/states/SpatialStates";

export default function LifeMapRoute() {
  return (
    <SpatialShell mode="overview" sourceBadge="firestore" timeline={<span>Life Map</span>}>
      <Suspense fallback={<SpatialLoadingState />}>
        <SpatialScene />
      </Suspense>
    </SpatialShell>
  );
}
