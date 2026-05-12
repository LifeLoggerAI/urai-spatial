import { MemoryNodeDetail } from "@/components/spatial/memory-node-detail";
import { demoLifeMapNodes } from "@/lib/spatial/publicSafeSpatialData";

export default function SpatialMemoryPage({ params }: { params: { nodeId: string } }) {
  const node = demoLifeMapNodes.find((item) => item.id === params.nodeId) ?? demoLifeMapNodes[0];
  return (
    <main style={{ minHeight: "100svh", display: "grid", placeItems: "center", padding: "2rem", background: "linear-gradient(180deg,#10234b,#020711)" }}>
      <MemoryNodeDetail node={node} />
    </main>
  );
}
