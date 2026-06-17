import { TierOneExperience } from "@/spatial/layout/TierOneExperience";

export default function LifeMapPage() {
  // Canonical V1 Life Map entry: route shell stays stable, runtime lives in TierOneExperience.
  return <TierOneExperience mode="life-map" />;
}
