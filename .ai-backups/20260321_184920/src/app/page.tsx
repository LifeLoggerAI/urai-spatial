"use client";

import SpatialScene from "../spatial/scene/SpatialScene";
import SpatialPersistenceBridge from "../spatial/persistence/SpatialPersistenceBridge";
import SpatialAnalyticsBridge from "../spatial/telemetry/SpatialAnalyticsBridge";
import UnityRuntimePayloadBridge from "../spatial/unity/UnityRuntimePayloadBridge";
import SpatialReleasePanel from "../spatial/ui/SpatialReleasePanel";

export default function Page() {
  return (
    <main style={{ width: "100vw", height: "100vh", overflow: "hidden", background: "#02089b" }}>
      <SpatialPersistenceBridge />
      <SpatialAnalyticsBridge />
      <UnityRuntimePayloadBridge />
      <SpatialReleasePanel />
      <SpatialScene />
    </main>
  );
}
