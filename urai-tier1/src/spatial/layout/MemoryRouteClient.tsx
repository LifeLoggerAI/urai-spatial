'use client';

import { useEffect, useState } from 'react';
import { lifeMapNodes, replayPaths } from '@/spatial/v1/lifeMapDemoData';
import type { LifeMapNode, ReplayPath } from '@/spatial/v1/lifeMapTypes';
import { MemoryModeSurfaceV2 } from './MemoryModeSurfaceV2';

type Props = {
  mode: 'focus' | 'replay';
};

type RouteMemoryState = {
  node: LifeMapNode;
  replayPath?: ReplayPath;
};

const aliases: Record<string, string> = {
  'blue-fog': 'week-heavy-fog',
  'blue-fog-memory': 'week-heavy-fog',
  galaxy: 'quiet-reset',
  spark: 'first-signal-recovery',
  recovery: 'first-signal-recovery',
  passport: 'purpose-thread-visible',
  'seed-memory-bloom': 'quiet-reset',
  'seed-recovery-arc': 'first-signal-recovery',
  'seed-threshold-storm': 'doorway-season',
  'seed-threshold-rebirth': 'threshold-rebirth-sequence',
  'chapter-becoming': 'chapter-becoming',
  'replay-recovery-thread': 'energy-came-back-slowly',
};

function normalizeNodeId(value?: string | null) {
  const decoded = decodeURIComponent(value ?? '').trim();
  return aliases[decoded] ?? decoded;
}

function resolveReplayPath(params: URLSearchParams, nodeId: string): ReplayPath | undefined {
  const manifestId = params.get('manifestId') || params.get('replayId') || params.get('pathId') || '';
  return (
    replayPaths.find((candidate) => candidate.id === manifestId) ||
    replayPaths.find((candidate) => candidate.nodeIds.includes(nodeId)) ||
    replayPaths[0]
  );
}

function selectedStateFromUrl(): RouteMemoryState {
  if (typeof window === 'undefined') return { node: lifeMapNodes[0], replayPath: replayPaths[0] };

  const params = new URLSearchParams(window.location.search);
  const raw =
    params.get('memoryId') ||
    params.get('memory') ||
    params.get('nodeId') ||
    params.get('star') ||
    params.get('spark') ||
    window.sessionStorage.getItem('urai-lifemap-selected-memory-id') ||
    '';

  const nodeId = normalizeNodeId(raw);
  const node = lifeMapNodes.find((candidate) => candidate.id === nodeId) ?? lifeMapNodes[0];
  const replayPath = resolveReplayPath(params, node.id);
  window.sessionStorage.setItem('urai-lifemap-selected-memory-id', node.id);
  if (replayPath) window.sessionStorage.setItem('urai-replay-return-manifest-id', replayPath.id);
  return { node, replayPath };
}

export function MemoryRouteClient({ mode }: Props) {
  const [routeState, setRouteState] = useState<RouteMemoryState>(() => ({ node: lifeMapNodes[0], replayPath: replayPaths[0] }));

  useEffect(() => {
    const syncNode = () => setRouteState(selectedStateFromUrl());
    syncNode();
    window.addEventListener('popstate', syncNode);
    window.addEventListener('hashchange', syncNode);
    window.addEventListener('urai:sync-route-mode', syncNode);
    return () => {
      window.removeEventListener('popstate', syncNode);
      window.removeEventListener('hashchange', syncNode);
      window.removeEventListener('urai:sync-route-mode', syncNode);
    };
  }, []);

  return <MemoryModeSurfaceV2 mode={mode} node={routeState.node} replayPath={routeState.replayPath} />;
}
