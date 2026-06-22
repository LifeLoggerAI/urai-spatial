'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react';

import type { LifeMapEdge, LifeMapNode, ReplayPath } from './lifeMapTypes';

type Props = {
  nodes: LifeMapNode[];
  edges: LifeMapEdge[];
  replayPath: ReplayPath;
  selectedNodeId?: string;
  onSelectNode: (nodeId: string) => void;
  onReturnHome: () => void;
};

type CameraState = {
  rx: number;
  ry: number;
  tx: number;
  ty: number;
  zoom: number;
};

type ProjectedMemory = {
  node: LifeMapNode;
  x: number;
  y: number;
  depth: number;
  scale: number;
  zIndex: number;
  active: boolean;
  neighbor: boolean;
};

const DEFAULT_CAMERA: CameraState = { rx: -10, ry: 10, tx: 0, ty: 0, zoom: 1 };
const TRAVEL_MS = 620;
const REDUCED_TRAVEL_MS = 80;

function clamp(min: number, max: number, value: number) {
  return Math.min(max, Math.max(min, value));
}

function focusHref(nodeId: string) {
  return `/focus?memoryId=${encodeURIComponent(nodeId)}`;
}

function replayHref(nodeId: string, replayPathId: string) {
  return `/replay?memoryId=${encodeURIComponent(nodeId)}&manifestId=${encodeURIComponent(replayPathId)}`;
}

function rememberMemoryId(nodeId: string) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem('urai-lifemap-selected-memory-id', nodeId);
}

function formatDate(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.valueOf())) return 'Memory time preserved';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function clusterName(node: LifeMapNode) {
  return (node.seasonId || node.chapterId || node.type)
    .replace(/^season-/, '')
    .replace(/^chapter-/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function cameraForNode(node: LifeMapNode, zoom = 1.22): CameraState {
  return {
    rx: clamp(-26, 20, -8 - node.position.y * 0.055),
    ry: clamp(-34, 36, 10 + node.position.x * 0.07),
    tx: clamp(-42, 42, -node.position.x * 0.22),
    ty: clamp(-36, 36, node.position.y * 0.16),
    zoom,
  };
}

function project(node: LifeMapNode, camera: CameraState, activeId?: string, neighborIds?: Set<string>): ProjectedMemory {
  const rx = (camera.rx * Math.PI) / 180;
  const ry = (camera.ry * Math.PI) / 180;
  const rotatedX = node.position.x * Math.cos(ry) + node.position.z * Math.sin(ry) * 0.18;
  const rotatedY = node.position.y * Math.cos(rx) - node.position.z * Math.sin(rx) * 0.13;
  const rotatedZ = node.position.z * Math.cos(ry) - node.position.x * Math.sin(ry) * 0.38;
  const depth = clamp(0, 1, (rotatedZ + 660) / 760);
  const active = node.id === activeId;
  const neighbor = Boolean(neighborIds?.has(node.id));
  const x = clamp(5, 95, 50 + (rotatedX + camera.tx) * (0.33 + depth * 0.27) * camera.zoom);
  const y = clamp(6, 91, 50 - (rotatedY + camera.ty) * (0.42 + depth * 0.15) * camera.zoom - rotatedZ * 0.01);
  const scale = clamp(0.55, 2.05, (0.68 + depth * 0.55 + node.size * 0.14 + (active ? 0.22 : 0)) * Math.pow(camera.zoom, 0.2));
  return {
    node,
    x,
    y,
    depth,
    scale,
    zIndex: Math.round(20 + depth * 120 + (active ? 260 : neighbor ? 90 : 0)),
    active,
    neighbor,
  };
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  return reduced;
}

export function CinematicLifeMapScene({ nodes, edges, replayPath, selectedNodeId, onSelectNode, onReturnHome }: Props) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const validSelectedId = nodes.some((node) => node.id === selectedNodeId) ? selectedNodeId : undefined;
  const initialNode = nodes.find((node) => node.id === validSelectedId) ?? nodes.find((node) => node.id === 'chapter-becoming') ?? nodes[0];
  const [activeNodeId, setActiveNodeId] = useState<string | undefined>(initialNode?.id);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | undefined>();
  const [travelNodeId, setTravelNodeId] = useState<string | undefined>();
  const [orbLine, setOrbLine] = useState('The orb is reading the constellation. Choose a star and stay with it.');
  const [camera, setCamera] = useState<CameraState>(initialNode ? cameraForNode(initialNode, 1.08) : DEFAULT_CAMERA);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; camera: CameraState } | null>(null);
  const travelTimeoutRef = useRef<number | null>(null);

  const byId = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const activeNode = activeNodeId ? byId.get(activeNodeId) : undefined;
  const featuredNode = (hoveredNodeId && byId.get(hoveredNodeId)) || activeNode || initialNode;
  const routeNode = activeNode || featuredNode || nodes[0];
  const focusNodeId = routeNode?.id ?? 'quiet-reset';

  useEffect(() => {
    if (!validSelectedId) return;
    const node = byId.get(validSelectedId);
    if (!node) return;
    setActiveNodeId(node.id);
    setCamera(cameraForNode(node, 1.18));
    rememberMemoryId(node.id);
  }, [byId, validSelectedId]);

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

  const projectedNodes = useMemo(() => nodes.map((node) => project(node, camera, activeNodeId, neighborIds)).sort((a, b) => a.depth - b.depth), [activeNodeId, camera, neighborIds, nodes]);
  const projectionById = useMemo(() => new Map(projectedNodes.map((node) => [node.node.id, node])), [projectedNodes]);
  const activeProjection = activeNode ? projectionById.get(activeNode.id) : undefined;

  const selectNode = useCallback(
    (nodeId: string) => {
      const node = byId.get(nodeId);
      if (!node) return;
      setActiveNodeId(node.id);
      setHoveredNodeId(undefined);
      setTravelNodeId(undefined);
      setCamera(cameraForNode(node, 1.28));
      rememberMemoryId(node.id);
      onSelectNode(node.id);
      setOrbLine(`${node.title} is open. The memory image is inside the star; Focus enters it, Replay embodies it.`);
    },
    [byId, onSelectNode],
  );

  const enterFocus = useCallback(
    (nodeId = focusNodeId) => {
      const node = byId.get(nodeId);
      if (!node) return;
      rememberMemoryId(node.id);
      setActiveNodeId(node.id);
      setTravelNodeId(node.id);
      setCamera(cameraForNode(node, 1.42));
      onSelectNode(node.id);
      if (travelTimeoutRef.current) window.clearTimeout(travelTimeoutRef.current);
      travelTimeoutRef.current = window.setTimeout(() => router.push(focusHref(node.id)), reducedMotion ? REDUCED_TRAVEL_MS : TRAVEL_MS);
    },
    [byId, focusNodeId, onSelectNode, reducedMotion, router],
  );

  const enterReplay = useCallback(
    (nodeId = focusNodeId) => {
      rememberMemoryId(nodeId);
      router.push(replayHref(nodeId, replayPath.id));
    },
    [focusNodeId, replayPath.id, router],
  );

  const resetView = useCallback(() => {
    setCamera(DEFAULT_CAMERA);
    setActiveNodeId(undefined);
    setHoveredNodeId(undefined);
    setTravelNodeId(undefined);
    setOrbLine('Overview restored. The constellation is wide open again.');
  }, []);

  const moveSelection = useCallback(
    (direction: 1 | -1) => {
      if (!nodes.length) return;
      const currentId = activeNodeId || hoveredNodeId || nodes[0].id;
      const currentIndex = Math.max(0, nodes.findIndex((node) => node.id === currentId));
      const next = nodes[(currentIndex + direction + nodes.length) % nodes.length];
      selectNode(next.id);
    },
    [activeNodeId, hoveredNodeId, nodes, selectNode],
  );

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('button, a, [role="button"]')) return;
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, camera };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [camera]);

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    setCamera({
      rx: clamp(-28, 24, drag.camera.rx - dy * 0.045),
      ry: clamp(-38, 40, drag.camera.ry + dx * 0.065),
      tx: clamp(-48, 48, drag.camera.tx + dx * 0.044),
      ty: clamp(-38, 38, drag.camera.ty - dy * 0.034),
      zoom: drag.camera.zoom,
    });
  }, []);

  const onPointerUp = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }, []);

  const onWheel = useCallback((event: ReactWheelEvent<HTMLElement>) => {
    event.preventDefault();
    setCamera((current) => ({ ...current, zoom: clamp(0.78, 1.58, current.zoom - event.deltaY * 0.0012) }));
  }, []);

  if (!nodes.length) {
    return (
      <section className="urai-cinematic-life-map" data-testid="urai-cinematic-lifemap" aria-label="URAI Life Map empty constellation">
        <div className="lm-empty">
          <p>URAI Spatial · Life Map</p>
          <h1>Your constellation is ready for its first memory.</h1>
          <Link href="/home">Return home</Link>
        </div>
        <style jsx>{styles}</style>
      </section>
    );
  }

  const shellStyle = {
    '--camera-rx': `${camera.rx}deg`,
    '--camera-ry': `${camera.ry}deg`,
    '--camera-zoom': String(camera.zoom),
  } as CSSProperties;

  const capsuleStyle = activeProjection && activeNode ? {
    '--capsule-color': activeNode.auraColor,
    '--capsule-core': activeNode.color,
    left: `${activeProjection.x}%`,
    top: `${activeProjection.y}%`,
    zIndex: activeProjection.zIndex + 80,
  } as CSSProperties : undefined;

  return (
    <section
      className="urai-cinematic-life-map"
      data-testid="urai-cinematic-lifemap"
      aria-label="URAI Life Map cinematic spatial memory universe"
      tabIndex={0}
      style={shellStyle}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') moveSelection(1);
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') moveSelection(-1);
        if (event.key === 'Escape') {
          event.preventDefault();
          if (activeNodeId) resetView();
          else {
            onReturnHome();
            router.push('/home');
          }
        }
        if (event.key.toLowerCase() === 'r' || event.key === '0') resetView();
        if (event.key === '+' || event.key === '=') setCamera((current) => ({ ...current, zoom: clamp(0.78, 1.58, current.zoom + 0.08) }));
        if (event.key === '-' || event.key === '_') setCamera((current) => ({ ...current, zoom: clamp(0.78, 1.58, current.zoom - 0.08) }));
      }}
    >
      <div className="lm-sky" aria-hidden="true" />
      <div className="lm-nebula lm-nebula-a" aria-hidden="true" />
      <div className="lm-nebula lm-nebula-b" aria-hidden="true" />
      <div className="lm-depth-grid" aria-hidden="true" />
      <div className="lm-horizon" aria-hidden="true" />
      <div className="lm-ground" aria-hidden="true" />

      <header className="lm-title-panel">
        <p>URAI Spatial · Life Map</p>
        <h1>Life Map</h1>
        <span>Step inside yourself. Click a memory star; the camera moves to it and opens the image/form inside.</span>
      </header>

      <div className="lm-camera" data-testid="urai-lifemap-camera" aria-label="Drag empty space to orbit the constellation. Use wheel or plus and minus keys to zoom.">
        <svg className="lm-edge-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {edges.map((edge) => {
            const from = projectionById.get(edge.fromNodeId);
            const to = projectionById.get(edge.toNodeId);
            if (!from || !to) return null;
            const activeEdge = Boolean(activeNode && (edge.fromNodeId === activeNode.id || edge.toNodeId === activeNode.id));
            return <line key={edge.id} x1={from.x} y1={from.y} x2={to.x} y2={to.y} className={activeEdge ? 'lm-edge lm-edge-active' : 'lm-edge'} style={{ '--edge-color': edge.color, '--edge-strength': edge.strength } as CSSProperties} />;
          })}
        </svg>

        {projectedNodes.map((projected, index) => {
          const { node } = projected;
          const nodeStyle = {
            '--node-color': node.color,
            '--node-aura': node.auraColor,
            '--node-scale': String(projected.scale),
            '--node-depth': String(projected.depth),
            '--node-delay': `${index * -0.17}s`,
            left: `${projected.x}%`,
            top: `${projected.y}%`,
            zIndex: projected.zIndex,
          } as CSSProperties;
          return (
            <button
              key={node.id}
              type="button"
              className={`lm-memory-star ${projected.active ? 'lm-memory-star-active' : ''} ${projected.neighbor ? 'lm-memory-star-neighbor' : ''}`}
              data-testid="urai-lifemap-memory-star"
              data-memory-id={node.id}
              data-active={projected.active ? 'true' : 'false'}
              style={nodeStyle}
              onMouseEnter={() => setHoveredNodeId(node.id)}
              onMouseLeave={() => setHoveredNodeId(undefined)}
              onFocus={() => setHoveredNodeId(node.id)}
              onBlur={() => setHoveredNodeId(undefined)}
              onClick={(event) => {
                event.stopPropagation();
                selectNode(node.id);
              }}
              onDoubleClick={(event) => {
                event.stopPropagation();
                enterFocus(node.id);
              }}
              aria-label={`Select memory star ${node.title}. ${node.subtitle}`}
            >
              <span className="lm-star-aura" aria-hidden="true" />
              <span className="lm-star-core" aria-hidden="true">{node.glyph}</span>
              <span className="lm-star-label"><strong>{node.title}</strong><small>{clusterName(node)}</small></span>
            </button>
          );
        })}
      </div>

      {activeNode && activeProjection && capsuleStyle ? (
        <aside className="lm-memory-capsule" data-testid="urai-lifemap-memory-capsule" aria-live="polite" aria-label="Selected memory image capsule" style={capsuleStyle}>
          <div className="lm-capsule-image" aria-hidden="true">
            <span className="lm-capsule-image-sky" />
            <span className="lm-capsule-image-horizon" />
            <span className="lm-capsule-image-core">{activeNode.glyph}</span>
            <span className="lm-capsule-image-thread" />
          </div>
          <div className="lm-capsule-copy">
            <p>{clusterName(activeNode)} · {formatDate(activeNode.timestamp)}</p>
            <h2>{activeNode.title}</h2>
            <span>{activeNode.subtitle}</span>
            <small>{activeNode.emotionalTone} · {Math.round(activeNode.emotionalIntensity * 100)}% awake · {activeNode.privacyLevel}</small>
          </div>
          <div className="lm-capsule-actions">
            <button type="button" onClick={() => enterFocus(activeNode.id)}>Open Focus</button>
            <button type="button" onClick={() => enterReplay(activeNode.id)}>Replay</button>
            <button type="button" onClick={resetView}>Return galaxy</button>
          </div>
        </aside>
      ) : null}

      <aside className="lm-orb-companion" data-testid="urai-lifemap-orb-companion" aria-label="URAI orb companion">
        <button type="button" onClick={() => routeNode && selectNode(routeNode.id)} aria-label="Ask the URAI orb to guide the selected memory">
          <span aria-hidden="true" />
          <strong>URAI orb</strong>
        </button>
        <p>{orbLine}</p>
      </aside>

      <aside className="lm-hud" aria-label="Life Map controls">
        <div><span>Stars</span><strong>{nodes.length}</strong></div>
        <div><span>Selected</span><strong>{activeNode ? activeNode.title : 'overview'}</strong></div>
        <div><span>Camera</span><strong>{Math.round(camera.zoom * 100)}%</strong></div>
        <p>Drag to orbit. Wheel or +/- zooms. Arrow keys step stars. Double-click a star or press Open Focus to enter.</p>
        <div>
          <button type="button" onClick={resetView}>Reset view</button>
          <button type="button" onClick={() => enterFocus(focusNodeId)}>Open Focus</button>
        </div>
      </aside>

      <nav className="lm-route-stones" aria-label="URAI route portals">
        <Link href={focusHref(focusNodeId)}>Focus</Link>
        <Link href={replayHref(focusNodeId, replayPath.id)}>Replay</Link>
        <Link href="/mirror">Mirror</Link>
        <Link href="/passport">Passport</Link>
        <Link href="/status">Status</Link>
        <Link href="/privacy-controls">Privacy</Link>
        <Link href="/home">Home</Link>
      </nav>

      {travelNodeId && byId.get(travelNodeId) ? (
        <div className="lm-focus-gate" data-testid="urai-lifemap-star-travel" aria-live="polite" style={{ '--gate-color': byId.get(travelNodeId)?.auraColor ?? '#67e8f9' } as CSSProperties}>
          <div>
            <p>Entering memory</p>
            <strong>{byId.get(travelNodeId)?.title}</strong>
            <small>The selected star is opening in Focus.</small>
          </div>
        </div>
      ) : null}

      <style jsx>{styles}</style>
    </section>
  );
}

const styles = `
.urai-cinematic-life-map {
  position: relative;
  min-height: 100svh;
  width: 100%;
  overflow: hidden;
  isolation: isolate;
  color: #f8fbff;
  background:
    radial-gradient(circle at 18% 14%, rgba(56, 189, 248, 0.24), transparent 28rem),
    radial-gradient(circle at 82% 30%, rgba(168, 85, 247, 0.25), transparent 31rem),
    radial-gradient(circle at 52% 92%, rgba(132, 204, 22, 0.16), transparent 30rem),
    linear-gradient(180deg, #071426 0%, #030712 52%, #01030a 100%);
  perspective: 1200px;
  outline: none;
  cursor: grab;
  touch-action: none;
}
.lm-sky,
.lm-nebula,
.lm-depth-grid,
.lm-horizon,
.lm-ground {
  position: absolute;
  pointer-events: none;
}
.lm-sky {
  inset: -12%;
  z-index: -8;
  background-image:
    radial-gradient(circle, rgba(255,255,255,0.92) 0 1px, transparent 1.45px),
    radial-gradient(circle, rgba(125,211,252,0.58) 0 1px, transparent 1.7px),
    radial-gradient(circle, rgba(216,180,254,0.62) 0 1px, transparent 1.8px);
  background-size: 145px 145px, 231px 231px, 373px 373px;
  background-position: 50% 50%, 18% 35%, 82% 18%;
  opacity: 0.36;
  filter: drop-shadow(0 0 10px rgba(125,211,252,0.22));
  transform: translateZ(-360px) scale(1.22);
}
.lm-nebula { inset: -14%; z-index: -7; filter: blur(28px) saturate(1.32); opacity: 0.82; animation: lmNebula 20s ease-in-out infinite alternate; }
.lm-nebula-a { background: conic-gradient(from 220deg at 42% 48%, transparent, rgba(125,211,252,0.18), transparent, rgba(192,132,252,0.16), transparent); }
.lm-nebula-b { background: radial-gradient(ellipse at 54% 64%, rgba(132,204,22,0.16), transparent 40%); animation-delay: -9s; }
.lm-depth-grid { inset: 4% 2% 1%; z-index: -5; border-radius: 50%; background: radial-gradient(ellipse at 50% 54%, transparent 0 39%, rgba(125,211,252,0.12) 39.2% 39.6%, transparent 40%), radial-gradient(ellipse at 50% 52%, transparent 0 58%, rgba(192,132,252,0.10) 58.2% 58.6%, transparent 59%), radial-gradient(ellipse at 50% 50%, transparent 0 76%, rgba(190,242,100,0.08) 76.2% 76.6%, transparent 77%); transform: rotateX(64deg); opacity: 0.76; }
.lm-horizon { left: -8%; right: -8%; bottom: 23%; height: 28%; z-index: -4; background: linear-gradient(180deg, transparent, rgba(125,211,252,0.10) 46%, rgba(2,6,23,0.56)); filter: blur(4px); }
.lm-ground { left: -12%; right: -12%; bottom: -18%; height: 38%; z-index: -3; border-radius: 50% 50% 0 0; background: radial-gradient(ellipse at 50% 0%, rgba(125,211,252,0.20), transparent 40%), radial-gradient(ellipse at 42% 22%, rgba(132,204,22,0.15), transparent 36%), linear-gradient(180deg, rgba(9,25,43,0.88), rgba(2,6,23,0.94)); border-top: 1px solid rgba(186,230,253,0.15); box-shadow: inset 0 28px 90px rgba(125,211,252,0.06); }
.lm-title-panel,
.lm-hud,
.lm-orb-companion,
.lm-memory-capsule,
.lm-route-stones,
.lm-focus-gate { position: absolute; z-index: 20; pointer-events: auto; }
.lm-title-panel { top: clamp(0.9rem, 2.3vw, 1.8rem); left: clamp(0.9rem, 2.3vw, 1.8rem); width: min(24rem, calc(100vw - 1.8rem)); padding: clamp(0.92rem, 1.6vw, 1.2rem); border: 1px solid rgba(226,232,240,0.16); border-radius: 1.35rem; background: linear-gradient(145deg, rgba(5,12,28,0.78), rgba(15,23,42,0.42)); backdrop-filter: blur(22px) saturate(1.18); box-shadow: 0 30px 90px rgba(0,0,0,0.36), inset 0 1px 0 rgba(255,255,255,0.08); }
.lm-title-panel p,
.lm-capsule-copy p,
.lm-focus-gate p { margin: 0; color: #bae6fd; font-size: 0.66rem; font-weight: 900; letter-spacing: 0.18em; text-transform: uppercase; }
.lm-title-panel h1 { margin: 0.18rem 0 0; font-size: clamp(2.7rem, 5.2vw, 5.4rem); line-height: 0.84; letter-spacing: -0.08em; }
.lm-title-panel span { display: block; margin-top: 0.72rem; color: rgba(226,232,240,0.78); line-height: 1.42; }
.lm-camera { position: absolute; inset: -5% -4% -4%; transform-style: preserve-3d; transform: rotateX(var(--camera-rx)) rotateY(var(--camera-ry)) scale(var(--camera-zoom)); transition: transform 560ms cubic-bezier(0.2,0.8,0.2,1); }
.lm-edge-layer { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; filter: drop-shadow(0 0 12px rgba(125,211,252,0.18)); }
.lm-edge { --edge-color: #7dd3fc; stroke: var(--edge-color); stroke-width: calc(0.1 + var(--edge-strength, 0.5) * 0.1); stroke-linecap: round; opacity: 0.22; vector-effect: non-scaling-stroke; transition: opacity 180ms ease, stroke-width 180ms ease, filter 180ms ease; }
.lm-edge-active { opacity: 0.9; stroke-width: 0.26; filter: drop-shadow(0 0 12px var(--edge-color)); }
.lm-memory-star { --node-color: #7dd3fc; --node-aura: #bae6fd; --node-scale: 1; --node-depth: 0.6; --node-delay: 0s; position: absolute; display: inline-grid; grid-template-columns: auto minmax(0,1fr); align-items: center; gap: 0.55rem; border: 0; border-radius: 999px; background: transparent; color: #f8fbff; padding: 0.2rem 0.25rem; text-align: left; cursor: pointer; opacity: calc(0.38 + var(--node-depth) * 0.62); transform: translate3d(-50%, -50%, calc(var(--node-depth) * 240px)) scale(var(--node-scale)); transform-style: preserve-3d; animation: lmStarDrift 7s ease-in-out infinite alternate; animation-delay: var(--node-delay); }
.lm-memory-star:focus-visible { outline: 2px solid color-mix(in srgb, var(--node-aura) 72%, white); outline-offset: 0.35rem; }
.lm-star-aura { position: absolute; left: 1.45rem; top: 50%; width: 4.8rem; height: 4.8rem; border-radius: 50%; background: radial-gradient(circle, color-mix(in srgb, var(--node-aura) 28%, transparent), transparent 68%); transform: translate(-50%, -50%); filter: blur(3px); opacity: 0.44; pointer-events: none; }
.lm-star-core { position: relative; z-index: 2; width: 2.18rem; height: 2.18rem; display: grid; place-items: center; border: 1px solid color-mix(in srgb, var(--node-aura) 56%, transparent); border-radius: 999px; color: #020617; font-size: 0.92rem; font-weight: 950; background: radial-gradient(circle at 36% 28%, rgba(255,255,255,0.98), transparent 16%), radial-gradient(circle, var(--node-color), rgba(15,23,42,0.58) 70%); box-shadow: 0 0 20px color-mix(in srgb, var(--node-aura) 72%, transparent), 0 0 54px color-mix(in srgb, var(--node-color) 40%, transparent); text-shadow: 0 1px 10px rgba(255,255,255,0.5); transition: transform 180ms ease, box-shadow 180ms ease; }
.lm-star-label { position: relative; z-index: 2; display: grid; gap: 0.05rem; min-width: 0; max-width: min(15rem, 32vw); padding: 0.42rem 0.72rem 0.42rem 0.15rem; border: 1px solid rgba(226,232,240,0.12); border-left: 0; border-radius: 0 999px 999px 0; background: linear-gradient(90deg, rgba(2,6,23,0.1), rgba(2,6,23,0.76)); box-shadow: 0 12px 34px rgba(0,0,0,0.24); backdrop-filter: blur(13px); opacity: 0; transform: translateX(-0.28rem) scale(0.94); transform-origin: left center; transition: opacity 170ms ease, transform 170ms ease, border-color 170ms ease; }
.lm-star-label strong,
.lm-star-label small { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.lm-star-label strong { font-size: 0.72rem; font-weight: 900; }
.lm-star-label small { color: rgba(203,213,225,0.72); font-size: 0.61rem; }
.lm-memory-star:hover,
.lm-memory-star:focus-visible,
.lm-memory-star-active,
.lm-memory-star-neighbor { opacity: 1; filter: drop-shadow(0 0 24px color-mix(in srgb, var(--node-aura) 55%, transparent)); }
.lm-memory-star:hover .lm-star-label,
.lm-memory-star:focus-visible .lm-star-label,
.lm-memory-star-active .lm-star-label,
.lm-memory-star-neighbor .lm-star-label { opacity: 1; transform: translateX(0) scale(1); border-color: color-mix(in srgb, var(--node-color) 38%, rgba(255,255,255,0.16)); }
.lm-memory-star-active .lm-star-core { transform: scale(1.16); box-shadow: 0 0 34px color-mix(in srgb, var(--node-aura) 88%, transparent), 0 0 90px color-mix(in srgb, var(--node-color) 58%, transparent); }
.lm-memory-capsule { --capsule-color: #7dd3fc; --capsule-core: #38bdf8; width: min(29rem, calc(100vw - 2rem)); transform: translate(-50%, calc(-100% - 3.8rem)); display: grid; grid-template-columns: 7.2rem 1fr; gap: 0.9rem; padding: 0.85rem; border: 1px solid color-mix(in srgb, var(--capsule-color) 42%, rgba(255,255,255,0.16)); border-radius: 1.55rem; background: linear-gradient(145deg, rgba(3,8,20,0.88), rgba(15,23,42,0.66)); box-shadow: 0 0 90px color-mix(in srgb, var(--capsule-color) 28%, transparent), 0 30px 80px rgba(0,0,0,0.44), inset 0 1px 0 rgba(255,255,255,0.08); backdrop-filter: blur(24px) saturate(1.22); animation: lmCapsuleOpen 360ms cubic-bezier(0.2,0.8,0.2,1) both; }
.lm-capsule-image { position: relative; min-height: 8.8rem; overflow: hidden; border-radius: 1.15rem; border: 1px solid color-mix(in srgb, var(--capsule-color) 32%, transparent); background: radial-gradient(circle at 38% 32%, rgba(255,255,255,0.95), var(--capsule-color) 16%, transparent 34%), radial-gradient(circle at 64% 66%, color-mix(in srgb, var(--capsule-core) 58%, transparent), transparent 45%), linear-gradient(180deg, #071225, #020617); box-shadow: inset 0 0 38px rgba(255,255,255,0.06); }
.lm-capsule-image-sky,
.lm-capsule-image-horizon,
.lm-capsule-image-core,
.lm-capsule-image-thread { position: absolute; pointer-events: none; }
.lm-capsule-image-sky { inset: 0; background-image: radial-gradient(circle, rgba(255,255,255,0.72) 0 1px, transparent 1.5px); background-size: 28px 28px; opacity: 0.28; }
.lm-capsule-image-horizon { left: -10%; right: -10%; bottom: 16%; height: 34%; border-radius: 50% 50% 0 0; background: radial-gradient(ellipse at 50% 0%, color-mix(in srgb, var(--capsule-color) 22%, transparent), transparent 52%); border-top: 1px solid color-mix(in srgb, var(--capsule-color) 26%, transparent); }
.lm-capsule-image-core { left: 50%; top: 42%; width: 3.4rem; height: 3.4rem; transform: translate(-50%, -50%); display: grid; place-items: center; border-radius: 999px; color: #020617; font-weight: 950; background: radial-gradient(circle at 34% 24%, #fff, var(--capsule-color) 38%, var(--capsule-core) 72%); box-shadow: 0 0 42px var(--capsule-color); }
.lm-capsule-image-thread { left: 12%; right: 12%; bottom: 31%; height: 2px; background: linear-gradient(90deg, transparent, var(--capsule-color), transparent); box-shadow: 0 0 20px var(--capsule-color); }
.lm-capsule-copy { align-self: center; min-width: 0; }
.lm-capsule-copy h2 { margin: 0.22rem 0 0.28rem; font-size: clamp(1.15rem, 2.1vw, 1.72rem); line-height: 0.96; letter-spacing: -0.045em; }
.lm-capsule-copy span,
.lm-capsule-copy small { display: block; color: rgba(226,232,240,0.78); line-height: 1.38; }
.lm-capsule-copy small { margin-top: 0.46rem; color: color-mix(in srgb, var(--capsule-color) 72%, #e2e8f0); font-weight: 760; }
.lm-capsule-actions { grid-column: 1 / -1; display: flex; gap: 0.5rem; flex-wrap: wrap; }
.lm-capsule-actions button,
.lm-hud button,
.lm-orb-companion button,
.lm-route-stones a,
.lm-empty a { appearance: none; border: 1px solid rgba(226,232,240,0.18); border-radius: 999px; background: rgba(15,23,42,0.72); color: #f8fbff; font: inherit; font-weight: 880; min-height: 2.55rem; padding: 0 0.86rem; text-decoration: none; cursor: pointer; transition: transform 160ms ease, border-color 160ms ease, background 160ms ease, box-shadow 160ms ease; }
.lm-capsule-actions button:first-child,
.lm-hud button:last-child,
.lm-route-stones a:first-child { color: #020617; background: linear-gradient(135deg, rgba(125,211,252,0.94), rgba(192,132,252,0.84)); border-color: rgba(255,255,255,0.36); }
.lm-capsule-actions button:hover,
.lm-hud button:hover,
.lm-orb-companion button:hover,
.lm-route-stones a:hover,
.lm-empty a:hover { transform: translateY(-1px); border-color: rgba(255,255,255,0.42); box-shadow: 0 16px 42px rgba(14,165,233,0.22); }
.lm-orb-companion { right: clamp(0.9rem, 2.3vw, 1.8rem); bottom: clamp(5.2rem, 8vw, 6.6rem); width: min(20rem, calc(100vw - 1.8rem)); display: grid; grid-template-columns: auto 1fr; gap: 0.72rem; align-items: center; padding: 0.7rem; border: 1px solid rgba(226,232,240,0.14); border-radius: 1.35rem; background: rgba(2,6,23,0.58); backdrop-filter: blur(20px) saturate(1.18); box-shadow: 0 22px 70px rgba(0,0,0,0.34); }
.lm-orb-companion button { position: relative; width: 4.4rem; height: 4.4rem; min-height: auto; padding: 0; display: grid; place-items: end center; padding-bottom: 0.45rem; overflow: hidden; }
.lm-orb-companion button span { position: absolute; inset: 0.68rem; border-radius: 999px; background: radial-gradient(circle at 35% 26%, #fff, #bff8ff 22%, #67e8f9 54%, #312e81 100%); box-shadow: 0 0 32px rgba(103,232,249,0.78), 0 0 90px rgba(103,232,249,0.26); animation: lmOrb 4.8s ease-in-out infinite; }
.lm-orb-companion button strong { position: relative; z-index: 2; color: rgba(2,6,23,0.84); font-size: 0.55rem; text-shadow: 0 1px 10px rgba(255,255,255,0.64); }
.lm-orb-companion p { margin: 0; color: rgba(226,232,240,0.76); font-size: 0.78rem; line-height: 1.38; }
.lm-hud { top: clamp(0.9rem, 2.3vw, 1.8rem); right: clamp(0.9rem, 2.3vw, 1.8rem); width: min(21rem, calc(100vw - 1.8rem)); display: grid; gap: 0.62rem; padding: 0.9rem; border: 1px solid rgba(226,232,240,0.14); border-radius: 1.25rem; background: rgba(2,6,23,0.62); backdrop-filter: blur(20px) saturate(1.18); box-shadow: 0 22px 70px rgba(0,0,0,0.34); }
.lm-hud div:not(:last-child) { display: flex; justify-content: space-between; gap: 1rem; align-items: baseline; }
.lm-hud span { color: rgba(203,213,225,0.68); font-size: 0.74rem; }
.lm-hud strong { text-align: right; font-size: 0.86rem; }
.lm-hud p { margin: 0; color: rgba(226,232,240,0.74); font-size: 0.78rem; line-height: 1.42; }
.lm-hud div:last-child { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.lm-route-stones { left: 50%; bottom: clamp(0.9rem, 2.4vw, 1.5rem); transform: translateX(-50%); display: flex; gap: 0.42rem; align-items: center; padding: 0.44rem; border: 1px solid rgba(226,232,240,0.14); border-radius: 999px; background: rgba(2,6,23,0.70); box-shadow: 0 18px 60px rgba(0,0,0,0.42); backdrop-filter: blur(20px) saturate(1.18); }
.lm-route-stones a { font-size: 0.78rem; min-height: 2.35rem; padding-inline: 0.82rem; }
.lm-focus-gate { inset: 0; z-index: 60; display: grid; place-items: center; pointer-events: none; background: radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--gate-color) 26%, transparent), transparent 27%), radial-gradient(circle at 50% 50%, transparent 0 22%, rgba(2,6,23,0.38) 36%, rgba(2,6,23,0.82) 100%); animation: lmGate 620ms cubic-bezier(0.2,0.8,0.2,1) both; }
.lm-focus-gate > div { text-align: center; padding: 1.05rem 1.25rem; border: 1px solid color-mix(in srgb, var(--gate-color) 58%, transparent); border-radius: 1.55rem; background: rgba(2,6,23,0.76); box-shadow: 0 0 110px color-mix(in srgb, var(--gate-color) 35%, transparent); backdrop-filter: blur(20px); }
.lm-focus-gate strong { display: block; margin-top: 0.2rem; font-size: 1.16rem; }
.lm-focus-gate small { display: block; margin-top: 0.4rem; color: rgba(226,232,240,0.72); }
.lm-empty { position: absolute; inset: clamp(1rem,4vw,3rem); display: grid; align-content: center; gap: 1rem; padding: clamp(1rem,4vw,2rem); border: 1px solid rgba(226,232,240,0.16); border-radius: 2rem; background: rgba(2,6,23,0.84); backdrop-filter: blur(20px); }
.lm-empty h1 { max-width: 12ch; margin: 0; font-size: clamp(2.4rem, 8vw, 5.4rem); line-height: 0.86; letter-spacing: -0.08em; }
@keyframes lmNebula { from { opacity: 0.66; filter: blur(30px) saturate(1.18); } to { opacity: 1; filter: blur(22px) saturate(1.42); } }
@keyframes lmStarDrift { from { translate: 0 0; } to { translate: 0 -0.24rem; } }
@keyframes lmCapsuleOpen { from { opacity: 0; transform: translate(-50%, calc(-100% - 2.7rem)) scale(0.96); } to { opacity: 1; transform: translate(-50%, calc(-100% - 3.8rem)) scale(1); } }
@keyframes lmOrb { 0%, 100% { transform: scale(0.98); opacity: 0.86; } 50% { transform: scale(1.03); opacity: 1; } }
@keyframes lmGate { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
@media (max-width: 1040px) {
  .lm-title-panel { max-width: 20rem; }
  .lm-hud { top: auto; bottom: 8.3rem; max-width: 22rem; }
  .lm-orb-companion { display: none; }
  .lm-memory-capsule { transform: translate(-50%, calc(-100% - 2.8rem)); }
}
@media (max-width: 720px) {
  .lm-title-panel { width: calc(100vw - 2rem); max-width: none; }
  .lm-title-panel h1 { font-size: 3rem; }
  .lm-title-panel span { font-size: 0.88rem; }
  .lm-hud { left: 1rem; right: 1rem; bottom: 5.8rem; width: auto; max-width: none; }
  .lm-hud p { display: none; }
  .lm-route-stones { left: 1rem; right: 1rem; width: auto; transform: none; justify-content: flex-start; overflow-x: auto; border-radius: 1.4rem; }
  .lm-route-stones a { flex: 0 0 auto; }
  .lm-camera { inset: 5% -22% 3%; }
  .lm-star-label { max-width: 9rem; }
  .lm-memory-capsule { width: calc(100vw - 1.5rem); grid-template-columns: 1fr; left: 50% !important; top: auto !important; bottom: 6.1rem; transform: translateX(-50%); max-height: 48svh; overflow: auto; }
  .lm-capsule-image { min-height: 6.6rem; }
  .lm-hud { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .urai-cinematic-life-map *, .urai-cinematic-life-map *::before, .urai-cinematic-life-map *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
}
`;
