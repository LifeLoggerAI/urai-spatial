import { TierOneExperience } from "@/spatial/layout/TierOneExperience";
import { LifeMapAscentGate } from "@/spatial/lifemap/LifeMapAscentGate";
import { LifeMapSkyPortalShell } from "@/components/lifemap/LifeMapSkyPortalShell";

export const canonicalLifeMapRouteAuthority = <TierOneExperience mode="life-map" />;
export const lifeMapSkyPortalShell = LifeMapSkyPortalShell;

export default function LifeMapPage() {
  return (
    <LifeMapAscentGate>
      <TierOneExperience mode="life-map" />
    </LifeMapAscentGate>
  );
}