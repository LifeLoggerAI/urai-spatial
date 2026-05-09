import SpatialWorldCanvas from "@/spatial/components/world/SpatialWorldCanvas";

export default function LifeMapPage() {
  return (
    <div data-testid="lifemap-starfield" data-urai-spatial-stage="life-map">
      <SpatialWorldCanvas mode="life-map" />
    </div>
  );
}
