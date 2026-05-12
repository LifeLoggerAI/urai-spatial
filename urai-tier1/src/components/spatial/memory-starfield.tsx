"use client";

import { demoLifeMapNodes, demoMemoryStars } from "@/lib/spatial/publicSafeSpatialData";

type Props = { onSelect?: (nodeId: string) => void };

export function MemoryStarfield({ onSelect }: Props) {
  return (
    <div aria-label="Memory starfield" style={{ position: "relative", minHeight: "24rem" }}>
      {demoMemoryStars.map((star) => {
        const node = demoLifeMapNodes.find((item) => item.id === star.nodeId);
        return (
          <button key={star.id} type="button" onClick={() => onSelect?.(star.nodeId)} aria-label={`Open ${node?.title ?? star.label}`} style={{ position: "absolute", left: `${50 + star.position.x * 8}%`, top: `${50 - star.position.y * 7}%`, border: 0, borderRadius: 999, width: 18, height: 18, background: node?.visual.color ?? "#9fe8ff", boxShadow: `0 0 ${18 * star.brightness}px ${node?.visual.color ?? "#9fe8ff"}` }} />
        );
      })}
    </div>
  );
}
