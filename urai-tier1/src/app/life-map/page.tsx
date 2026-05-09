import { TierOneExperience } from "@/spatial/layout/TierOneExperience";
import { LifeMapAscentGate } from "@/spatial/lifemap/LifeMapAscentGate";

export default function LifeMapPage() {
  return (
    <LifeMapAscentGate>
      <TierOneExperience mode="life-map" />
    </LifeMapAscentGate>
  );
}
