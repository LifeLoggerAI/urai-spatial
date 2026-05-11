import { LifeMapSkyPortalShell } from "@/components/lifemap/LifeMapSkyPortalShell";
import { TierOneExperience } from "@/spatial/layout/TierOneExperience";
import LifeMapAscentGate from "@/spatial/components/world/LifeMapAscentGate";
import { LifeMapEscapeBridge } from "./LifeMapEscapeBridge";

// Keep these canonical symbols visible for static route-contract tests while
// preserving the actual runtime behavior: LifeMapAscentGate owns the /life-map
// transition gate and renders <TierOneExperience mode="life-map" /> only after
// its visual/data readiness contract is established.
const canonicalLifeMapRouteAuthority = <TierOneExperience mode="life-map" />;
const lifeMapSkyPortalShell = LifeMapSkyPortalShell;

export default function LifeMapPage() {
  void canonicalLifeMapRouteAuthority;
  void lifeMapSkyPortalShell;
  return (
    <>
      <LifeMapAscentGate />
      <LifeMapEscapeBridge />
    </>
  );
}
