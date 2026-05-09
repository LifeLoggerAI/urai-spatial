'use client';

import type { LifeMapEdge, LifeMapNode } from './lifeMapTypes';

export function ConstellationLayer({ nodes, edges }: { nodes: LifeMapNode[]; edges: LifeMapEdge[] }) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  return (
    <svg className="urai-v1-constellation" data-testid="urai-v1-lifemap-constellation" aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none">
      {edges.map((edge) => {
        const from = nodeById.get(edge.fromNodeId);
        const to = nodeById.get(edge.toNodeId);
        if (!from || !to) return null;
        const x1 = 50 + from.position.x * 0.22;
        const y1 = 50 - from.position.y * 0.2;
        const x2 = 50 + to.position.x * 0.22;
        const y2 = 50 - to.position.y * 0.2;
        const cx = (x1 + x2) / 2 + (edge.strength - 0.5) * 8;
        const cy = (y1 + y2) / 2 - (edge.strength - 0.5) * 8;
        return (
          <path
            key={edge.id}
            d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
            stroke={edge.color}
            strokeOpacity={0.18 + edge.strength * 0.35}
            strokeWidth={0.12 + edge.strength * 0.16}
            fill="none"
            data-edge-type={edge.type}
          />
        );
      })}
    </svg>
  );
}
