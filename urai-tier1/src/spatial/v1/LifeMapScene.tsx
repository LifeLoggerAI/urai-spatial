'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls, Sparkles, Stars } from '@react-three/drei';
import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

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
  center: THREE.Vector3;
  intensity: number;
};

const DEFAULT_CAMERA = new THREE.Vector3(0, 40, 185);
const DEFAULT_TARGET = new THREE.Vector3(0, 8, -220);

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function prettyToken(value?: string) {
  if (!value) return 'Constellation';
  return value
    .replace(/^chapter-/, '')
    .replace(/^season-/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function clusterKeyForNode(node: LifeMapNodeModel) {
  return node.seasonId || node.chapterId || node.type;
}

function clusterLabelForNode(node: LifeMapNodeModel) {
  return prettyToken(node.seasonId || node.chapterId || node.type);
}

function focusUrlForNode(nodeId: string) {
  return `/focus?memoryId=${encodeURIComponent(nodeId)}`;
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

class LifeMapCanvasBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.setState({ failed: true });
  }

  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

function buildClusters(nodes: LifeMapNodeModel[]) {
  const groups = new Map<string, ClusterModel>();

  nodes.forEach((node) => {
    const key = clusterKeyForNode(node);
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
      existing.center.add(new THREE.Vector3(node.position.x, node.position.y, node.position.z));
      existing.intensity += node.emotionalIntensity;
      return;
    }

    groups.set(key, {
      key,
      label: clusterLabelForNode(node),
      color: node.auraColor || node.color,
      count: 1,
      center: new THREE.Vector3(node.position.x, node.position.y, node.position.z),
      intensity: node.emotionalIntensity,
    });
  });

  return Array.from(groups.values()).map((cluster) => ({
    ...cluster,
    center: cluster.center.multiplyScalar(1 / cluster.count),
    intensity: cluster.intensity / cluster.count,
  }));
}

function LifeMapCameraRig({
  focusNode,
  resetNonce,
  reducedMotion,
}: {
  focusNode?: LifeMapNodeModel;
  resetNonce: number;
  reducedMotion: boolean;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  useEffect(() => {
    camera.position.copy(DEFAULT_CAMERA);
    controlsRef.current?.target.copy(DEFAULT_TARGET);
    controlsRef.current?.update();
  }, [camera, resetNonce]);

  useFrame(() => {
    if (!focusNode) return;

    const target = new THREE.Vector3(focusNode.position.x, focusNode.position.y, focusNode.position.z);
    const desiredCamera = new THREE.Vector3(
      focusNode.position.x + 32,
      focusNode.position.y + 18,
      focusNode.position.z + 72,
    );
    const alpha = reducedMotion ? 0.18 : 0.055;

    camera.position.lerp(desiredCamera, alpha);
    controlsRef.current?.target.lerp(target, alpha * 1.25);
    controlsRef.current?.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping={!reducedMotion}
      dampingFactor={0.075}
      enablePan
      enableRotate
      enableZoom
      minDistance={34}
      maxDistance={270}
      minPolarAngle={0.24}
      maxPolarAngle={Math.PI * 0.78}
      rotateSpeed={0.58}
      zoomSpeed={0.74}
      panSpeed={0.45}
      touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
    />
  );
}

function ConnectionArcs({
  nodes,
  edges,
  highlightedNodeId,
  replayNodeIds,
}: {
  nodes: LifeMapNodeModel[];
  edges: LifeMapEdge[];
  highlightedNodeId?: string;
  replayNodeIds: Set<string>;
}) {
  const nodeLookup = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);

  const arcs = useMemo(
    () =>
      edges
        .map((edge) => {
          const from = nodeLookup.get(edge.fromNodeId);
          const to = nodeLookup.get(edge.toNodeId);
          if (!from || !to) return undefined;

          const fromVector = new THREE.Vector3(from.position.x, from.position.y, from.position.z);
          const toVector = new THREE.Vector3(to.position.x, to.position.y, to.position.z);
          const midpoint = fromVector.clone().lerp(toVector, 0.5);
          midpoint.y += 18 + edge.strength * 22;
          midpoint.z += 12;

          const curve = new THREE.CatmullRomCurve3([fromVector, midpoint, toVector]);
          const points = curve.getPoints(38);
          const positions = new Float32Array(points.flatMap((point) => point.toArray()));
          const active =
            highlightedNodeId === edge.fromNodeId ||
            highlightedNodeId === edge.toNodeId ||
            replayNodeIds.has(edge.fromNodeId) ||
            replayNodeIds.has(edge.toNodeId);

          return {
            id: edge.id,
            color: edge.color,
            opacity: active ? clamp(0.34 + edge.strength * 0.42, 0.34, 0.88) : clamp(0.12 + edge.strength * 0.22, 0.12, 0.42),
            positions,
          };
        })
        .filter((arc): arc is { id: string; color: string; opacity: number; positions: Float32Array } => Boolean(arc)),
    [edges, highlightedNodeId, nodeLookup, replayNodeIds],
  );

  return (
    <group>
      {arcs.map((arc) => (
        <line key={arc.id}>
          <bufferGeometry attach="geometry">
            <bufferAttribute attach="attributes-position" args={[arc.positions, 3]} />
          </bufferGeometry>
          <lineBasicMaterial color={arc.color} transparent opacity={arc.opacity} depthWrite={false} />
        </line>
      ))}
    </group>
  );
}

function ClusterCloud({ cluster }: { cluster: ClusterModel }) {
  const radius = clamp(24 + cluster.count * 5, 28, 76);

  return (
    <group position={cluster.center.toArray()}>
      <mesh>
        <sphereGeometry args={[radius, 32, 18]} />
        <meshBasicMaterial color={cluster.color} transparent opacity={0.055 + cluster.intensity * 0.04} depthWrite={false} />
      </mesh>
      <mesh rotation={[Math.PI / 2.9, 0.3, 0.15]}>
        <torusGeometry args={[radius * 0.72, 0.18, 8, 96]} />
        <meshBasicMaterial color={cluster.color} transparent opacity={0.2} depthWrite={false} />
      </mesh>
      <Html center distanceFactor={58} className={styles.clusterLabel}>
        <span>{cluster.label}</span>
        <small>{cluster.count} memories</small>
      </Html>
    </group>
  );
}

function MemoryStar({
  node,
  selected,
  hovered,
  replayHighlighted,
  reducedMotion,
  onHover,
  onOpen,
}: {
  node: LifeMapNodeModel;
  selected: boolean;
  hovered: boolean;
  replayHighlighted: boolean;
  reducedMotion: boolean;
  onHover: (nodeId?: string) => void;
  onOpen: (nodeId: string) => void;
}) {
  const groupRef = useRef<THREE.Group | null>(null);
  const baseRadius = clamp(node.size * 1.35 + node.importance * 0.55, 1.2, 2.9);
  const active = selected || hovered || replayHighlighted;
  const nodeStyle = {
    '--node-color': node.color,
    '--node-aura': node.auraColor,
  } as CSSProperties;

  useFrame(({ clock }) => {
    if (!groupRef.current || reducedMotion) return;
    const pulse = Math.sin(clock.elapsedTime * (node.pulseSpeed + 0.34) + node.position.x * 0.02) * 0.09;
    const lift = Math.sin(clock.elapsedTime * 0.22 + node.position.z * 0.03) * 0.9;
    const scale = 1 + pulse + (active ? 0.14 : 0);
    groupRef.current.scale.setScalar(scale);
    groupRef.current.position.y = node.position.y + lift;
  });

  return (
    <group
      ref={groupRef}
      position={[node.position.x, node.position.y, node.position.z]}
      onPointerOver={(event) => {
        event.stopPropagation();
        onHover(node.id);
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        onHover(undefined);
      }}
    >
      <mesh
        onClick={(event) => {
          event.stopPropagation();
          onOpen(node.id);
        }}
      >
        <sphereGeometry args={[baseRadius, 32, 18]} />
        <meshStandardMaterial
          color={node.color}
          emissive={node.auraColor}
          emissiveIntensity={active ? 1.95 : 1.08}
          roughness={0.35}
          metalness={0.12}
          toneMapped={false}
        />
      </mesh>
      <mesh scale={active ? 5.6 : 4.3}>
        <sphereGeometry args={[baseRadius, 32, 18]} />
        <meshBasicMaterial color={node.auraColor} transparent opacity={active ? 0.16 : 0.085} depthWrite={false} />
      </mesh>
      <pointLight color={node.auraColor} intensity={active ? 1.8 : 0.72} distance={active ? 58 : 38} />
      <Html center distanceFactor={active ? 34 : 46} className={styles.starHtml}>
        <button
          type="button"
          className={`${styles.starLabel} ${active ? styles.starLabelActive : ''}`}
          style={nodeStyle}
          onClick={(event) => {
            event.stopPropagation();
            onOpen(node.id);
          }}
          onFocus={() => onHover(node.id)}
          onBlur={() => onHover(undefined)}
          aria-label={`Open memory ${node.title} in Focus`}
        >
          <span className={styles.starGlyph}>{node.glyph}</span>
          <span className={styles.starTitle}>{node.title}</span>
          <span className={styles.starMeta}>{clusterLabelForNode(node)}</span>
        </button>
      </Html>
    </group>
  );
}

function LifeMapUniverse({
  nodes,
  edges,
  clusters,
  selectedNode,
  hoveredNodeId,
  replayNodeIds,
  resetNonce,
  reducedMotion,
  onHover,
  onOpen,
}: {
  nodes: LifeMapNodeModel[];
  edges: LifeMapEdge[];
  clusters: ClusterModel[];
  selectedNode?: LifeMapNodeModel;
  hoveredNodeId?: string;
  replayNodeIds: Set<string>;
  resetNonce: number;
  reducedMotion: boolean;
  onHover: (nodeId?: string) => void;
  onOpen: (nodeId: string) => void;
}) {
  const highlightedNodeId = hoveredNodeId || selectedNode?.id;

  return (
    <>
      <color attach="background" args={['#020617']} />
      <fog attach="fog" args={['#071327', 125, 440]} />
      <ambientLight intensity={0.58} />
      <pointLight position={[0, 60, 90]} intensity={1.2} color="#9fdcff" />
      <pointLight position={[80, -20, -240]} intensity={1.1} color="#f0abfc" />
      <pointLight position={[-90, 42, -320]} intensity={0.95} color="#bef264" />
      <Stars radius={430} depth={130} count={3600} factor={4.7} saturation={0.6} fade speed={reducedMotion ? 0 : 0.32} />
      <Sparkles count={150} scale={[260, 150, 360]} size={3.8} speed={reducedMotion ? 0 : 0.18} opacity={0.36} />
      <LifeMapCameraRig focusNode={selectedNode} resetNonce={resetNonce} reducedMotion={reducedMotion} />
      <group rotation={[0, -0.12, 0]}>
        {clusters.map((cluster) => (
          <ClusterCloud key={cluster.key} cluster={cluster} />
        ))}
        <ConnectionArcs nodes={nodes} edges={edges} highlightedNodeId={highlightedNodeId} replayNodeIds={replayNodeIds} />
        {nodes.map((node) => (
          <MemoryStar
            key={node.id}
            node={node}
            selected={selectedNode?.id === node.id}
            hovered={hoveredNodeId === node.id}
            replayHighlighted={replayNodeIds.has(node.id)}
            reducedMotion={reducedMotion}
            onHover={onHover}
            onOpen={onOpen}
          />
        ))}
      </group>
    </>
  );
}

function LifeMapFallback({
  nodes,
  onOpen,
}: {
  nodes: LifeMapNodeModel[];
  onOpen: (nodeId: string) => void;
}) {
  return (
    <section className={styles.fallback} aria-label="Life Map fallback">
      <p className={styles.eyebrow}>Static safe fallback</p>
      <h2>Your Life Map is still open.</h2>
      <p>The 3D renderer could not start here, so every memory remains available as a launch-safe constellation list.</p>
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
  const [resetNonce, setResetNonce] = useState(0);

  useEffect(() => {
    setActiveNodeId(validSelectedId);
    setCameraNodeId(validSelectedId);
  }, [validSelectedId]);

  const clusters = useMemo(() => buildClusters(nodes), [nodes]);
  const selectedNode = useMemo(() => nodes.find((node) => node.id === activeNodeId), [activeNodeId, nodes]);
  const cameraNode = useMemo(() => nodes.find((node) => node.id === cameraNodeId), [cameraNodeId, nodes]);
  const hoveredNode = useMemo(() => nodes.find((node) => node.id === hoveredNodeId), [hoveredNodeId, nodes]);
  const featuredNode = hoveredNode || selectedNode || nodes[0];
  const replayNodeIds = useMemo(() => (replayActive ? new Set(replayPath.nodeIds) : new Set<string>()), [replayActive, replayPath]);
  const averageIntensity = nodes.length
    ? nodes.reduce((total, node) => total + node.emotionalIntensity, 0) / nodes.length
    : 0;
  const focusNodeId = selectedNode?.id || nodes[0]?.id || 'quiet-reset';
  const selectedCluster = selectedNode ? clusterLabelForNode(selectedNode) : hoveredNode ? clusterLabelForNode(hoveredNode) : 'Whole constellation';

  const openMemory = useCallback(
    (nodeId: string) => {
      setActiveNodeId(nodeId);
      setCameraNodeId(nodeId);
      onSelectNode(nodeId);

      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('urai-lifemap-selected-memory-id', nodeId);
      }

      router.push(focusUrlForNode(nodeId));
    },
    [onSelectNode, router],
  );

  const startReplay = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('urai-replay-return-manifest-id', replayPath.id);
    }
    onStartReplay();
    router.push(`/replay?manifestId=${encodeURIComponent(replayPath.id)}`);
  }, [onStartReplay, replayPath.id, router]);

  const closeSelected = useCallback(() => {
    setActiveNodeId(undefined);
    setCameraNodeId(undefined);
    onCloseNode();
    router.push('/life-map');
  }, [onCloseNode, router]);

  const resetView = useCallback(() => {
    setCameraNodeId(undefined);
    setHoveredNodeId(undefined);
    setResetNonce((value) => value + 1);
  }, []);

  const moveSelection = useCallback(
    (direction: 1 | -1) => {
      if (!nodes.length) return;
      const currentIndex = Math.max(0, nodes.findIndex((node) => node.id === (activeNodeId || hoveredNodeId || nodes[0]?.id)));
      const nextIndex = (currentIndex + direction + nodes.length) % nodes.length;
      const nextNode = nodes[nextIndex];
      setActiveNodeId(nextNode.id);
      setCameraNodeId(nextNode.id);
      onSelectNode(nextNode.id);
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
        if (event.key.toLowerCase() === 'r') resetView();
      }}
    >
      <div className={styles.background} aria-hidden="true" />
      <div className={styles.nebula} data-testid="urai-v1-lifemap-nebula" aria-hidden="true" />
      <div className={styles.canvasShell}>
        <LifeMapCanvasBoundary fallback={<LifeMapFallback nodes={nodes} onOpen={openMemory} />}>
          <Canvas
            className={styles.canvas}
            camera={{ position: DEFAULT_CAMERA.toArray(), fov: 52, near: 0.1, far: 900 }}
            dpr={[1, 1.85]}
            gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
            onPointerMissed={() => setHoveredNodeId(undefined)}
          >
            <Suspense fallback={null}>
              <LifeMapUniverse
                nodes={nodes}
                edges={edges}
                clusters={clusters}
                selectedNode={cameraNode}
                hoveredNodeId={hoveredNodeId}
                replayNodeIds={replayNodeIds}
                resetNonce={resetNonce}
                reducedMotion={reducedMotion}
                onHover={setHoveredNodeId}
                onOpen={openMemory}
              />
            </Suspense>
          </Canvas>
        </LifeMapCanvasBoundary>
      </div>

      <header className={styles.heroPanel}>
        <p className={styles.eyebrow}>URAI Spatial · Life Map</p>
        <h1>Life Map</h1>
        <p>Your emotional universe — alive, explorable, and wired into Focus.</p>
      </header>

      <aside className={styles.hudPanel} data-testid="urai-v1-time-lens" aria-label="Life Map controls">
        <div>
          <span>Selected zone</span>
          <strong>{selectedCluster}</strong>
        </div>
        <div>
          <span>Memories</span>
          <strong>{nodes.length}</strong>
        </div>
        <div>
          <span>Emotional weather</span>
          <strong>{Math.round(averageIntensity * 100)}% active</strong>
        </div>
        <p>Drag to orbit · pinch or wheel to zoom · arrow keys to step stars · click any star to open Focus.</p>
        <div className={styles.controlRow}>
          <button type="button" onClick={resetView}>Reset view</button>
          <Link href={focusUrlForNode(focusNodeId)}>Open Focus</Link>
        </div>
      </aside>

      <nav className={styles.ctaRail} aria-label="URAI spatial routes">
        <Link href={focusUrlForNode(focusNodeId)}>Focus</Link>
        <Link href={`/replay?manifestId=${encodeURIComponent(replayPath.id)}`}>Replay</Link>
        <Link href="/mirror" onClick={onOpenMirror}>Mirror</Link>
        <Link href="/passport">Passport</Link>
        <Link href="/status">Status</Link>
      </nav>

      <section className={styles.legend} aria-label="Emotional color legend">
        {clusters.slice(0, 6).map((cluster) => (
          <span key={cluster.key} style={{ '--legend-color': cluster.color } as CSSProperties}>
            {cluster.label}
          </span>
        ))}
      </section>

      {featuredNode ? (
        <aside className={styles.previewPanel} aria-live="polite">
          <span className={styles.previewGlyph}>{featuredNode.glyph}</span>
          <div>
            <p className={styles.eyebrow}>{clusterLabelForNode(featuredNode)}</p>
            <h2>{featuredNode.title}</h2>
            <p>{featuredNode.subtitle}</p>
            <small>{featuredNode.narratorLine}</small>
          </div>
          <button type="button" onClick={() => openMemory(featuredNode.id)}>Open this memory</button>
        </aside>
      ) : null}

      {selectedNode ? (
        <aside className={styles.memoryDock} aria-label="Selected memory focus panel">
          <MemoryScroll node={selectedNode} onClose={closeSelected} onReplay={startReplay} />
          <WhyThisDrawer node={selectedNode} />
        </aside>
      ) : null}

      <div className={styles.bottomSafeBar}>
        <button
          type="button"
          onClick={() => {
            onReturnHome();
            router.push('/');
          }}
        >
          Return home
        </button>
        <button type="button" onClick={startReplay}>Start replay path</button>
      </div>
    </section>
  );
}
