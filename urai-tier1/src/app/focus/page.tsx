import { Suspense } from "react";
import FocusRouteStage from "@/spatial/scene/FocusRouteStage";
import { SpatialShell } from "@/spatial/layout/SpatialShell";
import { SpatialLoadingState } from "@/spatial/components/states/SpatialStates";

export default function FocusRoute() {
  return (
    <SpatialShell mode="detail" sourceBadge="firestore" timeline={<span>Memory Detail</span>}>
      <Suspense fallback={<SpatialLoadingState />}>
        <FocusRouteStage />
      </Suspense>
    </SpatialShell>
  );
}
