import { MemoryNodeDetail } from "@/components/spatial/memory-node-detail";
import { demoLifeMapNodes } from "@/lib/spatial/publicSafeSpatialData";

type SpatialMemoryPageProps = {
  params: Promise<{ nodeId: string }>;
};

export default async function SpatialMemoryPage({ params }: SpatialMemoryPageProps) {
  const { nodeId } = await params;
  const node = demoLifeMapNodes.find((item) => item.id === nodeId) ?? demoLifeMapNodes[0];
  return (
    <main style={{ minHeight: "100svh", display: "grid", placeItems: "center", padding: "2rem", background: "linear-gradient(180deg,#10234b,#020711)" }}>
      <MemoryNodeDetail node={node} />
    </main>
  );
}
