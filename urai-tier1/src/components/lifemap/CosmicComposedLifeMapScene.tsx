"use client";

import { Line, Stars } from "@react-three/drei";
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
  const disc = useMemo(() => {
    const size = 32, data = new Uint8Array(size * size * 4);
    for (let y=0;y<size;y+=1) for (let x=0;x<size;x+=1) { const d=Math.hypot((x+.5)/size-.5,(y+.5)/size-.5)*2, a=Math.max(0,Math.min(1,(1-d)*4)); const i=(y*size+x)*4; data[i]=data[i+1]=data[i+2]=255; data[i+3]=Math.round(a*a*255); }
    const texture = new THREE.DataTexture(data,size,size,THREE.RGBAFormat); texture.needsUpdate=true; return texture;
  }, []);
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
  useEffect(() => () => { geometry.dispose(); disc.dispose(); }, [disc,geometry]);
  // Keep the large galactic structure still so it reads as a place.
  return <points ref={root} name="life-map-personal-galaxy" geometry={geometry}><pointsMaterial map={disc} alphaTest={.018} vertexColors size={.105} transparent opacity={.8} depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation /></points>;
}

const NEBULA_VERTEX = `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const NEBULA_FRAGMENT = `
uniform vec3 colorA;uniform vec3 colorB;uniform float seed;uniform float opacity;varying vec2 vUv;
float hash21(vec2 p){p=fract(p*vec2(123.34,345.45));p+=dot(p,p+34.345);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x),mix(hash21(i+vec2(0,1)),hash21(i+vec2(1)),f.x),f.y);}
float fbm(vec2 p){float n=0.,a=.5;for(int i=0;i<5;i++){n+=noise(p)*a;p=p*2.03+vec2(7.1,3.7);a*=.5;}return n;}
void main(){vec2 p=(vUv-.5)*2.;float radial=smoothstep(1.08,.08,length(p*vec2(.78,1.08)));float cloud=fbm(p*2.15+seed)+.58*fbm(p*4.1-seed);float filaments=smoothstep(.38,1.05,cloud);float a=radial*filaments*opacity;vec3 c=mix(colorA,colorB,smoothstep(.25,.9,cloud));gl_FragColor=vec4(c,a);}`;

function NebulaVeil({ position, scale, rotation = 0, colors, opacity = .22, seed = 1 }: { position: Point3; scale: [number,number]; rotation?: number; colors: [string,string]; opacity?: number; seed?: number }) {
  const uniforms = useMemo(() => ({ colorA:{value:new THREE.Color(colors[0])},colorB:{value:new THREE.Color(colors[1])},seed:{value:seed},opacity:{value:opacity} }), [colors,opacity,seed]);
  return <mesh name={`life-map-nebula-veil-${seed}`} position={position} rotation={[0,0,rotation]} scale={[scale[0],scale[1],1]} renderOrder={-2}>
    <planeGeometry args={[1,1]} /><shaderMaterial vertexShader={NEBULA_VERTEX} fragmentShader={NEBULA_FRAGMENT} uniforms={uniforms} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
  </mesh>;
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
  const pointer = (event: ThreeEvent<PointerEvent>, value: boolean) => { event.stopPropagation(); document.body.style.cursor = value ? "pointer" : ""; };
  return <group ref={group} name={`life-map-memory-star-${node.id}`} position={point} userData={{ semanticType: node.type, visualAuthority: "celestial-memory-star" }} onClick={(event) => { event.stopPropagation(); onSelect(node); }} onPointerOver={(event) => pointer(event,true)} onPointerOut={(event) => pointer(event,false)}>
    <mesh rotation={[index*.17,index*.31,index*.11]} scale={active ? 1.22 : related ? 1.06 : 1}><dodecahedronGeometry args={[radius,0]} /><meshStandardMaterial color={node.aura} emissive={node.aura} emissiveIntensity={active ? .75 : .35} roughness={.62} metalness={.08} flatShading /></mesh>
    <mesh scale={active ? 2.25 : 1.7}><icosahedronGeometry args={[radius,2]} /><meshBasicMaterial color={node.aura} transparent opacity={active ? .075 : .035} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></mesh>
    {node.type === "threshold" ? <mesh rotation={[Math.PI/2.4,.2,.4]}><torusGeometry args={[radius*2.8,.012,8,64]} /><meshBasicMaterial color={node.aura} transparent opacity={.5} /></mesh> : null}
    {node.type === "relationship" ? <><mesh position={[radius*1.9,radius*.4,0]}><sphereGeometry args={[radius*.55,18,18]} /><meshBasicMaterial color="#eefaff" /></mesh><Line points={[[0,0,0],[radius*1.9,radius*.4,0]]} color="#eefaff" transparent opacity={.42} /></> : null}
    <pointLight color={node.aura} intensity={active ? 1.2 : .28} distance={active ? 6 : 2.7} decay={2} />
    <mesh scale={2.8}><sphereGeometry args={[radius,10,10]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
  </group>;
}

function CameraRig({ selected, selectedIndex, phase, reducedMotion }: { selected: LifeMapNode | null; selectedIndex: number; phase: Phase; reducedMotion: boolean }) {
  const { camera, pointer, size } = useThree(), look = useRef(new THREE.Vector3()), initialized = useRef(false);
  const goal = useCallback((): Goal => { const portrait = size.height > size.width, overview = new THREE.Vector3(0,portrait ? 1.5 : 3.2,portrait ? 27.5 : 24), targetOverview = new THREE.Vector3(0,.2,-14); if (!selected || phase === "overview") return { position: overview.toArray() as Point3, target: targetOverview.toArray() as Point3, fov: portrait ? 58 : 53 }; const target = new THREE.Vector3(...cosmicPoint(selected,selectedIndex)), dir = overview.clone().sub(target).normalize(), side = new THREE.Vector3(dir.z,0,-dir.x).normalize(), sign = Math.sign(target.x)||1; const distance = phase === "departure" ? 20 : phase === "travel" ? 16 : phase === "approach" ? 13 : portrait ? 12 : 10.5; const position = target.clone().addScaledVector(dir,distance).addScaledVector(side, phase === "travel" ? sign*3 : phase === "approach" ? sign*1.1 : 0); position.y += phase === "travel" ? 2.2 : phase === "approach" ? 1 : .5; return { position: position.toArray() as Point3, target: target.toArray() as Point3, fov: portrait ? 55 : phase === "arrival" ? 47 : 51 }; }, [phase,selected,selectedIndex,size.height,size.width]);
  useLayoutEffect(() => { if (initialized.current) return; const next = goal(); camera.position.set(...next.position); look.current.set(...next.target); camera.lookAt(look.current); if (camera instanceof THREE.PerspectiveCamera) { camera.fov = next.fov; camera.updateProjectionMatrix(); } initialized.current = true; }, [camera,goal]);
  useFrame((_,delta) => { const next = goal(), position = new THREE.Vector3(...next.position), target = new THREE.Vector3(...next.target); if (!selected && phase === "overview" && !reducedMotion) { position.x += pointer.x*1.6; position.y += pointer.y*.7; target.x += pointer.x*.7; target.y += pointer.y*.3; } if (reducedMotion) { camera.position.copy(position); look.current.copy(target); } else { const rate = phase === "overview" ? 2.8 : phase === "arrival" ? 5 : 3; camera.position.lerp(position,1-Math.exp(-rate*delta)); look.current.lerp(target,1-Math.exp(-4.8*delta)); } camera.lookAt(look.current); if (camera instanceof THREE.PerspectiveCamera) { camera.fov = reducedMotion ? next.fov : THREE.MathUtils.damp(camera.fov,next.fov,4,delta); camera.updateProjectionMatrix(); } });
  return null;
}

function CosmicWorld({ nodes, selected, selectedIndex, phase, reducedMotion, tier, onSelect, onWebGLState }: { nodes: LifeMapNode[]; selected: LifeMapNode | null; selectedIndex: number; phase: Phase; reducedMotion: boolean; tier: "low"|"medium"|"high"; onSelect: (node: LifeMapNode) => void; onWebGLState: (state: WebGLState) => void }) {
  const starCount = tier === "low" ? 650 : tier === "medium" ? 1100 : 1700;
  return <><color attach="background" args={["#01030a"]} /><fog attach="fog" args={["#01030a",52,145]} /><ambientLight intensity={.10} color="#d9f4ff" /><RenderProof /><WebGLRecovery onState={onWebGLState} /><CameraRig selected={selected} selectedIndex={selectedIndex} phase={phase} reducedMotion={reducedMotion} />
    <group name="life-map-deep-space"><Stars radius={92} depth={76} count={starCount} factor={1.45} saturation={.4} fade speed={0} /><GalaxyField count={starCount} reducedMotion={reducedMotion} />
      <NebulaVeil position={[-11,5,-31]} scale={[28,12]} rotation={-.18} colors={["#20297c","#8d3d82"]} opacity={.7} seed={.73} />
      <NebulaVeil position={[10,-3,-36]} scale={[30,14]} rotation={.24} colors={["#07517c","#386ca4"]} opacity={.62} seed={2.17} />
      <NebulaVeil position={[1,8,-44]} scale={[36,14]} rotation={-.06} colors={["#402069","#813962"]} opacity={.46} seed={4.61} />
      <Nebula center={[-10,4,-20]} color="#705cff" seed={712} count={tier === "low" ? 100 : 220} scale={[11,5,10]} /><Nebula center={[10,-2,-29]} color="#35c8ff" seed={991} count={tier === "low" ? 100 : 220} scale={[10,5,12]} />
    </group>
    <Constellations nodes={nodes} selected={selected} /><group name="life-map-memory-stars">{nodes.map((node,index) => { const active = selected?.id === node.id, related = Boolean(selected && (selected.connectedTo.includes(node.id) || node.connectedTo.includes(selected.id))); return <group key={node.id} visible={!selected || active || related}><MemoryStar node={node} index={index} active={active} related={related} reducedMotion={reducedMotion} onSelect={onSelect} /></group>; })}</group>
    {selected ? <group name="life-map-selected-memory-nebula"><Nebula center={cosmicPoint(selected,selectedIndex)} color={selected.aura} seed={hash(selected.id)} count={tier === "low" ? 80 : 150} scale={[4.8,3,5.2]} /></group> : null}
  </>;
}

export default function ComposedLifeMapScene() {
  const router = useRouter(), params = useSearchParams(), profile = useAdaptiveSpatialQuality();
  const explicitDemo = params.get("demo") === "1", overviewRequested = params.get("overview") === "1";
  const { nodes, loading, sourceMode } = useLifeMapEvents(explicitDemo ? "demo-user" : undefined);
  const queryNode = token(params.get("node") || params.get("memoryId")), manifestId = token(params.get("manifestId"),DEFAULT_MANIFEST_ID);
  const [selectedId,setSelectedId] = useState<string|null>(overviewRequested ? null : queryNode || null), [phase,setPhase] = useState<Phase>(() => !overviewRequested && queryNode ? "arrival" : "overview"), [webglState,setWebglState] = useState<WebGLState>("ready"), [software,setSoftware] = useState<boolean|null>(null);
  const journey = useRef(0), selected = useMemo(() => nodes.find((node) => node.id === selectedId) || null,[nodes,selectedId]), selectedIndex = Math.max(0,nodes.findIndex((node) => node.id === selected?.id));
  const withIdentity = useCallback((next: URLSearchParams) => { if (explicitDemo) next.set("demo","1"); if (manifestId) next.set("manifestId",manifestId); return next; },[explicitDemo,manifestId]);

  useEffect(() => { if (!selected || phase === "overview" || phase === "arrival") return; if (profile.reducedMotion) { journey.current += 1; setPhase("arrival"); return; } const key = journey.current, timer = window.setTimeout(() => { if (key !== journey.current) return; if (p…2555 tokens truncated…Texture(SANCTUARY_SOIL_ALBEDO)
  const texture = useMemo(() => {
    const copy = source.clone()
    copy.colorSpace = THREE.SRGBColorSpace
    copy.wrapS = copy.wrapT = THREE.RepeatWrapping
    // Sampling frequency belongs to the authored terrain UVs. Keep this matrix
    // neutral so the terrain's explicit atlas-island bounds remain auditable.
    copy.repeat.set(1, 1)
    copy.anisotropy = 8
    copy.needsUpdate = true
    return copy
  }, [source])
  useEffect(() => () => texture.dispose(), [texture])
  return texture
}
