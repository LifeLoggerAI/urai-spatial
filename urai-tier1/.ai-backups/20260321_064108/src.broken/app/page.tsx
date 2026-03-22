import SpatialPersistenceBridge from "../spatial/persistence/SpatialPersistenceBridge";
import SpatialScene from "../spatial/scene/SpatialScene";
import SpatialAnalyticsBridge from "../spatial/telemetry/SpatialAnalyticsBridge";
import SpatialReleasePanel from "../spatial/ui/SpatialReleasePanel";

export default function Page() {
  return (
    <>
      <SpatialScene />
      <SpatialPersistenceBridge />
      <SpatialAnalyticsBridge />
      <SpatialReleasePanel />
    </>
  );
}
