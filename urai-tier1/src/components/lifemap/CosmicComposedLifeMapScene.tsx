"use client";

import { Stars } from "@react-three/drei";
import { Canvas, type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useAdaptiveSpatialQuality } from "@/spatial/performance/useAdaptiveSpatialQuality";
import { useLifeMapEvents, type LifeMapSourceMode } from "./useLifeMapEvents";
import type { LifeMapNode } from "./lifeMapData";
import { artifactFamilyLabel, resolveArtifactFamily } from "./lifeMapVisualSystem";
import { LIFE_MAP_SELECTION_EVENT, readLifeMapSelection } from "./lifeMapSelection";

// V268 literal-pixel repair: the Life Map is an asymmetric personal galaxy.
// Memory destinations render as stellar coronas and pointlike photospheres, not
// visible sphere meshes, bubbles, graph nodes, or a diagonal chain of balls.
const DEFAULT_MANIFEST_ID = "replay-recovery-thread";
const PHASE_MS = { departure: 620, travel: 980, approach: 880 } as const;
type Phase = "overview" | "departure" | "travel" | "approach" | "arrival";
type WebGLState = "ready" | "lost" | "recovering" | "failed";
type Point3 = [number, number, number];
type Goal = { position: Point3; target: Point3; fov: number };

function token(value: string | null, fallback = "") { return (value || fallback).replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 120); }
function hash(value: string) { let h = 2166136261; for (let i = 0; i < value.length; i += 1) { h ^= value.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function seeded(index: number, salt: number) { const v = Math.sin(index * 91.317 + salt * 13.77) * 43758.5453; return v - Math.floor(v); }

function cosmicPoint(node: LifeMapNode, index: number): Point3 {
  const seed = hash(`${node.id}:${node.eraId || "era"}:${node.clusterId || node.type}:${index}`);
  const u = seeded(seed, 2.17);
  const v = seeded(seed, 4.81);
  const w = seeded(seed, 8.33);
  const arm = seed % 4;
  const radius = 6.6 + Math.pow(u, .72) * 17.5;
  const angle = arm * Math.PI * .5 + v * 1.54 + radius * .072 + (index % 3) * .19;
  const originalBiasX = THREE.MathUtils.clamp(node.position[0], -8, 8) * .23;
  const originalBiasY = THREE.MathUtils.clamp(node.position[1], -5, 5) * .19;
  const x = Math.cos(angle) * radius * (1.08 + .13 * Math.sin(angle * 1.7)) + originalBiasX + (w - .5) * 2.2;
  const y = (seeded(seed, 11.7) - .5) * (5.2 + radius * .17) + Math.sin(angle * 2.13) * 1.2 + originalBiasY;
  const z = -17.5 - Math.pow(seeded(seed, 14.9), .78) * 42 - radius * .18 + Math.sin(angle * 1.43) * 2.8;
  return [x, y, z];
}

function truthLabel(mode: LifeMapSourceMode) {
  if (mode === "explicit-demo") return "Disclosed sample · not your memories";
  if (mode === "signed-out") return "Signed out";
  if (mode === "empty") return "Ready for a first memory";
  if (mode === "unavailable") return "Memory service resting safely";
  if (mode === "error") return "Memory data unavailable";
  return "Private universe";
}
function phaseLabel(phase: Phase) { if (phase === "overview") return "Explore"; if (phase === "departure") return "Leaving overview"; if (phase === "travel") return "Crossing memory space"; if (phase === "approach") return "Approaching memory"; return "Memory selected"; }
function isSoftwareRenderer(gl: THREE.WebGLRenderer) { const context = gl.getContext(); const debug = context.getExtension("WEBGL_debug_renderer_info") as { UNMASKED_RENDERER_WEBGL?: number } | null; const value = debug?.UNMASKED_RENDERER_WEBGL ? context.getParameter(debug.UNMASKED_RENDERER_WEBGL) : context.getParameter(context.RENDERER); return /swiftshader|llvmpipe|lavapipe|software/i.test(String(value || "")); }

function makeDiscTexture(power: number, rays = false) {
  const size = 64, data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
    const dx = ((x + .5) / size - .5) * 2, dy = ((y + .5) / size - .5) * 2;
    const d = Math.hypot(dx, dy);
    const radial = Math.max(0, 1 - d);
    const ray = rays ? Math.max(0, 1 - Math.min(Math.abs(dx), Math.abs(dy)) * 19) * Math.max(0, 1 - d * .92) : 0;
    const alpha = Math.min(1, Math.pow(radial, power) + ray * .12);
    const i = (y * size + x) * 4;
    data[i] = data[i + 1] = data[i + 2] = 255;
    data[i + 3] = Math.round(alpha * 255);
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function WebGLRecovery({ onState }: { onState: (state: WebGLState) => void }) {
  const { gl } = useThree();
  useEffect(() => { const canvas = gl.domElement; let timer: number | null = null; const lost = (event: Event) => { event.preventDefault(); onState("lost"); if (timer) clearTimeout(timer); timer = window.setTimeout(() => onState("recovering"), 220); }; const restored = () => { if (timer) clearTimeout(timer); timer = null; onState("ready"); }; canvas.addEventListener("webglcontextlost", lost, false); canvas.addEventListener("webglcontextrestored", restored, false); onState("ready"); return () => { if (timer) clearTimeout(timer); canvas.removeEventListener("webglcontextlost", lost, false); canvas.removeEventListener("webglcontextrestored", restored, false); }; }, [gl, onState]);
  return null;
}
function RenderProof() {
  const { gl, scene } = useThree();
  const publish = useCallback(() => { const root = gl.domElement.closest<HTMLElement>('[data-testid="urai-true-3d-life-map"]'); if (!root) return; let objects = 0, anchors = 0; scene.traverse((object) => { if (!object.visible) return; objects += 1; if (object.name.startsWith("life-map-")) anchors += 1; }); const ready = gl.info.render.calls > 0 && objects > 20 && anchors >= 8; root.dataset.lifeMapRenderReady = ready ? "true" : "false"; root.dataset.lifeMapVisibleObjects = String(objects); root.dataset.lifeMapVisibleAnchors = String(anchors); root.dataset.lifeMapRenderCalls = String(gl.info.render.calls); root.dataset.lifeMapRenderTriangles = String(gl.info.render.triangles); }, [gl, scene]);
  useFrame((state) => { if (state.clock.elapsedTime < 1.2 || Math.round(state.clock.elapsedTime * 10) % 10 === 0) publish(); }); return null;
}

function StellarDepthField({ count, reducedMotion, salt, size, opacity, depthSpan }: { count: number; reducedMotion: boolean; salt: number; size: number; opacity: number; depthSpan: number }) {
  const root = useRef<THREE.Points>(null);
  const disc = useMemo(() => makeDiscTexture(2.2), []);
  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3), colors = new Float32Array(count * 3);
    const cool = new THREE.Color("#cce6ff"), neutral = new THREE.Color("#fff4dc"), warm = new THREE.Color("#ffc98d"), blue = new THREE.Color("#81baff");
    for (let i = 0; i < count; i += 1) {
      const radius = 3.8 + Math.pow(seeded(i, 2 + salt), .60) * 49;
      const arm = i % 5;
      const angle = arm * Math.PI * .4 + seeded(i, 3 + salt) * 1.72 + radius * .066;
      const jitter = (seeded(i, 4 + salt) - .5) * (2.4 + radius * .08);
      const x = Math.cos(angle) * radius * 1.18 + Math.cos(angle + Math.PI / 2) * jitter;
      const y = (seeded(i, 5 + salt) - .5) * (4.8 + radius * .18) + Math.sin(angle * 2.4) * 1.15;
      const z = -10 - Math.pow(seeded(i, 7 + salt), .76) * depthSpan + Math.sin(angle) * radius * .13;
      positions.set([x, y, z], i * 3);
      const base = i % 23 === 0 ? warm : i % 13 === 0 ? blue : i % 7 === 0 ? neutral : cool;
      const color = base.clone().multiplyScalar(.48 + seeded(i, 9 + salt) * .52);
      colors.set([color.r, color.g, color.b], i * 3);
    }
    const result = new THREE.BufferGeometry();
    result.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    result.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return result;
  }, [count, depthSpan, salt]);
  useEffect(() => () => { geometry.dispose(); disc.dispose(); }, [disc, geometry]);
  useFrame(({ clock }) => { if (root.current && !reducedMotion) { root.current.rotation.z = Math.sin(clock.elapsedTime * .011 + salt) * .005; root.current.position.x = Math.sin(clock.elapsedTime * .017 + salt) * .045; } });
  return <points ref={root} name={`life-map-deep-stellar-field-${salt}`} geometry={geometry}><pointsMaterial map={disc} alphaTest={.012} vertexColors size={size} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation /></points>;
}

const NEBULA_VERTEX = `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const NEBULA_FRAGMENT = `uniform vec3 colorA;uniform vec3 colorB;uniform float seed;uniform float opacity;varying vec2 vUv;float hash21(vec2 p){p=fract(p*vec2(123.34,345.45));p+=dot(p,p+34.345);return fract(p.x*p.y);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x),mix(hash21(i+vec2(0,1)),hash21(i+vec2(1)),f.x),f.y);}float fbm(vec2 p){float n=0.,a=.5;for(int i=0;i<5;i++){n+=noise(p)*a;p=p*2.03+vec2(7.1,3.7);a*=.5;}return n;}void main(){vec2 p=(vUv-.5)*2.;float radial=smoothstep(1.12,.03,length(p*vec2(.70,1.05)));float cloud=fbm(p*1.48+seed)+.68*fbm(p*3.25-seed)+.24*fbm(p*7.2+seed*.7);float filaments=smoothstep(.24,1.08,cloud);float a=radial*filaments*opacity;vec3 c=mix(colorA,colorB,smoothstep(.20,.96,cloud));gl_FragColor=vec4(c,a);}`;
function NebulaVeil({ position, scale, rotation = 0, colors, opacity = .18, seed = 1 }: { position: Point3; scale: [number, number]; rotation?: number; colors: [string, string]; opacity?: number; seed?: number }) { const uniforms = useMemo(() => ({ colorA: { value: new THREE.Color(colors[0]) }, colorB: { value: new THREE.Color(colors[1]) }, seed: { value: seed }, opacity: { value: opacity } }), [colors, opacity, seed]); return <mesh name={`life-map-nebula-veil-${seed}`} position={position} rotation={[0, 0, rotation]} scale={[scale[0], scale[1], 1]} renderOrder={-2}><planeGeometry args={[1, 1]} /><shaderMaterial vertexShader={NEBULA_VERTEX} fragmentShader={NEBULA_FRAGMENT} uniforms={uniforms} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></mesh>; }
function SelectedTravelWeather({ node, index, phase }: { node: LifeMapNode; index: number; phase: Phase }) {
  if (phase === "overview") return null;
  const point = cosmicPoint(node, index);
  const strength = phase === "departure" ? .44 : phase === "travel" ? .52 : phase === "approach" ? .42 : .38;
  return <group name="life-map-selected-travel-weather"><NebulaVeil position={[point[0] - 6.6, point[1] + 3.4, point[2] - 8]} scale={[35, 21]} rotation={-.23} colors={["#123b54", "#50375c"]} opacity={strength} seed={3.11} /><NebulaVeil position={[point[0] + 7.8, point[1] - 4.1, point[2] - 12]} scale={[32, 19]} rotation={.18} colors={["#173653", "#27566a"]} opacity={strength * .88} seed={4.37} /><NebulaVeil position={[point[0] - 1.6, point[1] + .6, point[2] - 19]} scale={[50, 27]} rotation={-.07} colors={["#0a2742", "#49385b"]} opacity={strength * .80} seed={5.73} /></group>;
}
function SelectedMemoryDust({ node, index }: { node: LifeMapNode; index: number }) {
  const disc = useMemo(() => makeDiscTexture(2.6), []);
  const geometry = useMemo(() => { const count = 320, positions = new Float32Array(count * 3), colors = new Float32Array(count * 3), point = cosmicPoint(node, index), aura = new THREE.Color(node.aura), cool = new THREE.Color("#d8ecff"), warm = new THREE.Color("#ffe0ae"), pearl = new THREE.Color("#fffaf0"); for (let i = 0; i < count; i += 1) { const local = i + hash(node.id), a = seeded(local, 10) * Math.PI * 2, r = .82 + Math.pow(seeded(local, 11), .54) * 14.8, depth = (seeded(local, 13) - .5) * 16.4, lift = (seeded(local, 12) - .5) * (3.2 + r * .72) + Math.sin(a * 2.7) * .8; positions.set([point[0] + Math.cos(a) * r, point[1] + lift, point[2] + Math.sin(a) * r * .66 + depth], i * 3); const temperature = i % 13 === 0 ? warm : i % 7 === 0 ? pearl : cool, color = aura.clone().lerp(temperature, .48 + seeded(local, 14) * .30).multiplyScalar(.52 + seeded(local, 15) * .48); colors.set([color.r, color.g, color.b], i * 3); } const result = new THREE.BufferGeometry(); result.setAttribute("position", new THREE.BufferAttribute(positions, 3)); result.setAttribute("color", new THREE.BufferAttribute(colors, 3)); return result; }, [index, node]);
  useEffect(() => () => { geometry.dispose(); disc.dispose(); }, [disc, geometry]);
  return <points name="life-map-selected-memory-dust" geometry={geometry}><pointsMaterial map={disc} alphaTest={.012} vertexColors size={.12} transparent opacity={.50} depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation /></points>;
}
function Constellations() { return <group name="life-map-constellations" visible={false} userData={{ retiredVisualRole: "v260-no-explicit-graph-edges" }} />; }

function MemoryStar({ node, index, active, related, onSelect }: { node: LifeMapNode; index: number; active: boolean; related: boolean; onSelect: (node: LifeMapNode) => void }) {
  const point = useMemo(() => cosmicPoint(node, index), [index, node]);
  const halo = useMemo(() => makeDiscTexture(2.2), []);
  const photosphere = useMemo(() => makeDiscTexture(5.4, true), []);
  const core = useMemo(() => new THREE.Color(node.aura).lerp(new THREE.Color("#fff3d6"), .30), [node.aura]);
  useEffect(() => () => { halo.dispose(); photosphere.dispose(); }, [halo, photosphere]);
  const pointer = (event: ThreeEvent<PointerEvent>, value: boolean) => { event.stopPropagation(); document.body.style.cursor = value ? "pointer" : ""; };
  const outer = active ? 1.06 : related ? .56 : .34;
  const mid = active ? .50 : related ? .27 : .18;
  const hot = active ? .19 : related ? .13 : .095;
  return <group name={`life-map-memory-star-${node.id}`} position={point} userData={{ semanticType: node.type, visualAuthority: "stellar-memory-not-node-graph", stellarMorphology: "point-photosphere-layered-corona-no-visible-sphere" }} onClick={(event) => { event.stopPropagation(); onSelect(node); }} onPointerOver={(event) => pointer(event, true)} onPointerOut={(event) => pointer(event, false)}>
    <sprite scale={[outer * 1.24, outer, 1]}><spriteMaterial map={halo} color={node.aura} transparent opacity={active ? .19 : related ? .10 : .055} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></sprite>
    <sprite scale={[mid * 1.10, mid, 1]}><spriteMaterial map={halo} color={core} transparent opacity={active ? .48 : related ? .28 : .20} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></sprite>
    <sprite scale={[hot, hot, 1]}><spriteMaterial map={photosphere} color="#fff8e9" transparent opacity={active ? .94 : related ? .82 : .72} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></sprite>
    <pointLight color={node.aura} intensity={active ? .24 : related ? .07 : .018} distance={active ? 3.4 : 1.8} decay={2} />
    <mesh scale={active ? 1.15 : .92}><sphereGeometry args={[.30, 8, 6]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh>
  </group>;
}

function CameraRig({ selected, selectedIndex, phase, reducedMotion }: { selected: LifeMapNode | null; selectedIndex: number; phase: Phase; reducedMotion: boolean }) { const { camera, pointer, size } = useThree(), look = useRef(new THREE.Vector3()), initialized = useRef(false); const goal = useCallback((): Goal => { const portrait = size.height > size.width; const overview = new THREE.Vector3(0, portrait ? 1.2 : 2.7, portrait ? 29 : 25.5), targetOverview = new THREE.Vector3(0, .15, -17); if (!selected || phase === "overview") return { position: overview.toArray() as Point3, target: targetOverview.toArray() as Point3, fov: portrait ? 57 : 52 }; const target = new THREE.Vector3(...cosmicPoint(selected, selectedIndex)), dir = overview.clone().sub(target).normalize(), side = new THREE.Vector3(dir.z, 0, -dir.x).normalize(), sign = Math.sign(target.x) || 1; const distance = phase === "departure" ? 21 : phase === "travel" ? 16.5 : phase === "approach" ? 12.5 : portrait ? 10.5 : 8.8; const position = target.clone().addScaledVector(dir, distance).addScaledVector(side, phase === "travel" ? sign * 3.4 : phase === "approach" ? sign * 1.1 : 0); position.y += phase === "travel" ? 2.2 : phase === "approach" ? .8 : .25; return { position: position.toArray() as Point3, target: target.toArray() as Point3, fov: portrait ? 56 : phase === "arrival" ? 44 : 49 }; }, [phase, selected, selectedIndex, size.height, size.width]); useLayoutEffect(() => { if (initialized.current) return; const next = goal(); camera.position.set(...next.position); look.current.set(...next.target); camera.lookAt(look.current); if (camera instanceof THREE.PerspectiveCamera) { camera.fov = next.fov; camera.updateProjectionMatrix(); } initialized.current = true; }, [camera, goal]); useFrame((_, delta) => { const next = goal(), position = new THREE.Vector3(...next.position), target = new THREE.Vector3(...next.target); if (!selected && phase === "overview" && !reducedMotion) { position.x += pointer.x * 1.1; position.y += pointer.y * .45; target.x += pointer.x * .58; target.y += pointer.y * .22; } if (reducedMotion) { camera.position.copy(position); look.current.copy(target); } else { const rate = phase === "overview" ? 2.2 : phase === "arrival" ? 4.4 : 2.65; camera.position.lerp(position, 1 - Math.exp(-rate * delta)); look.current.lerp(target, 1 - Math.exp(-4.2 * delta)); } camera.lookAt(look.current); if (camera instanceof THREE.PerspectiveCamera) { camera.fov = reducedMotion ? next.fov : THREE.MathUtils.damp(camera.fov, next.fov, 4, delta); camera.updateProjectionMatrix(); } }); return null; }

function CosmicWorld({ nodes, selected, selectedIndex, phase, reducedMotion, tier, onSelect, onWebGLState }: { nodes: LifeMapNode[]; selected: LifeMapNode | null; selectedIndex: number; phase: Phase; reducedMotion: boolean; tier: "low" | "medium" | "high"; onSelect: (node: LifeMapNode) => void; onWebGLState: (state: WebGLState) => void }) {
  const starCount = tier === "low" ? 650 : tier === "medium" ? 1100 : 1700;
  const selectedPoint = selected ? cosmicPoint(selected, selectedIndex) : null;
  const selectedLocalCount = tier === "low" ? 110 : tier === "medium" ? 160 : 220;
  return <><color attach="background" args={["#020611"]} /><fog attach="fog" args={["#020611", 78, 178]} /><ambientLight intensity={.045} color="#d9edff" /><RenderProof /><WebGLRecovery onState={onWebGLState} /><CameraRig selected={selected} selectedIndex={selectedIndex} phase={phase} reducedMotion={reducedMotion} /><group name="life-map-deep-space"><Stars radius={132} depth={105} count={starCount} factor={1.45} saturation={.38} fade speed={0} /><StellarDepthField count={Math.round(starCount * .64)} reducedMotion={reducedMotion} salt={.37} size={.14} opacity={.92} depthSpan={106} /><StellarDepthField count={Math.max(1, starCount - Math.round(starCount * .64))} reducedMotion={reducedMotion} salt={7.19} size={.095} opacity={.72} depthSpan={62} /><group name="life-map-emotional-weather"><NebulaVeil position={[-12, 5, -20]} scale={[55, 30]} rotation={-.21} colors={["#163a55", "#503a58"]} opacity={.64} seed={.09} /><NebulaVeil position={[13, -6, -29]} scale={[58, 33]} rotation={.16} colors={["#0e3b50", "#303f66"]} opacity={.58} seed={.51} /><NebulaVeil position={[-2, 0, -39]} scale={[98, 44]} rotation={-.10} colors={["#102844", "#433254"]} opacity={.62} seed={.19} /><NebulaVeil position={[4, 3, -83]} scale={[134, 76]} rotation={-.04} colors={["#081a35", "#2e2149"]} opacity={.50} seed={.31} /><NebulaVeil position={[-25, 10, -49]} scale={[74, 35]} rotation={-.17} colors={["#0c3453", "#33416e"]} opacity={.44} seed={.73} /><NebulaVeil position={[28, -10, -58]} scale={[82, 38]} rotation={.20} colors={["#0a364e", "#403f68"]} opacity={.40} seed={2.17} /></group></group><Constellations /><group name="life-map-memory-stars">{nodes.map((node, index) => { const active = selected?.id === node.id, related = Boolean(selected && (selected.connectedTo.includes(node.id) || node.connectedTo.includes(selected.id))); return <MemoryStar key={node.id} node={node} index={index} active={active} related={related} onSelect={onSelect} />; })}</group>{selectedPoint ? <group name="life-map-selected-local-depth" position={selectedPoint} scale={[.42, .42, .42]}><StellarDepthField count={selectedLocalCount} reducedMotion={reducedMotion} salt={12.31} size={.16} opacity={.78} depthSpan={58} /></group> : null}{selected ? <SelectedTravelWeather node={selected} index={selectedIndex} phase={phase} /> : null}{selected ? <SelectedMemoryDust node={selected} index={selectedIndex} /> : null}</>;
}

export default function ComposedLifeMapScene() {
  const router = useRouter(), params = useSearchParams(), profile = useAdaptiveSpatialQuality(); const explicitDemo = params.get("demo") === "1", overviewRequested = params.get("overview") === "1"; const { nodes, loading, sourceMode } = useLifeMapEvents(explicitDemo ? "demo-user" : undefined); const queryNode = token(params.get("node") || params.get("memoryId")), manifestId = token(params.get("manifestId"), DEFAULT_MANIFEST_ID); const [selectedId, setSelectedId] = useState<string | null>(overviewRequested ? null : queryNode || null), [phase, setPhase] = useState<Phase>(() => !overviewRequested && queryNode ? "arrival" : "overview"), [webglState, setWebglState] = useState<WebGLState>("ready"), [software, setSoftware] = useState<boolean | null>(null); const journey = useRef(0), selected = useMemo(() => nodes.find((node) => node.id === selectedId) || null, [nodes, selectedId]), selectedIndex = Math.max(0, nodes.findIndex((node) => node.id === selected?.id)); const withIdentity = useCallback((next: URLSearchParams) => { if (explicitDemo) next.set("demo", "1"); if (manifestId) next.set("manifestId", manifestId); return next; }, [explicitDemo, manifestId]);
  useEffect(() => { if (!selected || phase === "overview" || phase === "arrival") return; if (profile.reducedMotion) { journey.current += 1; setPhase("arrival"); return; } const key = journey.current, timer = window.setTimeout(() => { if (key !== journey.current) return; if (phase === "departure") setPhase("travel"); else if (phase === "travel") setPhase("approach"); else if (phase === "approach") setPhase("arrival"); }, PHASE_MS[phase]); return () => clearTimeout(timer); }, [phase, profile.reducedMotion, selected]);
  const selectNode = useCallback((node: LifeMapNode) => { journey.current += 1; setSelectedId(node.id); setPhase(profile.reducedMotion ? "arrival" : "departure"); const next = withIdentity(new URLSearchParams()); next.set("memoryId", node.id); next.set("node", node.id); if (node.eraId) next.set("era", node.eraId); router.replace(`/life-map?${next.toString()}`, { scroll: false }); }, [profile.reducedMotion, router, withIdentity]);
  useEffect(() => { const handler = (event: Event) => { const detail = readLifeMapSelection(event); if (!detail) return; const node = nodes.find((candidate) => candidate.id === detail.nodeId); if (node) selectNode(node); }; window.addEventListener(LIFE_MAP_SELECTION_EVENT, handler); return () => window.removeEventListener(LIFE_MAP_SELECTION_EVENT, handler); }, [nodes, selectNode]);
  const overview = useCallback(() => { const retained = selectedId || queryNode; journey.current += 1; setSelectedId(null); setPhase("overview"); const next = withIdentity(new URLSearchParams()); if (retained) { next.set("memoryId", retained); next.set("node", retained); } next.set("overview", "1"); router.replace(`/life-map?${next.toString()}`, { scroll: false }); }, [queryNode, router, selectedId, withIdentity]);
  const destinationHref = useCallback((route: "focus" | "replay") => { if (!selected) return "/life-map"; const next = withIdentity(new URLSearchParams()); next.set("memoryId", selected.id); next.set("node", selected.id); next.set("returnNode", selected.id); next.set("artifactFamily", resolveArtifactFamily(selected)); next.set("from", "life-map"); return `/${route}?${next.toString()}`; }, [selected, withIdentity]);
  useEffect(() => { if (!overviewRequested) return; journey.current += 1; setSelectedId(null); setPhase("overview"); }, [overviewRequested]); useEffect(() => { if (overviewRequested || !queryNode || !nodes.length) return; const node = nodes.find((candidate) => candidate.id === queryNode); if (!node || selectedId === node.id) return; journey.current += 1; setSelectedId(node.id); setPhase("arrival"); }, [nodes, overviewRequested, queryNode, selectedId]); useEffect(() => { const handler = (event: KeyboardEvent) => { if (event.defaultPrevented || event.key !== "Escape" || (event.target instanceof HTMLElement && event.target.matches("input,textarea,select,[role='textbox']"))) return; event.preventDefault(); if (selectedId) overview(); else router.push("/home"); }; window.addEventListener("keydown", handler, true); return () => window.removeEventListener("keydown", handler, true); }, [overview, router, selectedId]); useEffect(() => () => { document.body.style.cursor = ""; }, []);
  const recovery = webglState !== "ready", showThresholds = Boolean(selected && phase === "arrival");
  return <main className="life-map-root" data-testid="urai-true-3d-life-map" data-spatial-visible="true" data-life-map-source={sourceMode} data-life-map-phase={phase} data-life-map-mode={selected ? "selected" : "overview"} data-life-map-scale={selected ? phase === "arrival" ? "intimate" : "regional" : "cosmic"} data-life-map-production-world="true" data-life-map-visual-authority="v260-deep-stellar-personal-universe" data-life-map-art-revision="v268-asymmetric-stellar-memory-coronas" data-life-map-ground="none" data-life-map-render-ready="false" data-life-map-visible-anchors="0" data-life-map-visible-objects="0" data-life-map-render-calls="0" data-webgl-state={webglState} data-software-renderer={software === null ? "detecting" : software ? "true" : "false"} data-home-companion-owned="false"><h1 className="sr-only">URAI Life Map private universe</h1><Canvas camera={{ position: [0, 2.4, 27], fov: 54, near: .06, far: 190 }} dpr={[1, profile.pixelRatioMax]} frameloop={profile.documentVisible ? "always" : "never"} gl={{ antialias: profile.antialias, powerPreference: "high-performance", alpha: false }} onCreated={({ gl }) => { setSoftware(isSoftwareRenderer(gl)); gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.08; gl.outputColorSpace = THREE.SRGBColorSpace; gl.setClearColor("#020611", 1); }}><CosmicWorld nodes={nodes} selected={selected} selectedIndex={selectedIndex} phase={phase} reducedMotion={profile.reducedMotion} tier={profile.tier} onSelect={selectNode} onWebGLState={setWebglState} /></Canvas><header className="life-map-title"><span>URAI · LIFE MAP</span><strong>{selected ? selected.locked ? "Protected memory" : selected.title : "Your universe"}</strong><em>{truthLabel(sourceMode)}</em></header><div className="life-map-status" role="status" aria-live="polite"><span>{loading ? "Opening" : phaseLabel(phase)}</span><small>{selected ? `${artifactFamilyLabel(selected)} · ${selected.dateLabel}` : "Memories in space"}</small></div>{showThresholds ? <nav className="life-map-thresholds" aria-label="Selected memory actions" data-family={resolveArtifactFamily(selected!)}><button className="focus-threshold" onClick={() => router.push(destinationHref("focus"))}><strong>Enter Focus</strong></button><button className="replay-threshold" disabled={!selected!.replayAvailable || selected!.locked} onClick={() => router.push(destinationHref("replay"))}><strong>Replay</strong></button><button className="overview-return" onClick={overview}>Overview</button></nav> : null}{recovery ? <section className="life-map-recovery" role="status" aria-live="assertive"><h2>{webglState === "lost" ? "Visual field paused safely" : "Restoring visual field"}</h2><p>Your selected memory, privacy state, and return position remain preserved.</p><button onClick={overview}>Open semantic overview</button><button onClick={() => router.push("/home")}>Return Home</button></section> : null}<style jsx>{`.life-map-root{position:fixed;inset:0;z-index:100;overflow:hidden;background:#020611;color:#f8fbff;font-family:Inter,system-ui;isolation:isolate;width:100vw;height:100svh}.life-map-root:after{content:"";position:absolute;inset:0;z-index:2;pointer-events:none;background:radial-gradient(ellipse at 27% 43%,rgba(38,84,116,.10),transparent 29%),radial-gradient(ellipse at 76% 37%,rgba(88,59,105,.08),transparent 28%),radial-gradient(circle at 50% 48%,transparent 0 60%,rgba(0,0,0,.08) 82%,rgba(0,0,0,.36) 100%)}.life-map-root :global(canvas){position:absolute!important;inset:0;width:100%!important;height:100%!important}.sr-only{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0,0,0,0)}.life-map-title{position:absolute;z-index:12;top:max(18px,env(safe-area-inset-top));left:max(20px,env(safe-area-inset-left));display:grid;gap:3px;pointer-events:none;text-shadow:0 8px 30px #000}.life-map-title span,.life-map-title em{font:750 9px/1.2 Inter;letter-spacing:.19em;text-transform:uppercase;color:rgba(220,241,255,.68);font-style:normal}.life-map-title strong{font:650 clamp(18px,2.6vw,30px)/1 Inter;letter-spacing:-.035em;max-width:16ch}.life-map-status{position:absolute;z-index:12;right:max(18px,env(safe-area-inset-right));top:max(18px,env(safe-area-inset-top));display:grid;justify-items:end;gap:3px;text-shadow:0 6px 20px #000;pointer-events:none}.life-map-status span{font:750 9px/1 Inter;letter-spacing:.15em;text-transform:uppercase;color:rgba(236,248,255,.78)}.life-map-status small{font-size:9px;color:rgba(220,240,251,.48)}.life-map-thresholds{position:absolute!important;z-index:16;left:50%!important;right:auto!important;top:auto!important;bottom:max(18px,calc(env(safe-area-inset-bottom) + 10px))!important;transform:translateX(-50%)!important;display:flex!important;flex-direction:row!important;grid-template-columns:none!important;gap:8px;align-items:center;width:auto!important}.life-map-thresholds button,.life-map-recovery button{min-height:46px;border:1px solid rgba(220,248,255,.18);border-radius:999px;background:rgba(2,8,18,.58);color:#f8fbff;padding:0 18px;font-weight:800;cursor:pointer;backdrop-filter:blur(12px)}.life-map-thresholds .focus-threshold{border-color:rgba(190,236,255,.34)}.life-map-thresholds .replay-threshold{border-color:rgba(248,224,182,.28)}.life-map-thresholds .overview-return{min-height:40px;padding:0 14px;font-size:10px;color:rgba(240,248,255,.72)}.life-map-thresholds button:disabled{opacity:.32}.life-map-thresholds button:focus-visible,.life-map-recovery button:focus-visible{outline:3px solid #dff8ff;outline-offset:3px}.life-map-recovery{position:absolute;z-index:30;inset:0;display:grid;place-content:center;justify-items:center;gap:12px;padding:24px;text-align:center;background:rgba(1,3,10,.92)}@media(max-width:700px){.life-map-title{top:max(12px,env(safe-area-inset-top));left:12px}.life-map-title strong{font-size:20px}.life-map-title em{font-size:8px}.life-map-status{top:max(12px,env(safe-area-inset-top));right:12px}.life-map-status small{display:none}.life-map-thresholds{bottom:max(10px,env(safe-area-inset-bottom))!important;width:calc(100vw - 24px)!important;justify-content:center}.life-map-thresholds button{min-height:44px;padding:0 14px;flex:0 1 32%}.life-map-thresholds .overview-return{flex:0 0 auto}}@media(prefers-reduced-motion:reduce){.life-map-root *{transition:none!important;animation:none!important}.life-map-thresholds button,.life-map-recovery button{backdrop-filter:none}}@media(forced-colors:active){.life-map-thresholds button,.life-map-recovery button{border:2px solid CanvasText;background:Canvas;color:CanvasText}}`}</style></main>;
}
