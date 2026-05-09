'use client';

import type { LifeMapEdge, LifeMapNode as LifeMapNodeModel, ReplayPath } from './lifeMapTypes';
import { ConstellationLayer } from './ConstellationLayer';
import { LifeMapNode } from './LifeMapNode';
import { MemoryScroll } from './MemoryScroll';
import { ReplayPathEngine } from './ReplayPathEngine';
import { WhyThisDrawer } from './WhyThisDrawer';

export function LifeMapScene({
  nodes,
  edges,
  replayPath,
  selectedNodeId,
  replayActive,
  onSelectNode,
  onCloseNode,
  onStartReplay,
  onOpenMirror,
  onReturnHome,
}: {
  nodes: LifeMapNodeModel[];
  edges: LifeMapEdge[];
  replayPath: ReplayPath;
  selectedNodeId?: string;
  replayActive: boolean;
  onSelectNode: (nodeId: string) => void;
  onCloseNode: () => void;
  onStartReplay: () => void;
  onOpenMirror: () => void;
  onReturnHome: () => void;
}) {
  const selectedNode = nodes.find((node) => node.id === selectedNodeId);

  return (
    <section className="urai-v1-lifemap" data-testid="urai-v1-lifemap-scene" aria-label="URAI Life Map galaxy">
      <div className="urai-v1-lifemap__depth" aria-hidden="true" />
      <div className="urai-v1-lifemap__nebula urai-v1-lifemap__nebula--recovery" data-testid="urai-v1-lifemap-nebula" aria-hidden="true" />
      <div className="urai-v1-lifemap__nebula urai-v1-lifemap__nebula--relationship" aria-hidden="true" />
      <div className="urai-v1-lifemap__nebula urai-v1-lifemap__nebula--threshold" aria-hidden="true" />
      <div className="urai-v1-lifemap__you" aria-label="You are here">You are here</div>
      <ConstellationLayer nodes={nodes} edges={edges} />
      <div className="urai-v1-lifemap__nodes">
        {nodes.map((node) => (
          <LifeMapNode key={node.id} node={node} selected={selectedNodeId === node.id} onSelect={onSelectNode} />
        ))}
      </div>
      <ReplayPathEngine path={replayPath} active={replayActive} />
      <div className="urai-v1-lifemap__controls" data-testid="urai-v1-time-lens" aria-label="Life Map controls">
        <button type="button" onClick={onReturnHome}>Return home</button>
        <button type="button" onClick={onOpenMirror}>Mirror</button>
        <span>Present → Becoming</span>
      </div>
      {selectedNode ? (
        <>
          <MemoryScroll node={selectedNode} onClose={onCloseNode} onReplay={onStartReplay} />
          <WhyThisDrawer node={selectedNode} />
        </>
      ) : null}
    </section>
  );
}
