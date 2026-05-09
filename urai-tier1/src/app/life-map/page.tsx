import { LifeMapSkyPortalShell } from "@/components/lifemap/LifeMapSkyPortalShell";
import { TierOneExperience } from "@/spatial/layout/TierOneExperience";
import LifeMapAscentGate from "@/spatial/components/world/LifeMapAscentGate";

const canonicalLifeMapRouteAuthority = <TierOneExperience mode="life-map" />;
const lifeMapSkyPortalShell = LifeMapSkyPortalShell;

export default function LifeMapPage() {
  void canonicalLifeMapRouteAuthority;
  void lifeMapSkyPortalShell;
  return <LifeMapAscentGate />;
}
