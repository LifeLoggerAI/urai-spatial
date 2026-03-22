import SpatialScene from "../spatial/scene/SpatialScene";
import SpatialAnalyticsBridge from "../spatial/telemetry/SpatialAnalyticsBridge";
import SpatialPersistenceBridge from "../spatial/persistence/SpatialPersistenceBridge";
import UnityRuntimePayloadBridge from "../spatial/unity/UnityRuntimePayloadBridge";
import SpatialReleasePanel from "../spatial/ui/SpatialReleasePanel";

export default function Page() {
  return (
    <>
      <SpatialScene />
      <SpatialAnalyticsBridge />
      <SpatialPersistenceBridge />
      <UnityRuntimePayloadBridge />
      <SpatialReleasePanel />
    </>
  );
}
