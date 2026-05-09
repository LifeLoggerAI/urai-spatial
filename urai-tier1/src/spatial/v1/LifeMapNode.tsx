'use client';

import type { CSSProperties } from 'react';
import type { LifeMapNode as LifeMapNodeModel } from './lifeMapTypes';

export function LifeMapNode({ node, selected, onSelect }: { node: LifeMapNodeModel; selected: boolean; onSelect: (nodeId: string) => void }) {
  const left = `${50 + node.position.x * 0.22}%`;
  const top = `${50 - node.position.y * 0.2}%`;
  const depth = Math.max(0.42, 1 + node.position.z / 900);
  const style = {
    left,
    top,
    '--node-color': node.color,
    '--node-aura': node.auraColor,
    '--node-size': `${node.size * depth}rem`,
    '--pulse-speed': `${Math.max(2.2, 5.8 - node.pulseSpeed)}s`,
    transform: `translate(-50%, -50%) scale(${depth})`,
  } as CSSProperties;

  return (
    <button
      type="button"
      className="urai-v1-node"
      data-testid="urai-v1-lifemap-node"
      data-node-type={node.type}
      data-selected={selected ? 'true' : 'false'}
      style={style}
      aria-label={`${node.title}. ${node.subtitle}`}
      onClick={() => onSelect(node.id)}
    >
      <span className="urai-v1-node__halo" />
      <span className="urai-v1-node__core">{node.glyph}</span>
      <span className="urai-v1-node__label">{node.title}</span>
    </button>
  );
}
