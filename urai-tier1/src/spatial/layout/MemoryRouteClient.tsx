'use client';

import { useEffect, useState } from 'react';
import { lifeMapNodes, replayPaths } from '@/spatial/v1/lifeMapDemoData';
import { MemoryModeSurfaceV2 } from './MemoryModeSurfaceV2';

type Props = {
  mode: 'focus' | 'replay';
};

const aliases: Record<string, string> = {
  'blue-fog': 'week-heavy-fog',
  galaxy: 'quiet-reset',
  spark: 'first-signal-recovery',
  recovery: 'first-signal-recovery',
  passport: 'purpose-thread-visible',
};

function selectedNodeFromUrl() {
  if (typeof window === 'undefined') return lifeMapNodes[0];

  const params = new URLSearchParams(window.location.search);
  const raw =
    params.get('memoryId') ||
    params.get('memory') ||
    params.get('nodeId') ||
    params.get('star') ||
    params.get('spark') ||
    '';

  const decoded = decodeURIComponent(raw).trim();
  const nodeId = aliases[decoded] ?? decoded;

  return lifeMapNodes.find((node) => node.id === nodeId) ?? lifeMapNodes[0];
}

export function MemoryRouteClient({ mode }: Props) {
  const [node, setNode] = useState(() => lifeMapNodes[0]);
  const replayPath = replayPaths[0];

  useEffect(() => {
    setNode(selectedNodeFromUrl());
  }, []);

  return <MemoryModeSurfaceV2 mode={mode} node={node} replayPath={replayPath} />;
}
