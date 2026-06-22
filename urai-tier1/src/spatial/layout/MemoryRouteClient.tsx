'use client';

import { useEffect, useState } from 'react';
import { lifeMapNodes, replayPaths } from '@/spatial/v1/lifeMapDemoData';
import { MemoryModeSurfaceV2 } from './MemoryModeSurfaceV2';

type Props = {
  mode: 'focus' | 'replay';
};

const aliases: Record<string, string> = {
  'blue-fog': 'week-heavy-fog',
  'blue-fog-memory': 'week-heavy-fog',
  galaxy: 'quiet-reset',
  spark: 'first-signal-recovery',
  recovery: 'first-signal-recovery',
  passport: 'purpose-thread-visible',
  'seed-memory-bloom': 'memory-became-thread',
  'seed-recovery-arc': 'first-signal-recovery',
  'seed-threshold-storm': 'doorway-season',
  'chapter-becoming': 'chapter-becoming',
};

function normalizeNodeId(value?: string | null) {
  const decoded = decodeURIComponent(value ?? '').trim();
  return aliases[decoded] ?? decoded;
}

function selectedNodeFromUrl() {
  if (typeof window === 'undefined') return lifeMapNodes[0];

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
  window.sessionStorage.setItem('urai-lifemap-selected-memory-id', node.id);
  return node;
}

export function MemoryRouteClient({ mode }: Props) {
  const [node, setNode] = useState(() => lifeMapNodes[0]);
  const replayPath = replayPaths[0];

  useEffect(() => {
    const syncNode = () => setNode(selectedNodeFromUrl());
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

  return <MemoryModeSurfaceV2 mode={mode} node={node} replayPath={replayPath} />;
}
