'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import type { LifeMapEdge, LifeMapNode as LifeMapNodeModel, ReplayPath } from './lifeMapTypes';
import { MemoryScroll } from './MemoryScroll';
import { WhyThisDrawer } from './WhyThisDrawer';
import styles from './LifeMapScene.module.css';

type LifeMapSceneProps = {
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
};

type ClusterModel = {
  key: string;
  label: string;
  color: string;
  count: number;
};

const TRAVEL_MS = 880;
const REDUCED_TRAVEL_MS = 180;

function prettyToken(value?: string) {
  if (!value) return 'Constellation';
  return value.replace(/^chapter-/, '').replace(/^season-/, '').replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function clusterKeyForNode(node: LifeMapNodeModel) {
  return node.seasonId || node.chapterId || node.type;
}

function clusterLabelForNode(node: LifeMapNodeModel) {
  return prettyToken(clusterKeyForNode(node));
}

function focusUrlForNode(nodeId: string) {
  return `/focus?memoryId=${encodeURIComponent(nodeId)}`;
}

function replayUrlForNode(nodeId: string, replayPathId: string) {
  return `/replay?memoryId=${encodeURIComponent(nodeId)}&manifestId=${encodeURIComponent(replayPathId)}`;
}

function rememberMemoryId(nodeId: string) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem('urai-lifemap-selected-memory-id', nodeId);
}

function useReducedMotionPreference() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return reducedMotion;
}

function buildClusters(nodes: LifeMapNodeModel[]) {
  const groups = new Map<string, ClusterModel>();
  nodes.forEach((node) => {
    const key = clusterKeyForNode(node);
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
      return;
    }
    groups.set(key, { key, label: clusterLabelForNode(node), color: node.auraColor || node.color, count: 1 });
  });
  return Array.from(groups.values());
}

function LifeMapFallback({ nodes, onOpen }: { nodes: LifeMapNodeModel[]; onOpen: (nodeId: string) => void }) {
  return (
    <section className={styles.fallback} aria-label="Life Map fallback">
      <p className={styles.eyebrow}>Production safe fallback</p>
      <h2>Your Life Map is still open.</h2>
      <p>The renderer could not start here, so every memory remains available as a launch-safe constellation list.</p>
      <div className={styles.fallbackGrid}>
        {nodes.slice(0, 12).map((node) => (
          <button key={node.id} type="button" onClick={() => onOpen(node.id)}>
            <span>{node.glyph}</span>
            <strong>{node.title}</strong>
            <small>{clusterLabelForNode(node)}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

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
}: LifeMapSceneProps) {
  const router = useRouter();
  const reducedMotion = useReducedMotionPreference();
  const validSelectedId = nodes.some((node) => node.id === selectedNodeId) ? selectedNodeId : undefined;
  const [activeNodeId, setActiveNodeId] = useState<string | undefined>(validSelectedId);
  const [cameraNodeId, setCameraNodeId] = useState<string | undefined>(validSelectedId);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | undefined>();
  const [travelNodeId, setTravelNodeId] = useState<string | undefined>();
  const travelTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setActiveNodeId(validSelectedId);
    setCameraNodeId(validSelectedId);
  }, [validSelectedId]);

  useEffect(() => () => {
    if (travelTimeoutRef.current) window.clearTimeout(travelTimeoutRef.current);
  }, []);

  const clusters = useMemo(() => buildClusters(nodes), [nodes]);
  const selectedNode = useMemo(() => nodes.find((node) => node.id === activeNodeId), [activeNodeId, nodes]);
  const cameraNode = useMemo(() => nodes.find((node) => node.id === cameraNodeId), [cameraNodeId, nodes]);
  const hoveredNode = useMemo(() => nodes.find((node) => node.id === hoveredNodeId), [hoveredNodeId, nodes]);
  const travelingNode = useMemo(() => nodes.find((node) => node.id === travelNodeId), [travelNodeId, nodes]);
  const featuredNode = hoveredNode || travelingNode || selectedNode || nodes[0];
  const focusNodeId = selectedNode?.id || nodes[0]?.id || 'quiet-reset';
  const selectedCluster = selectedNode ? clusterLabelForNode(selectedNode) : hoveredNode ? clusterLabelForNode(hoveredNode) : 'Whole constellation';
  const cameraFocus = travelingNode || cameraNode;
  const averageIntensity = nodes.length ? nodes.reduce((total, node) => total + node.emotionalIntensity, 0) / nodes.length : 0;

  const openMemory = useCallback(
    (nodeId: string) => {
      setActiveNodeId(nodeId);
      setCameraNodeId(nodeId);
      setTravelNodeId(nodeId);
      onSelectNode(nodeId);
      rememberMemoryId(nodeId);
      if (travelTimeoutRef.current) window.clearTimeout(travelTimeoutRef.current);
      if (typeof window === 'undefined') {
        router.push(focusUrlForNode(nodeId));
        return;
      }
      travelTimeoutRef.current = window.setTimeout(() => {
        setTravelNodeId(undefined);
        router.push(focusUrlForNode(nodeId));
      }, reducedMotion ? REDUCED_TRAVEL_MS : TRAVEL_MS);
    },
    [onSelectNode, reducedMotion, router],
  );

  const startReplay = useCallback(() => {
    rememberMemoryId(focusNodeId);
    if (typeof window !== 'undefined') window.sessionStorage.setItem('urai-replay-return-manifest-id', replayPath.id);
    onStartReplay();
    router.push(replayUrlForNode(focusNodeId, replayPath.id));
  }, [focusNodeId, onStartReplay, replayPath.id, router]);

  const closeSelected = useCallback(() => {
    setActiveNodeId(undefined);
    setCameraNodeId(undefined);
    setTravelNodeId(undefined);
    onCloseNode();
    router.push('/life-map');
  }, [onCloseNode, router]);

  const resetView = useCallback(() => {
    setCameraNodeId(undefined);
    setHoveredNodeId(undefined);
    setTravelNodeId(undefined);
  }, []);

  const moveSelection = useCallback(
    (direction: 1 | -1) => {
      if (!nodes.length) return;
      const currentIndex = Math.max(0, nodes.findIndex((node) => node.id === (activeNodeId || hoveredNodeId || nodes[0]?.id)));
      const nextNode = nodes[(currentIndex + direction + nodes.length) % nodes.length];
      setActiveNodeId(nextNode.id);
      setCameraNodeId(nextNode.id);
      setTravelNodeId(undefined);
      onSelectNode(nextNode.id);
      rememberMemoryId(nextNode.id);
    },
    [activeNodeId, hoveredNodeId, nodes, onSelectNode],
  );

  if (!nodes.length) {
    return (
      <section className={styles.shell} data-testid="urai-v1-lifemap-scene" aria-label="URAI Life Map galaxy">
        <LifeMapFallback nodes={nodes} onOpen={openMemory} />
      </section>
    );
  }

  const cameraStyle = {
    '--camera-x': `${cameraFocus ? -cameraFocus.position.x * 2.2 : 0}px`,
    '--camera-y': `${cameraFocus ? cameraFocus.position.y * -1.2 : 0}px`,
    '--camera-scale': travelingNode ? '1.72' : cameraFocus ? '1.16' : '1',
  } as CSSProperties;

  return (
    <section
      className={styles.shell}
      data-testid="urai-v1-lifemap-scene"
      aria-label="URAI Life Map galaxy"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight') moveSelection(1);
        if (event.key === 'ArrowLeft') moveSelection(-1);
        if (event.key === 'Enter' && (activeNodeId || hoveredNodeId)) openMemory(activeNodeId || hoveredNodeId || focusNodeId);
        if (event.key === 'Escape') router.push('/unwind');
        if (event.key.toLowerCase() === 'r') resetView();
      }}
    >
      <div className={styles.background} aria-hidden="true" />
      <div className={styles.nebula} data-testid="urai-v1-lifemap-nebula" aria-hidden="true" />

      <div className={styles.canvasShell} data-testid="urai-lifemap-camera" style={{ perspective: 900 }}>
        <div
          aria-label="Memory star field"
          style={{
            position: 'absolute',
            inset: 0,
            transform: 'translate3d(var(--camera-x), var(--camera-y), 0) scale(var(--camera-scale))',
            transformOrigin: '50% 50%',
            transition: reducedMotion ? 'none' : 'transform 820ms cubic-bezier(.2,.8,.2,1)',
            ...cameraStyle,
          }}
        >
          {edges.slice(0, 12).map((edge, index) => (
            <span
              key={edge.id}
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: `${12 + (index * 7) % 78}%`,
                top: `${22 + (index * 11) % 58}%`,
                width: `${80 + edge.strength * 120}px`,
                height: 1,
                background: `linear-gradient(90deg, transparent, ${edge.color}99, transparent)`,
                transform: `rotate(${(index % 6) * 18 - 42}deg)`,
                opacity: replayActive ? 0.72 : 0.34,
                boxShadow: `0 0 28px ${edge.color}66`,
              }}
            />
          ))}
          {nodes.map((node, index) => {
            const active = node.id === activeNodeId || node.id === hoveredNodeId || node.id === travelNodeId || (replayActive && replayPath.nodeIds.includes(node.id));
            const x = 50 + node.position.x * 0.33;
            const y = 50 - node.position.y * 0.48 + node.position.z * 0.015;
            const nodeStyle = {
              '--node-color': node.color,
              '--node-aura': node.auraColor,
              position: 'absolute',
              left: `${Math.max(5, Math.min(92, x))}%`,
              top: `${Math.max(8, Math.min(88, y))}%`,
              transform: `translate3d(-50%, -50%, ${node.position.z}px) scale(${active ? 1.08 : 0.88 + node.size * 0.08})`,
              zIndex: active ? 4 : 2,
              animationDelay: `${index * -0.24}s`,
            } as CSSProperties;
            return (
              <button
                key={node.id}
                type="button"
                className={`${styles.starLabel} ${active ? styles.starLabelActive : ''}`}
                style={nodeStyle}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(undefined)}
                onFocus={() => setHoveredNodeId(node.id)}
                onBlur={() => setHoveredNodeId(undefined)}
                onClick={() => openMemory(node.id)}
                aria-label={`Open memory ${node.title} in Focus`}
              >
                <span className={styles.starGlyph}>{node.glyph}</span>
                <span className={styles.starTitle}>{node.title}</span>
                <span className={styles.starMeta}>{clusterLabelForNode(node)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <header className={styles.heroPanel}>
        <p className={styles.eyebrow}>URAI Spatial · Life Map</p>
        <h1>Life Map</h1>
        <p>Your emotional universe — alive, explorable, and wired into Focus.</p>
      </header>

      <aside className={styles.hudPanel} data-testid="urai-v1-time-lens" aria-label="Life Map controls">
        <div><span>Selected zone</span><strong>{selectedCluster}</strong></div>
        <div><span>Memories</span><strong>{nodes.length}</strong></div>
        <div><span>Emotional weather</span><strong>{Math.round(averageIntensity * 100)}% active</strong></div>
        <p>Drag routes stay open · arrow keys step stars · click any star to pan the camera into Focus.</p>
        <div className={styles.controlRow}>
          <button type="button" onClick={resetView}>Reset view</button>
          <Link href={focusUrlForNode(focusNodeId)}>Open Focus</Link>
        </div>
      </aside>

      <nav className={styles.ctaRail} aria-label="URAI spatial routes">
        <Link href={focusUrlForNode(focusNodeId)}>Focus</Link>
        <Link href={replayUrlForNode(focusNodeId, replayPath.id)}>Replay</Link>
        <Link href="/mirror" onClick={onOpenMirror}>Mirror</Link>
        <Link href="/passport">Passport</Link>
        <Link href="/status">Status</Link>
      </nav>

      <section className={styles.legend} aria-label="Emotional color legend">
        {clusters.slice(0, 6).map((cluster) => (
          <span key={cluster.key} style={{ '--legend-color': cluster.color } as CSSProperties}>{cluster.label}</span>
        ))}
      </section>

      {featuredNode ? (
        <aside className={styles.previewPanel} aria-live="polite">
          <span className={styles.previewGlyph}>{featuredNode.glyph}</span>
          <div>
            <p className={styles.eyebrow}>{clusterLabelForNode(featuredNode)}</p>
            <h2>{featuredNode.title}</h2>
            <p>{featuredNode.subtitle}</p>
            <small>{travelingNode ? 'Camera is moving into this memory star before Focus opens.' : featuredNode.narratorLine}</small>
          </div>
          <button type="button" onClick={() => openMemory(featuredNode.id)}>{travelingNode ? 'Opening Focus…' : 'Open this memory'}</button>
        </aside>
      ) : null}

      {selectedNode && !travelingNode ? (
        <aside className={styles.memoryDock} aria-label="Selected memory focus panel">
          <MemoryScroll node={selectedNode} onClose={closeSelected} onReplay={startReplay} />
          <WhyThisDrawer node={selectedNode} />
        </aside>
      ) : null}

      {travelingNode ? (
        <div data-testid="urai-lifemap-star-travel" aria-live="polite" style={{ position: 'absolute', inset: 0, zIndex: 8, display: 'grid', placeItems: 'center', pointerEvents: 'none', background: `radial-gradient(circle at 50% 48%, ${travelingNode.auraColor}33, transparent 32%)` }}>
          <div style={{ border: `1px solid ${travelingNode.auraColor}66`, borderRadius: 28, padding: '18px 22px', color: '#f8fbff', background: 'rgba(2,6,23,.72)', boxShadow: `0 0 90px ${travelingNode.auraColor}44`, textAlign: 'center' }}>
            <p className={styles.eyebrow}>Entering memory star</p>
            <strong>{travelingNode.title}</strong>
            <small style={{ display: 'block', marginTop: 6, color: 'rgba(226,232,240,.72)' }}>Focus opens with this image memory</small>
          </div>
        </div>
      ) : null}

      <div className={styles.bottomSafeBar}>
        <button type="button" onClick={() => { onReturnHome(); router.push('/'); }}>Return home</button>
        <button type="button" onClick={startReplay}>Start replay path</button>
      </div>
    </section>
  );
}
