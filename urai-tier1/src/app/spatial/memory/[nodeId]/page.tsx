import { MemoryNodeDetail } from "@/components/spatial/memory-node-detail";
import { demoLifeMapNodes } from "@/lib/spatial/publicSafeSpatialData";
import { DEMO_MEMORY_STAR_NODES } from '@/spatial/memory/memoryStarSchema'

type SpatialMemoryPageProps = {
  params: Promise<{ nodeId: string }>;
};

export function generateStaticParams() {
  return DEMO_MEMORY_STAR_NODES.map((star) => ({
    nodeId: star.id,
  }))
}

export default async function SpatialMemoryPage({ params }: SpatialMemoryPageProps) {
  const { nodeId } = await params;
  const node = demoLifeMapNodes.find((item) => item.id === nodeId) ?? demoLifeMapNodes[0];
  return (
    <main style={{ minHeight: "100svh", display: "grid", placeItems: "center", padding: "2rem", background: "linear-gradient(180deg,#10234b,#020711)" }}>
      <MemoryNodeDetail node={node} />
    </main>
  );
}
