import type { LifeMapNode } from './lifeMapTypes';

export type MemoryVisualIdentity = {
  alt: string;
  weather: string;
  texture: 'aurora' | 'fog' | 'water' | 'root' | 'room' | 'spark' | 'thread' | 'threshold';
  background: string;
  accent: string;
  core: string;
  deep: string;
  glyph: string;
};

function textureForNode(type: LifeMapNode['type']): MemoryVisualIdentity['texture'] {
  if (type === 'shadow' || type === 'habitPattern') return 'fog';
  if (type === 'ritual') return 'water';
  if (type === 'recovery') return 'root';
  if (type === 'locationMoment') return 'room';
  if (type === 'threshold' || type === 'rebirth') return 'threshold';
  if (type === 'milestone' || type === 'emotionalShift') return 'spark';
  if (type === 'insight' || type === 'legacy' || type === 'chapter') return 'thread';
  return 'aurora';
}

function deepTone(texture: MemoryVisualIdentity['texture']) {
  if (texture === 'fog') return '#050714';
  if (texture === 'water') return '#03131f';
  if (texture === 'root') return '#061407';
  if (texture === 'room') return '#111827';
  if (texture === 'threshold') return '#1d1233';
  if (texture === 'spark') return '#1f1a07';
  return '#050617';
}

export function memoryVisualForNode(node: LifeMapNode, index = 0): MemoryVisualIdentity {
  const texture = textureForNode(node.type);
  const deep = deepTone(texture);
  const x = 30 + ((index * 17) % 42);
  const y = 22 + ((index * 13) % 48);
  const x2 = 72 - ((index * 11) % 34);
  const y2 = 58 + ((index * 19) % 28);
  return {
    alt: `${node.title} memory visual: ${node.subtitle}`,
    weather: `${node.emotionalTone} · ${Math.round(node.emotionalIntensity * 100)}% awake`,
    texture,
    accent: node.auraColor,
    core: node.color,
    deep,
    glyph: node.glyph,
    background: `radial-gradient(circle at ${x}% ${y}%, rgba(255,255,255,.96), transparent 9%), radial-gradient(circle at ${x + 8}% ${y + 5}%, ${node.auraColor}, transparent 24%), radial-gradient(circle at ${x2}% ${y2}%, ${node.color}, transparent 36%), linear-gradient(135deg, ${deep}, ${node.color} 52%, #020617 100%)`,
  };
}
