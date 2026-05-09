import { TierOneExperience } from "@/spatial/layout/TierOneExperience";
import LifeMapTrustLoop from "@/spatial/lifemap/LifeMapTrustLoop";

export default function LifeMapPage() {
  return (
    <>
      <TierOneExperience mode="life-map" />
      <LifeMapTrustLoop />
    </>
  );
}
