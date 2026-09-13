"use client";

import { Line, Sparkles, Stars } from "@react-three/drei";
import { Canvas, type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useAdaptiveSpatialQuality } from "@/spatial/performance/useAdaptiveSpatialQuality";
import { useLifeMapEvents, type LifeMapSourceMode } from "./useLifeMapEvents";
import type { LifeMapNode } from "./lifeMapData";
import { artifactFamilyLabel, resolveArtifactFamily } from "./lifeMapVisualSystem";
import { LIFE_MAP_SELECTION_EVENT, readLifeMapSelection } from "./lifeMapSelection";

// V257 canon: Life Map is a navigable personal universe. It has no continuous
// terrain/floor/horizon owner. Memories are celestial until Focus/Replay.
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
  const seed = hash(node.eraId || node.clusterId || node.type);
  const angle = (seed % 6283) / 1000 + index * .31;
  const orbit = 1.2 + (seed % 5) * .34;
  return [
    node.position[0] * 1.72 + Math.cos(angle) * orbit,
    node.position[1] * 1.45 + Math.sin(angle * 1.37) * orbit * .72,
    -8.5 - (seed % 7) * 1.7 + node.position[2] * 1.65 - (index % 3) * .55,
  ];
}

function truthLabel(mode: LifeMapSourceMode) {
  if (mode === "explicit-demo") return "Disclosed sample universe · not your memories";
  if (mode === "signed-out") return "Signed out · no personal data displayed";
  if (mode === "empty") return "Private universe ready for its first memory";
  if (mode === "unavailable") return "Private memory service resting safely";
  if (mode === "error") return "Private memory data could not be opened";
  return "Private universe";
}

function phaseLabel(phase: Phase) {
  if (phase === "overview") return "Galaxy overview";
  if (phase === "departure") return "Leaving the constellation";
  if (phase === "travel") return "Crossing memory space";
  if (phase === "approach") return "Approaching the selected star";
  return "Selected memory in orbit";
}

function isSoftwareRenderer(gl: THREE.WebGLRenderer) {
  const context = gl.getContext();
  const debug = context.getExtension("WEBGL_debug_renderer_info") as { UNMASKED_RENDERER_WEBGL?: number } | null;
  const value = debug?.UNMASKED_RENDERER_WEBGL ? context.getParameter(debug.UNMASKED_RENDERER_WEBGL) : context.getParameter(context.RENDERER);
  return /swiftshader|llvmpipe|lavapipe|software/i.test(String(value || ""));
}

function WebGLRecovery({ onState }: { onState: (state: WebGLState) => void }) {
  const { gl } = useThree();
  useEffect(() => {
    const canvas = gl.domElement;
    let timer: number | null = null;
    const lost = (event: Event) => { event.preventDefault(); onState("lost"); if (timer) clearTimeout(timer); timer = window.setTimeout(() => onState("recovering"), 220); };
    const restored = () => { if (timer) clearTimeout(timer); timer = null; onState("ready"); };
    canvas.addEventListener("webglcontextlost", lost, false); canvas.addEventListener("webglcontextrestored", restored, false); onState("ready");
    return () => { if (timer) clearTimeout(timer); canvas.removeEventListener("webglcontextlost", lost, false); canvas.removeEventListener("webglcontextrestored", restored, false); };
  }, [gl, onState]);
  return null;
}

function RenderProof() {
  const { gl, scene } = useThree();
  const publish = useCallback(() => {
    const root = gl.domElement.closest<HTMLElement>('[data-testid="urai-true-3d-life-map"]');
    if (!root) return;
    let objects = 0, anchors = 0;
    scene.traverse((object) => { if (!object.visible) return; objects += 1; if (object.name.startsWith("life-map-")) anchors += 1; });
    const ready = gl.info.render.calls > 0 && objects > 20 && anchors >= 8;
    root.dataset.lifeMapRenderReady = ready ? "true" : "false";
    root.dataset.lifeMapVisibleObjects = String(objects);
    root.dataset.lifeMapVisibleAnchors = String(anchors);
    root.dataset.lifeMapRenderCalls = String(gl.info.render.calls);
    root.dataset.lifeMapRenderTriangles = String(gl.info.render.triangles);
  }, [gl, scene]);
  useFrame((state) => { if (state.clock.elapsedTime < 1.2 || Math.round(state.clock.elapsedTime * 10) % 10 === 0) publish(); });
  return null;
}

function GalaxyField({ count, reducedMotion }: { count: number; reducedMotion: boolean }) {
  const root = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3), colors = new Float32Array(count * 3);
    const cool = new THREE.Color("#9fdcff"), violet = new THREE.Color("#b89cff"), warm = new THREE.Color("#f6dfad");
    for (let i = 0; i < count; i += 1) {
      const t = (i + .5) / count, arm = i % 4, radius = 2.2 + Math.pow(t, .64) * 32, jitter = (seeded(i, 3) - .5) * (1 + radius * .08);
      const angle = arm * Math.PI / 2 + radius * .21 + jitter * .12;
      positions.set([Math.cos(angle) * (radius + jitter), Math.sin(angle) * (radius + jitter) * .32 + (seeded(i, 4) - .5) * 4, -23 - radius * .13 + (seeded(i, 5) - .5) * 8], i * 3);
      const color = cool.clone().lerp(violet, seeded(i, 7)).lerp(warm, Math.max(0, .25 - t) * 2.6); colors.set([color.r, color.g, color.b], i * 3);
    }
    const result = new THREE.BufferGeometry(); result.setAttribute("position", new THREE.BufferAttribute(positions, 3)); result.setAttribute("color", new THREE.BufferAttribute(colors, 3)); return result;
  }, [count]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame((_, delta) => { if (root.current && !reducedMotion) root.current.rotation.z += delta * .0018; });
  return <points ref={root} name="life-map-personal-galaxy" geometry={geometry}><pointsMaterial vertexColors size={.105} transparent opacity={.8} depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation /></points>;
}

function Nebula({ center, color, seed, count = 190, scale = [7,4,8] as Point3 }: { center: Point3; color: string; seed: number; count?: number; scale?: Point3 }) {
  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) { const a = seeded(i + seed, 10) * Math.PI * 2, r = Math.pow(seeded(i + seed, 11), .58), y = (seeded(i + seed, 12) - .5) * 2; positions.set([Math.cos(a) * r * scale[0], y * r * scale[1], Math.sin(a) * r * scale[2]], i * 3); }
    const result = new THREE.BufferGeometry(); result.setAttribute("position", new THREE.BufferAttribute(positions, 3)); return result;
  }, [count, scale, seed]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <points name={`life-map-nebula-${seed}`} position={center} geometry={geometry}><pointsMaterial color={color} size={.24} transparent opacity={.075} depthWrite={false} blending={THREE.AdditiveBlending} /></points>;
}

function Constellations({ nodes, selected }: { nodes: LifeMapNode[]; selected: LifeMapNode | null }) {
  const byId = useMemo(() => new Map(nodes.map((node, index) => [node.id, { node, index }])), [nodes]);
  const links = useMemo(() => { const seen = new Set<string>(), result: Array<[LifeMapNode,number,LifeMapNode,number]> = []; nodes.forEach((from, fi) => from.connectedTo.forEach((id) => { const target = byId.get(id); if (!target) return; const key = [from.id,id].sort().join(":"); if (seen.has(key)) return; seen.add(key); result.push([from,fi,target.node,target.index]); })); return result; }, [byId, nodes]);
  return <group name="life-map-constellations">{links.map(([from,fi,to,ti], index) => { const active = Boolean(selected && (selected.id === from.id || selected.id === to.id)); if (selected && !active) return null; const start = new THREE.Vector3(...cosmicPoint(from,fi)), end = new THREE.Vector3(...cosmicPoint(to,ti)), mid = start.clone().lerp(end,.5); mid.y += .8 + Math.min(2.8,start.distanceTo(end)*.08); return <Line key={index} name={`life-map-constellation-${index}`} points={[start,mid,end]} color={active ? selected!.aura : from.aura} lineWidth={active ? 1.4 : .65} transparent opacity={active ? .62 : .16} depthWrite={false} />; })}</group>;
}

function MemoryStar({ node, index, active, related, reducedMotion, onSelect }: { node: LifeMapNode; index: number; active: boolean; related: boolean; reducedMotion: boolean; onSelect: (node: LifeMapNode) => void }) {
  const group = useRef<THREE.Group>(null), point = useMemo(() => cosmicPoint(node,index), [index,node]), radius = .15 + node.intensity * .14;
  useFrame(({ clock }) => { if (!group.current) return; const pulse = reducedMotion ? 1 : 1 + Math.sin(clock.elapsedTime * (1.1 + node.intensity) + index) * .045; const scale = (active ? 1.7 : related ? 1.15 : 1) * pulse; group.current.scale.lerp(new THREE.Vector3(scale,scale,scale),.08); group.current.position.y = point[1] + (reducedMotion ? 0 : Math.sin(clock.elapsedTime * .22 + index) * .06); });
  const pointer = (event: ThreeEvent<PointerEvent>, value: boolean) => { event.stopPropagation(); document.body.style.cursor = value ? "pointer" : ""; };
  return <group ref={group} name={`life-map-memory-star-${node.id}`} position={point} userData={{ semanticType: node.type, visualAuthority: "celestial-memory-star" }} onClick={(event) => { event.stopPropagation(); onSelect(node); }} onPointerOver={(event) => pointer(event,true)} onPointerOut={(event) => pointer(event,false)}>
    <mesh><sphereGeometry args={[radius,28,28]} /><meshStandardMaterial color={node.aura} emissive={node.aura} emissiveIntensity={active ? 5 : 2.8} roughness={.2} toneMapped={false} /></mesh>
    <mesh scale={3.8}><sphereGeometry args={[radius,20,20]} /><meshBasicMaterial color={node.aura} transparent opacity={active ? .18 : .07} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></mesh>
    {node.type === "threshold" ? <mesh rotation={[Math.PI/2.4,.2,.4]}><torusGeometry args={[radius*2.8,.012,8,64]} /><meshBasicMaterial color={node.aura} transparent opacity={.5} /></mesh> : null}
    {node.type === "relationship" ? <><mesh position={[radius*1.9,radius*.4,0]}><sphereGeometry args={[radius*.55,18,18]} /><meshBasicMaterial color="#eefaff" /></mesh><Line points={[[0,0,0],[radius*1.9,radius*.4,0]]} color="#eefaff" transparent opacity={.42} /></> : null}
    <Sparkles count={active ? 24 : related ? 9 : 4} scale={active ? [2.7,2.7,2.7] : [1.5,1.5,1.5]} size={active ? 2 : 1.1} speed={reducedMotion ? 0 : .07} opacity={active ? .52 : .22} color={node.aura} />
    <pointLight color={node.aura} intensity={active ? 2.2 : .5} distance={active ? 8 : 3.5} decay={2} />
    <mesh scale={2.8}><sphereGeometry args={[radius,10,10]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
  </group>;
}

function CameraRig({ selected, selectedIndex, phase, reducedMotion }: { selected: LifeMapNode | null; selectedIndex: number; phase: Phase; reducedMotion: boolean }) {
  const { camera, pointer, size } = useThree(), look = useRef(new THREE.Vector3()), initialized = useRef(false);
  const goal = useCallback((): Goal => { const portrait = size.height > size.width, overview = new THREE.Vector3(0,portrait ? 1.5 : 3.2,portrait ? 27.5 : 24), targetOverview = new THREE.Vector3(0,.2,-14); if (!selected || phase === "overview") return { position: overview.toArray() as Point3, target: targetOverview.toArray() as Point3, fov: portrait ? 58 : 53 }; const target = new THREE.Vector3(...cosmicPoint(selected,selectedIndex)), dir = overview.clone().sub(target).normalize(), side = new THREE.Vector3(dir.z,0,-dir.x).normalize(), sign = Math.sign(target.x)||1; const distance = phase === "departure" ? 18 : phase === "travel" ? 13 : phase === "approach" ? 8 : portrait ? 6.5 : 5.5; const position = target.clone().addScaledVector(dir,distance).addScaledVector(side, phase === "travel" ? sign*3 : phase === "approach" ? sign*1.1 : 0); position.y += phase === "travel" ? 2.2 : phase === "approach" ? 1 : .5; return { position: position.toArray() as Point3, target: target.toArray() as Point3, fov: portrait ? 55 : phase === "arrival" ? 47 : 51 }; }, [phase,selected,selectedIndex,size.height,size.width]);
  useLayoutEffect(() => { if (initialized.current) return; const next = goal(); camera.position.set(...next.position); look.current.set(...next.target); camera.lookAt(look.current); if (camera instanceof THREE.PerspectiveCamera) { camera.fov = next.fov; camera.updateProjectionMatrix(); } initialized.current = true; }, [camera,goal]);
  useFrame((_,delta) => { const next = goal(), position = new THREE.Vector3(...next.position), target = new THREE.Vector3(...next.target); if (!selected && phase === "overview" && !reducedMotion) { position.x += pointer.x*1.6; position.y += pointer.y*.7; target.x += pointer.x*.7; target.y += pointer.y*.3; } if (reducedMotion) { camera.position.copy(position); look.current.copy(target); } else { const rate = phase === "overview" ? 2.8 : phase === "arrival" ? 5 : 3; camera.position.lerp(position,1-Math.exp(-rate*delta)); look.current.lerp(target,1-Math.exp(-4.8*delta)); } camera.lookAt(look.current); if (camera instanceof THREE.PerspectiveCamera) { camera.fov = reducedMotion ? next.fov : THREE.MathUtils.damp(camera.fov,next.fov,4,delta); camera.updateProjectionMatrix(); } });
  return null;
}

function CosmicWorld({ nodes, selected, selectedIndex, phase, reducedMotion, tier, onSelect, onWebGLState }: { nodes: LifeMapNode[]; selected: LifeMapNode | null; selectedIndex: number; phase: Phase; reducedMotion: boolean; tier: "low"|"medium"|"high"; onSelect: (node: LifeMapNode) => void; onWebGLState: (state: WebGLState) => void }) {
  const starCount = tier === "low" ? 650 : tier === "medium" ? 1100 : 1700;
  return <><color attach="background" args={["#01030a"]} /><fog attach="fog" args={["#01030a",52,145]} /><ambientLight intensity={.10} color="#d9f4ff" /><RenderProof /><WebGLRecovery onState={onWebGLState} /><CameraRig selected={selected} selectedIndex={selectedIndex} phase={phase} reducedMotion={reducedMotion} />
    <group name="life-map-deep-space"><Stars radius={92} depth={76} count={starCount} factor={1.7} saturation={.4} fade speed={reducedMotion ? 0 : .015} /><GalaxyField count={starCount} reducedMotion={reducedMotion} /><Nebula center={[-10,4,-20]} color="#705cff" seed={712} count={tier === "low" ? 100 : 220} scale={[11,5,10]} /><Nebula center={[10,-2,-29]} color="#35c8ff" seed={991} count={tier === "low" ? 100 : 220} scale={[10,5,12]} /><Nebula center={[1,8,-38]} color="#df6fb4" seed={1227} count={tier === "low" ? 90 : 190} scale={[14,6,11]} /></group>
    <Constellations nodes={nodes} selected={selected} /><group name="life-map-memory-stars">{nodes.map((node,index) => { const active = selected?.id === node.id, related = Boolean(selected && (selected.connectedTo.includes(node.id) || node.connectedTo.includes(selected.id))); return <group key={node.id} visible={!selected || active || related}><MemoryStar node={node} index={index} active={active} related={related} reducedMotion={reducedMotion} onSelect={onSelect} /></group>; })}</group>
    {selected ? <group name="life-map-selected-memory-nebula"><Nebula center={cosmicPoint(selected,selectedIndex)} color={selected.aura} seed={hash(selected.id)} count={tier === "low" ? 100 : 190} scale={[3,2.2,3.8]} /></group> : null}
    <group name="life-map-emotional-weather"><Sparkles count={tier === "low" ? 50 : 120} scale={[38,24,60]} position={[0,3,-24]} size={1.4} speed={reducedMotion ? 0 : .04} opacity={.24} color="#dff7ff" /></group></>;
}

export default function ComposedLifeMapScene() {
  const router = useRouter(), params = useSearchParams(), profile = useAdaptiveSpatialQuality();
  const explicitDemo = params.get("demo") === "1", overviewRequested = params.get("overview") === "1";
  const { nodes, loading, sourceMode } = useLifeMapEvents(explicitDemo ? "demo-user" : undefined);
  const queryNode = token(params.get("node") || params.get("memoryId")), manifestId = token(params.get("manifestId"),DEFAULT_MANIFEST_ID);
  const [selectedId,setSelectedId] = useState<string|null>(overviewRequested ? null : queryNode || null), [phase,setPhase] = useState<Phase>(() => !overviewRequested && queryNode ? "arrival" : "overview"), [webglState,setWebglState] = useState<WebGLState>("ready"), [software,setSoftware] = useState<boolean|null>(null);
  const journey = useRef(0), selected = useMemo(() => nodes.find((node) => node.id === selectedId) || null,[nodes,selectedId]), selectedIndex = Math.max(0,nodes.findIndex((node) => node.id === selected?.id));
  const withIdentity = useCallback((next: URLSearchParams) => { if (explicitDemo) next.set("demo","1"); if (manifestId) next.set("manifestId",manifestId); return next; },[explicitDemo,manifestId]);

  useEffect(() => { if (!selected || phase === "overview" || phase === "arrival") return; if (profile.reducedMotion) { journey.current += 1; setPhase("arrival"); return; } const key = journey.current, timer = window.setTimeout(() => { if (key !== journey.current) return; if (phase === "departure") setPhase("travel"); else if (phase === "travel") setPhase("approach"); else if (phase === "approach") setPhase("arrival"); },PHASE_MS[phase]); return () => clearTimeout(timer); },[phase,profile.reducedMotion,selected]);
  const selectNode = useCallback((node: LifeMapNode) => { journey.current += 1; setSelectedId(node.id); setPhase(profile.reducedMotion ? "arrival" : "departure"); const next = withIdentity(new URLSearchParams()); next.set("memoryId",node.id); next.set("node",node.id); if (node.eraId) next.set("era",node.eraId); router.replace(`/life-map?${next.toString()}`,{scroll:false}); },[profile.reducedMotion,router,withIdentity]);
  useEffect(() => { const handler = (event: Event) => { const detail = readLifeMapSelection(event); if (!detail) return; const node = nodes.find((candidate) => candidate.id === detail.nodeId); if (node) selectNode(node); }; window.addEventListener(LIFE_MAP_SELECTION_EVENT,handler); return () => window.removeEventListener(LIFE_MAP_SELECTION_EVENT,handler); },[nodes,selectNode]);
  const overview = useCallback(() => { const retained = selectedId || queryNode; journey.current += 1; setSelectedId(null); setPhase("overview"); const next = withIdentity(new URLSearchParams()); if (retained) { next.set("memoryId",retained); next.set("node",retained); } next.set("overview","1"); router.replace(`/life-map?${next.toString()}`,{scroll:false}); },[queryNode,router,selectedId,withIdentity]);
  const destinationHref = useCallback((route: "focus"|"replay") => { if (!selected) return "/life-map"; const next = withIdentity(new URLSearchParams()); next.set("memoryId",selected.id); next.set("node",selected.id); next.set("returnNode",selected.id); next.set("artifactFamily",resolveArtifactFamily(selected)); next.set("from","life-map"); return `/${route}?${next.toString()}`; },[selected,withIdentity]);
  useEffect(() => { if (!overviewRequested) return; journey.current += 1; setSelectedId(null); setPhase("overview"); },[overviewRequested]);
  useEffect(() => { if (overviewRequested || !queryNode || !nodes.length) return; const node = nodes.find((candidate) => candidate.id === queryNode); if (!node || selectedId === node.id) return; journey.current += 1; setSelectedId(node.id); setPhase("arrival"); },[nodes,overviewRequested,queryNode,selectedId]);
  useEffect(() => { const handler = (event: KeyboardEvent) => { if (event.defaultPrevented || event.key !== "Escape" || (event.target instanceof HTMLElement && event.target.matches("input,textarea,select,[role='textbox']"))) return; event.preventDefault(); if (selectedId) overview(); else router.push("/home"); }; window.addEventListener("keydown",handler,true); return () => window.removeEventListener("keydown",handler,true); },[overview,router,selectedId]);
  useEffect(() => () => { document.body.style.cursor = ""; },[]);

  const recovery = webglState !== "ready", showThresholds = Boolean(selected && phase === "arrival");
  return <main className="life-map-root" data-testid="urai-true-3d-life-map" data-spatial-visible="true" data-life-map-source={sourceMode} data-life-map-phase={phase} data-life-map-mode={selected ? "selected" : "overview"} data-life-map-scale={selected ? phase === "arrival" ? "intimate" : "regional" : "cosmic"} data-life-map-production-world="true" data-life-map-visual-authority="v257-cosmic-personal-universe" data-life-map-ground="none" data-life-map-render-ready="false" data-life-map-visible-anchors="0" data-life-map-visible-objects="0" data-life-map-render-calls="0" data-webgl-state={webglState} data-software-renderer={software === null ? "detecting" : software ? "true" : "false"} data-home-companion-owned="false">
    <h1 className="sr-only">URAI Life Map private universe</h1>
    <Canvas camera={{position:[0,3.2,24],fov:53,near:.06,far:180}} dpr={[1,profile.pixelRatioMax]} frameloop={profile.documentVisible ? "always" : "never"} gl={{antialias:profile.antialias,powerPreference:"high-performance",alpha:false}} onCreated={({gl}) => { setSoftware(isSoftwareRenderer(gl)); gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.06; gl.outputColorSpace = THREE.SRGBColorSpace; gl.setClearColor("#01030a",1); }}><CosmicWorld nodes={nodes} selected={selected} selectedIndex={selectedIndex} phase={phase} reducedMotion={profile.reducedMotion} tier={profile.tier} onSelect={selectNode} onWebGLState={setWebglState} /></Canvas>
    <header className="life-map-title"><span>URAI · LIFE MAP</span><strong>{selected ? selected.locked ? "Protected memory" : selected.title : "Your living universe"}</strong><em>{truthLabel(sourceMode)}</em></header>
    <div className="life-map-status" role="status" aria-live="polite"><span>{loading ? "Opening universe" : phaseLabel(phase)}</span><small>{selected ? `${artifactFamilyLabel(selected)} · ${selected.dateLabel}` : "Stars · galaxies · relationships · emotional weather"}</small></div>
    {showThresholds ? <nav className="life-map-thresholds" aria-label="Selected memory actions" data-family={resolveArtifactFamily(selected!)}><button className="focus-threshold" onClick={() => router.push(destinationHref("focus"))}><span>Inspect</span><strong>Enter Focus</strong></button><button className="replay-threshold" disabled={!selected!.replayAvailable || selected!.locked} onClick={() => router.push(destinationHref("replay"))}><span>Cross threshold</span><strong>Replay</strong></button><button className="overview-return" onClick={overview}>Overview</button></nav> : null}
    {recovery ? <section className="life-map-recovery" role="status" aria-live="assertive"><h2>{webglState === "lost" ? "Visual field paused safely" : "Restoring visual field"}</h2><p>Your selected memory, privacy state, and return position remain preserved.</p><button onClick={overview}>Open semantic overview</button><button onClick={() => router.push("/home")}>Return Home</button></section> : null}
    <style jsx>{`.life-map-root{position:fixed;inset:0;z-index:100;overflow:hidden;background:#01030a;color:#f8fbff;font-family:Inter,system-ui;isolation:isolate;width:100vw;height:100svh}.life-map-root:after{content:"";position:absolute;inset:0;z-index:2;pointer-events:none;background:radial-gradient(circle at 50% 46%,transparent 0 43%,rgba(0,0,0,.12) 72%,rgba(0,0,0,.48) 100%)}.life-map-root :global(canvas){position:absolute!important;inset:0;width:100%!important;height:100%!important}.sr-only{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0,0,0,0)}.life-map-title{position:absolute;z-index:12;top:max(22px,env(safe-area-inset-top));left:max(22px,env(safe-area-inset-left));display:grid;gap:5px;pointer-events:none;text-shadow:0 10px 34px #000}.life-map-title span,.life-map-title em{font:800 10px/1.2 Inter;letter-spacing:.22em;text-transform:uppercase;color:rgba(211,243,255,.78);font-style:normal}.life-map-title strong{font:750 clamp(25px,4vw,48px)/.96 Inter;letter-spacing:-.05em;max-width:13ch}.life-map-status{position:absolute;z-index:12;right:max(20px,env(safe-area-inset-right));top:max(20px,env(safe-area-inset-top));display:grid;justify-items:end;gap:4px;padding:10px 13px;border-right:1px solid rgba(225,243,255,.34);text-shadow:0 6px 20px #000}.life-map-status span{font:800 9px/1 Inter;letter-spacing:.17em;text-transform:uppercase}.life-map-status small{font-size:10px;color:rgba(220,240,251,.68)}.life-map-thresholds{position:absolute;z-index:16;left:50%;bottom:max(24px,calc(env(safe-area-inset-bottom) + 14px));transform:translateX(-50%);display:grid;grid-template-columns:1fr 1fr auto;gap:10px;width:min(560px,calc(100vw - 40px))}.life-map-thresholds button,.life-map-recovery button{min-height:58px;border:1px solid rgba(220,248,255,.24);border-radius:18px;background:rgba(5,16,29,.84);color:#f8fbff;padding:9px 16px;font-weight:800;cursor:pointer;backdrop-filter:blur(16px)}.life-map-thresholds button span{display:block;font-size:8px;letter-spacing:.16em;text-transform:uppercase;color:rgba(211,239,251,.62)}.life-map-thresholds button strong{display:block;margin-top:3px}.life-map-thresholds .overview-return{border-radius:999px}.life-map-thresholds button:disabled{opacity:.36}.life-map-thresholds button:focus-visible,.life-map-recovery button:focus-visible{outline:3px solid #dff8ff;outline-offset:3px}.life-map-recovery{position:absolute;z-index:30;inset:0;display:grid;place-content:center;justify-items:center;gap:12px;padding:24px;text-align:center;background:rgba(1,3,10,.92)}@media(max-width:700px){.life-map-title{top:max(14px,env(safe-area-inset-top));left:14px}.life-map-title strong{font-size:28px}.life-map-status{top:max(15px,env(safe-area-inset-top));right:12px}.life-map-status small{display:none}.life-map-thresholds{bottom:max(12px,env(safe-area-inset-bottom));grid-template-columns:1fr 1fr;width:calc(100vw - 24px);gap:8px}.life-map-thresholds .overview-return{grid-column:1/-1;justify-self:center;min-height:44px;width:108px}}@media(prefers-reduced-motion:reduce){.life-map-root *{transition:none!important;animation:none!important}.life-map-thresholds button,.life-map-recovery button{backdrop-filter:none}}@media(forced-colors:active){.life-map-thresholds button,.life-map-recovery button{border:2px solid CanvasText;background:Canvas;color:CanvasText}}`}</style>
  </main>;
}
