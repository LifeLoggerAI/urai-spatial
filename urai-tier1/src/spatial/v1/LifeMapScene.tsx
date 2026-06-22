'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react';

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

type CameraState = {
  rx: number;
  ry: number;
  tx: number;
  ty: number;
  zoom: number;
};

type ProjectedNode = {
  node: LifeMapNodeModel;
  x: number;
  y: number;
  scale: number;
  depth: number;
  screenZ: number;
  opacity: number;
  active: boolean;
  neighbor: boolean;
  replay: boolean;
};

const TRAVEL_MS = 760;
const REDUCED_TRAVEL_MS = 140;
const DEFAULT_CAMERA: CameraState = { rx: -8, ry: 12, tx: 0, ty: 0, zoom: 1 };

function clamp(min: number, max: number, value: number) {
  return Math.min(max, Math.max(min, value));
}

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

function cameraForNode(node: LifeMapNodeModel, zoom = 1.18): CameraState {
  return {
    rx: clamp(-20, 16, -8 - node.position.y * 0.055),
    ry: clamp(-26, 28, 12 + node.position.x * 0.075),
    tx: clamp(-34, 34, -node.position.x * 0.24),
    ty: clamp(-30, 30, node.position.y * 0.16),
    zoom,
  };
}

function projectNode(node: LifeMapNodeModel, camera: CameraState): Pick<ProjectedNode, 'x' | 'y' | 'scale' | 'depth' | 'screenZ' | 'opacity'> {
  const rx = (camera.rx * Math.PI) / 180;
  const ry = (camera.ry * Math.PI) / 180;
  const rotatedX = node.position.x * Math.cos(ry) + node.position.z * Math.sin(ry) * 0.18;
  const rotatedY = node.position.y * Math.cos(rx) - node.position.z * Math.sin(rx) * 0.14;
  const rotatedZ = node.position.z * Math.cos(ry) - node.position.x * Math.sin(ry) * 0.42;
  const depth = clamp(0, 1, (rotatedZ + 560) / 650);
  const parallax = 0.34 + depth * 0.28;
  const x = clamp(4, 96, 50 + (rotatedX + camera.tx) * parallax * camera.zoom);
  const y = clamp(6, 91, 50 - (rotatedY + camera.ty) * (0.47 + depth * 0.13) * camera.zoom - rotatedZ * 0.012);
  const scale = clamp(0.58, 1.72, (0.72 + depth * 0.5 + node.size * 0.12) * Math.pow(camera.zoom, 0.22));
  const opacity = clamp(0.22, 1, 0.32 + depth * 0.68);

  return { x, y, scale, depth, screenZ: Math.round(depth * 800), opacity };
}

function LifeMapFallback({ nodes, onOpen }: { nodes: LifeMapNodeModel[]; onOpen: (nodeId: string) => void }) {
  return (
    <section className={styles.fallback} aria-label="Life Map fallback">
      <p className={styles.eyebrow}>Accessible constellation</p>
      <h2>Your Life Map is still open.</h2>
      <p>Every memory remains reachable as a keyboard-safe constellation list.</p>
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
  const [camera, setCamera] = useState<CameraState>(DEFAULT_CAMERA);
  const [isDragging, setIsDragging] = useState(false);
  const travelTimeoutRef = useRef<number | null>(null);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; startCamera: CameraState } | null>(null);

  const clusters = useMemo(() => buildClusters(nodes), [nodes]);
  const selectedNode = useMemo(() => nodes.find((node) => node.id === activeNodeId), [activeNodeId, nodes]);
  const cameraNode = useMemo(() => nodes.find((node) => node.id === cameraNodeId), [cameraNodeId, nodes]);
  const hoveredNode = useMemo(() => nodes.find((node) => node.id === hoveredNodeId), [hoveredNodeId, nodes]);
  const travelingNode = useMemo(() => nodes.find((node) => node.id === travelNodeId), [travelNodeId, nodes]);
  const featuredNode = hoveredNode || travelingNode || selectedNode || cameraNode || nodes[0];
  const focusNodeId = selectedNode?.id || hoveredNode?.id || nodes[0]?.id || 'quiet-reset';
  const selectedCluster = selectedNode ? clusterLabelForNode(selectedNode) : hoveredNode ? clusterLabelForNode(hoveredNode) : 'Whole constellation';
  const averageIntensity = nodes.length ? nodes.reduce((total, node) => total + node.emotionalIntensity, 0) / nodes.length : 0;

  useEffect(() => {
    setActiveNodeId(validSelectedId);
    setCameraNodeId(validSelectedId);
    const target = nodes.find((node) => node.id === validSelectedId);
    setCamera(target ? cameraForNode(target, 1.08) : DEFAULT_CAMERA);
  }, [validSelectedId, nodes]);

  useEffect(() => () => {
    if (travelTimeoutRef.current) window.clearTimeout(travelTimeoutRef.current);
  }, []);

  const neighborIds = useMemo(() => {
    const ids = new Set<string>();
    if (!featuredNode) return ids;
    featuredNode.relatedNodeIds.forEach((id) => ids.add(id));
    edges.forEach((edge) => {
      if (edge.fromNodeId === featuredNode.id) ids.add(edge.toNodeId);
      if (edge.toNodeId === featuredNode.id) ids.add(edge.fromNodeId);
    });
    return ids;
  }, [edges, featuredNode]);

  const projectedNodes = useMemo<ProjectedNode[]>(() => {
    const replayIds = new Set(replayActive ? replayPath.nodeIds : []);
    return nodes
      .map((node) => {
        const projection = projectNode(node, camera);
        const active = node.id === activeNodeId || node.id === hoveredNodeId || node.id === travelNodeId;
        return {
          node,
          ...projection,
          active,
          neighbor: neighborIds.has(node.id),
          replay: replayIds.has(node.id),
        };
      })
      .sort((a, b) => a.depth - b.depth);
  }, [activeNodeId, camera, hoveredNodeId, neighborIds, nodes, replayActive, replayPath.nodeIds, travelNodeId]);

  const projectionById = useMemo(() => new Map(projectedNodes.map((projected) => [projected.node.id, projected])), [projectedNodes]);

  const openMemory = useCallback(
    (nodeId: string) => {
      const target = nodes.find((node) => node.id === nodeId);
      if (!target) return;
      setActiveNodeId(nodeId);
      setCameraNodeId(nodeId);
      setHoveredNodeId(undefined);
      setTravelNodeId(nodeId);
      setCamera(cameraForNode(target, 1.34));
      onSelectNode(nodeId);
      rememberMemoryId(nodeId);
      if (travelTimeoutRef.current) window.clearTimeout(travelTimeoutRef.current);
      travelTimeoutRef.current = window.setTimeout(() => {
        setTravelNodeId(undefined);
        router.push(focusUrlForNode(nodeId));
      }, reducedMotion ? REDUCED_TRAVEL_MS : TRAVEL_MS);
    },
    [nodes, onSelectNode, reducedMotion, router],
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
    setHoveredNodeId(undefined);
    setCamera(DEFAULT_CAMERA);
    onCloseNode();
    router.push('/life-map');
  }, [onCloseNode, router]);

  const resetView = useCallback(() => {
    setCamera(DEFAULT_CAMERA);
    setCameraNodeId(undefined);
    setHoveredNodeId(undefined);
    setTravelNodeId(undefined);
  }, []);

  const moveSelection = useCallback(
    (direction: 1 | -1) => {
      if (!nodes.length) return;
      const currentIndex = Math.max(0, nodes.findIndex((node) => node.id === (activeNodeId || hoveredNodeId || cameraNodeId || nodes[0]?.id)));
      const nextNode = nodes[(currentIndex + direction + nodes.length) % nodes.length];
      setActiveNodeId(nextNode.id);
      setCameraNodeId(nextNode.id);
      setTravelNodeId(undefined);
      setCamera(cameraForNode(nextNode, 1.08));
      onSelectNode(nextNode.id);
      rememberMemoryId(nextNode.id);
    },
    [activeNodeId, cameraNodeId, hoveredNodeId, nodes, onSelectNode],
  );

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('button, a, [role="button"]')) return;
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, startCamera: camera };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
  }, [camera]);

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    setCamera({
      rx: clamp(-28, 24, drag.startCamera.rx - dy * 0.045),
      ry: clamp(-36, 38, drag.startCamera.ry + dx * 0.065),
      tx: clamp(-46, 46, drag.startCamera.tx + dx * 0.045),
      ty: clamp(-38, 38, drag.startCamera.ty - dy * 0.035),
      zoom: drag.startCamera.zoom,
    });
  }, []);

  const endDrag = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((event: ReactWheelEvent<HTMLElement>) => {
    event.preventDefault();
    setCamera((current) => ({ ...current, zoom: clamp(0.78, 1.54, current.zoom - event.deltaY * 0.0012) }));
  }, []);

  if (!nodes.length) {
    return (
      <section className={styles.shell} data-testid="urai-v1-lifemap-scene" aria-label="URAI Life Map galaxy">
        <LifeMapFallback nodes={nodes} onOpen={openMemory} />
      </section>
    );
  }

  const shellStyle = {
    '--camera-rx': `${camera.rx}deg`,
    '--camera-ry': `${camera.ry}deg`,
    '--camera-zoom': camera.zoom,
  } as CSSProperties;

  return (
    <section
      className={`${styles.shell} ${isDragging ? styles.shellDragging : ''}`}
      data-testid="urai-v1-lifemap-scene"
      aria-label="URAI Life Map galaxy"
      tabIndex={0}
      style={shellStyle}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onWheel={handleWheel}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') moveSelection(1);
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') moveSelection(-1);
        if (event.key === 'Enter' && (activeNodeId || hoveredNodeId || cameraNodeId)) openMemory(activeNodeId || hoveredNodeId || cameraNodeId || focusNodeId);
        if (event.key === 'Escape') router.push('/unwind');
        if (event.key.toLowerCase() === 'r' || event.key === '0') resetView();
        if (event.key === '+' || event.key === '=') setCamera((current) => ({ ...current, zoom: clamp(0.78, 1.54, current.zoom + 0.08) }));
        if (event.key === '-' || event.key === '_') setCamera((current) => ({ ...current, zoom: clamp(0.78, 1.54, current.zoom - 0.08) }));
      }}
    >
      <div className={styles.background} aria-hidden="true" />
      <div className={styles.nebula} data-testid="urai-v1-lifemap-nebula" aria-hidden="true" />
      <div className={styles.depthFog} aria-hidden="true" />
      <div className={styles.orbitRings} aria-hidden="true" />

      <div className={styles.canvasShell} data-testid="urai-lifemap-camera" aria-label="Drag empty space to orbit the Life Map. Use wheel or plus and minus keys to zoom.">
        <svg className={styles.edgeLayer} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {edges.map((edge) => {
            const from = projectionById.get(edge.fromNodeId);
            const to = projectionById.get(edge.toNodeId);
            if (!from || !to) return null;
            const activeEdge = Boolean(
              (activeNodeId && (edge.fromNodeId === activeNodeId || edge.toNodeId === activeNodeId)) ||
                (hoveredNodeId && (edge.fromNodeId === hoveredNodeId || edge.toNodeId === hoveredNodeId)) ||
                (replayActive && replayPath.edgeIds.includes(edge.id)),
            );
            return (
              <line
                key={edge.id}
                className={`${styles.routeLine} ${activeEdge ? styles.routeLineActive : ''}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                style={{ '--edge-color': edge.color, '--edge-strength': edge.strength } as CSSProperties}
              />
            );
          })}
        </svg>

        {projectedNodes.map((projected, index) => {
          const { node } = projected;
          const nodeStyle = {
            '--node-color': node.color,
            '--node-aura': node.auraColor,
            '--node-opacity': projected.opacity,
            '--node-depth': projected.depth,
            left: `${projected.x}%`,
            top: `${projected.y}%`,
            transform: `translate3d(-50%, -50%, ${projected.screenZ}px) scale(${projected.scale})`,
            zIndex: Math.round(20 + projected.depth * 80 + (projected.active ? 120 : projected.neighbor ? 40 : 0)),
            animationDelay: `${index * -0.18}s`,
          } as CSSProperties;

          return (
            <button
              key={node.id}
              type="button"
              className={`${styles.starLabel} ${projected.active ? styles.starLabelActive : ''} ${projected.neighbor ? styles.starLabelNeighbor : ''} ${projected.replay ? styles.starLabelReplay : ''} ${node.importance > 0.84 ? styles.starLabelImportant : ''}`}
              style={nodeStyle}
              onMouseEnter={() => setHoveredNodeId(node.id)}
              onMouseLeave={() => setHoveredNodeId(undefined)}
              onFocus={() => setHoveredNodeId(node.id)}
              onBlur={() => setHoveredNodeId(undefined)}
              onClick={(event) => {
                event.stopPropagation();
                openMemory(node.id);
              }}
              onDoubleClick={(event) => {
                event.stopPropagation();
                rememberMemoryId(node.id);
                router.push(focusUrlForNode(node.id));
              }}
              aria-label={`Open memory ${node.title} in Focus. ${node.subtitle}`}
            >
              <span className={styles.starHalo} aria-hidden="true" />
              <span className={styles.starGlyph} aria-hidden="true">{node.glyph}</span>
              <span className={styles.starText}>
                <span className={styles.starTitle}>{node.title}</span>
                <span className={styles.starMeta}>{clusterLabelForNode(node)}</span>
              </span>
            </button>
          );
        })}
      </div>

      <header className={styles.heroPanel}>
        <p className={styles.eyebrow}>URAI Spatial · Life Map</p>
        <h1>Life Map</h1>
        <p>Step inside yourself. Your memories are a living constellation, not a timeline.</p>
      </header>

      <aside className={styles.hudPanel} data-testid="urai-v1-time-lens" aria-label="Life Map controls">
        <div><span>Zone</span><strong>{selectedCluster}</strong></div>
        <div><span>Stars</span><strong>{nodes.length}</strong></div>
        <div><span>Weather</span><strong>{Math.round(averageIntensity * 100)}% awake</strong></div>
        <p>Drag empty space to orbit and pan. Wheel or +/- zooms. Arrow keys step stars. Enter opens Focus. Esc unwinds.</p>
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
          <span className={styles.previewGlyph} style={{ '--preview-color': featuredNode.auraColor } as CSSProperties}>{featuredNode.glyph}</span>
          <div>
            <p className={styles.eyebrow}>{clusterLabelForNode(featuredNode)}</p>
            <h2>{featuredNode.title}</h2>
            <p>{featuredNode.subtitle}</p>
            <small>{travelingNode ? 'Camera is entering this memory star before Focus opens.' : featuredNode.narratorLine}</small>
          </div>
          <div className={styles.previewActions}>
            <button type="button" onClick={() => openMemory(featuredNode.id)}>{travelingNode ? 'Opening Focus…' : 'Open this memory'}</button>
            <button type="button" onClick={startReplay}>Replay path</button>
          </div>
        </aside>
      ) : null}

      {selectedNode && !travelingNode ? (
        <aside className={styles.memoryDock} aria-label="Selected memory focus panel">
          <MemoryScroll node={selectedNode} onClose={closeSelected} onReplay={startReplay} />
          <WhyThisDrawer node={selectedNode} />
        </aside>
      ) : null}

      {travelingNode ? (
        <div data-testid="urai-lifemap-star-travel" aria-live="polite" className={styles.travelGate} style={{ '--travel-color': travelingNode.auraColor } as CSSProperties}>
          <div>
            <p className={styles.eyebrow}>Entering memory star</p>
            <strong>{travelingNode.title}</strong>
            <small>Focus opens with this memory selected.</small>
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
