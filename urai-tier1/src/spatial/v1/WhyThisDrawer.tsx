'use client';

import type { LifeMapNode } from './lifeMapTypes';

export function WhyThisDrawer({ node }: { node: LifeMapNode }) {
  return (
    <section className="urai-v1-why" data-testid="urai-v1-why-this" aria-label="Why this memory appears">
      <p className="urai-v1-kicker">Why this?</p>
      <p>{node.whyThis}</p>
      <div className="urai-v1-why__signals" aria-label="Abstracted source signals">
        {node.sourceSignals.map((signal) => <span key={signal}>{signal}</span>)}
      </div>
    </section>
  );
}
