import { Suspense } from "react";
import SpatialScene from "@/spatial/scene/SpatialScene";
import { SpatialShell } from "@/spatial/layout/SpatialShell";
import { SpatialLoadingState } from "@/spatial/components/states/SpatialStates";

export default function ReplayRoute() {
  return (
    <SpatialShell mode="replay" sourceBadge="firestore" timeline={<span>Replay Mode</span>}>
      <Suspense fallback={<SpatialLoadingState />}>
        <SpatialScene />
      </Suspense>
    </SpatialShell>
  );
}
