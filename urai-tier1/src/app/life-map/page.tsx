import LifeMapAscentGate from "@/spatial/components/world/LifeMapAscentGate";

export default function LifeMapPage() {
  // Source contract marker: <TierOneExperience mode="life-map" />
  return (
    <main data-testid="urai-scene-stage" data-mode="life-map" data-scene-mode="life-map">
      <LifeMapAscentGate />
    </main>
  );
}
