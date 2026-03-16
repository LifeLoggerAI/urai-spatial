import seed from "../data/memory-seed.json";
import type { MemoryNode } from "../types/memory";
import type { SpatialStar } from "../data/stars";

const records = seed as MemoryNode[];

function pos(i: number): [number, number, number] {
  const angle = (i / Math.max(records.length, 1)) * Math.PI * 2;
  const r = 16 + i * 2.5;
  return [
    Math.round(Math.cos(angle) * r * 1000) / 1000,
    Math.round((((i % 5) - 2) * 1.4) * 1000) / 1000,
    Math.round(Math.sin(angle) * r * 1000) / 1000,
  ];
}

export function buildStarsFromMemory(): SpatialStar[] {
  return records.map((m, i) => ({
    id: m.id,
    order: i + 1,
    title: m.title,
    label: m.label,
    signature: `${m.timeband} · ${m.label}`,
    chapter: m.chapter,
    timeband: m.timeband,
    era: "origins",
    kind: "memory",
    description: m.summary,
    color: m.color,
    size: 1.2,
    glow: 0.9,
    intensity: 1,
    position: pos(i),
  }));
}
