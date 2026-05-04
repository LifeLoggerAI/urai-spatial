import { Suspense } from "react";
import Tier5ReplayScene from "@/spatial/scene/Tier5ReplayScene";
import { SpatialShell } from "@/spatial/layout/SpatialShell";
import { SpatialLoadingState } from "@/spatial/components/states/SpatialStates";

export default function ReplayRoute() {
  return (
    <SpatialShell mode="replay" sourceBadge="firestore" timeline={<span>Replay Mode</span>}>
      <Suspense fallback={<SpatialLoadingState />}>
        <Tier5ReplayScene />
      </Suspense>
    </SpatialShell>
  );
}
