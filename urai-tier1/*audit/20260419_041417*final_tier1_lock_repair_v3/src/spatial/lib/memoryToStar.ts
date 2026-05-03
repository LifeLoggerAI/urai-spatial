import { MEMORY_SEED } from "../data/memory-seed";

function pos(i: number, total: number): [number, number, number] {
  const angle = (i / Math.max(total, 1)) * Math.PI * 2;
  const r = 16 + i * 2.5;
  return [
    Math.round(Math.cos(angle) * r * 1000) / 1000,
    Math.round((((i % 5) - 2) * 1.4) * 1000) / 1000,
    Math.round(Math.sin(angle) * r * 1000) / 1000,
  ];
}

export function buildStarsFromMemory() {
  return MEMORY_SEED.map((m, i) => ({
    id: m.id,
    order: i + 1,
    title: m.title,
    label: m.label,
    chapter: m.chapter,
    timeband: m.timeband,
    era: "origins",
    kind: "memory",
    description: m.summary,
    color: m.color,
    size: 1.2,
    glow: 0.9,
    intensity: 1,
    position: pos(i, MEMORY_SEED.length),
  }));
}
