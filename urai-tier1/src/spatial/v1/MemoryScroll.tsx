'use client';

import type { LifeMapNode } from './lifeMapTypes';

export function MemoryScroll({ node, onClose, onReplay }: { node: LifeMapNode; onClose: () => void; onReplay: () => void }) {
  return (
    <aside className="urai-v1-memory-scroll" data-testid="urai-v1-memory-scroll" aria-label="Selected memory scroll">
      <p className="urai-v1-kicker">Memory Bloom</p>
      <h2>{node.title}</h2>
      <p>{node.subtitle}</p>
      <blockquote>{node.narratorLine}</blockquote>
      <div className="urai-v1-memory-scroll__meta">
        <span>{node.type}</span>
        <span>{node.emotionalTone}</span>
        <span>{Math.round(node.importance * 100)} meaning</span>
      </div>
      <div className="urai-v1-memory-scroll__actions">
        <button type="button" onClick={onReplay}>Replay thread</button>
        <button type="button" onClick={onClose}>Return to galaxy</button>
      </div>
    </aside>
  );
}
