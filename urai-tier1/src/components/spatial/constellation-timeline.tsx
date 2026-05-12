import { demoConstellationEdges } from "@/lib/spatial/publicSafeSpatialData";

export function ConstellationTimeline() {
  return (
    <section aria-label="Constellation timeline">
      <h2>Constellation Timeline</h2>
      <ul>{demoConstellationEdges.map((edge) => <li key={edge.id}>{edge.relationType}: {edge.fromNodeId} → {edge.toNodeId}</li>)}</ul>
    </section>
  );
}
