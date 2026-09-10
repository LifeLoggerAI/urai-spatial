"use client";

import { Line, Sparkles, Stars, useAnimations, useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import CinematicPostProcessing from "@/spatial/cinematic/CinematicPostProcessing";
import type { SpatialQualityProfile } from "@/spatial/performance/useAdaptiveSpatialQuality";
import type { LifeMapNode } from "./lifeMapData";
import { LIFE_MAP_SELECTION_EVENT, readLifeMapSelection } from "./lifeMapSelection";
import { LIFE_MAP_PATH_PALETTE, artifactFamilyLabel, artifactImportance, chapterForNode, resolveArtifactFamily, resolvePathKind } from "./lifeMapVisualSystem";

// V226 literal-pixel authority: a suspended living memory galaxy with no heightfield, slabs, shards, or mineral presentation.
export type LifeMapJourneyPhase = "overview" | "departure" | "travel" | "approach" | "arrival";
type Point3 = [number, number, number];
type ArtifactProps = { node: LifeMapNode; active: boolean };

const LifeMapReducedMotionContext = createContext(false);
const MEMORY_STAR_MODEL = "/assets/urai/generated/models/life-map-memory-star-v1.glb";
const MEMORY_CHAMBER_MODEL = "/assets/urai/generated/models/focus-memory-chamber-v1.glb";
const GOLD = "#ffd98a";
const ICE = "#dff8ff";
const CYAN = "#78e7ff";
const VIOLET = "#b18cff";

function seeded(index: number, salt: number) {
  const value = Math.sin(index * 91.317 + salt * 13.77) * 43758.5453;
  return value - Math.floor(value);
}

function memoryHeartGeometry(seed: number) {
  const points = Array.from({ length: 96 }, (_, index) => {
    const t = index / 95;
    return new THREE.Vector3(
      .13 * Math.sin(t * Math.PI * 1.6 + seed * .09) + .055 * Math.sin(t * Math.PI * 4.2 + seed),
      (t - .5) * 1.18,
      .10 * Math.cos(t * Math.PI * 1.25 + seed * .13),
    );
  });
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, false, "centripetal", 0.42), 160, 0.072, 10, false);
}

function memoryFilamentGeometry(seed: number, filament: number) {
  const originT = (filament + 1) / 10;
  const side = filament % 2 ? -1 : 1;
  const origin = new THREE.Vector3(
    .13 * Math.sin(originT * Math.PI * 1.6 + seed * .09),
    (originT - .5) * 1.18,
    .10 * Math.cos(originT * Math.PI * 1.25 + seed * .13),
  );
  const reach = .54 + (filament % 4) * .12 + seed % 3 * .035;
  const points = Array.from({ length: 36 }, (_, index) => {
    const t = index / 35;
    return new THREE.Vector3(
      origin.x + side * reach * t + side * .11 * Math.sin(t * Math.PI),
      origin.y + ((filament % 3) - 1) * .30 * t + .15 * Math.sin(t * Math.PI),
      origin.z + (.18 + (filament % 3) * .08) * Math.sin(t * Math.PI * .82 + seed * .04),
    )
  });
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, false, "centripetal", 0.42), 72, 0.022 + (filament % 3) * 0.005, 8, false);
}

function Current({ points, color, opacity = 0.4, width = 0.014 }: { points: Point3[]; color: string; opacity?: number; width?: number }) {
  return <Line points={points} color={color} lineWidth={Math.max(0.5, width * 22)} transparent opacity={opacity} />;
}

function FieldParticles({ seed, count, radius, depth, height, color, opacity = 0.5, size = 0.055 }: { seed: number; count: number; radius: number; depth: number; height: number; color: string; opacity?: number; size?: number }) {
  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      const angle = seeded(index + seed, 1) * Math.PI * 2;
      const radial = Math.pow(seeded(index + seed, 2), 0.72) * radius;
      positions[index * 3] = Math.cos(angle) * radial;
      positions[index * 3 + 1] = (seeded(index + seed, 4) - 0.5) * height;
      positions[index * 3 + 2] = (seeded(index + seed, 5) - 0.5) * depth;
    }
    const next = new THREE.BufferGeometry();
    next.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return next;
  }, [count, depth, height, radius, seed]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <points geometry={geometry}><pointsMaterial color={color} size={size} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></points>;
}

function RenderProofRepublisher() {
  const { gl, scene, invalidate: requestRender } = useThree();
  const root = useRef<HTMLElement | null>(null);
  const frames = useRef(0);
  const invalidated = useRef(true);
  const lastSampleFrame = useRef(0);
  const lastSignature = useRef("");

  const resolveOwner = useCallback(() => {
    const element = gl.domElement.closest<HTMLElement>('[data-testid="urai-true-3d-life-map"]') ?? document.querySelector<HTMLElement>('[data-testid="urai-true-3d-life-map"]');
    root.current = element;
    return element;
  }, [gl]);

  const writeInvalid = () => {
    if (!invalidated.current) return;
    const element = resolveOwner();
    if (!element) return;
    element.dataset.lifeMapRenderReady = "false";
    element.dataset.lifeMapVisibleObjects = "0";
    element.dataset.lifeMapVisibleAnchors = "0";
    element.dataset.lifeMapRenderCalls = "0";
    element.dataset.lifeMapRenderTriangles = "0";
  };

  const publishSnapshot = useCallback(() => {
    let objects = 0;
    let anchors = 0;
    scene.traverse((object) => {
      if (object.visible) objects += 1;
      if (object.visible && object.name.startsWith("life-map-")) anchors += 1;
    });
    const calls = gl.info.render.calls;
    const triangles = gl.info.render.triangles;
    const ready = calls > 0 && objects > 20 && anchors >= 8;
    const signature = `${objects}:${anchors}:${calls}:${triangles}`;
    const element = resolveOwner();
    if (!element) return false;
    if (lastSignature.current !== signature || invalidated.current) {
      lastSignature.current = signature;
      element.dataset.lifeMapRenderReady = ready ? "true" : "false";
      element.dataset.lifeMapVisibleObjects = String(objects);
      element.dataset.lifeMapVisibleAnchors = String(anchors);
      element.dataset.lifeMapRenderCalls = String(calls);
      element.dataset.lifeMapRenderTriangles = String(triangles);
    }
    if (ready) invalidated.current = false;
    return ready;
  }, [gl, resolveOwner, scene]);

  useEffect(() => {
    const canvas = gl.domElement;
    const markInvalid = () => {
      invalidated.current = true;
      frames.current = 0;
      lastSampleFrame.current = 0;
      lastSignature.current = "";
      requestRender();
      writeInvalid();
    };
    const watchdog = window.setInterval(() => {
      if (!invalidated.current) return;
      requestRender();
      publishSnapshot();
    }, 100);
    canvas.addEventListener("webglcontextlost", markInvalid, false);
    canvas.addEventListener("webglcontextrestored", markInvalid, false);
    markInvalid();
    return () => {
      invalidated.current = false;
      window.clearInterval(watchdog);
      canvas.removeEventListener("webglcontextlost", markInvalid, false);
      canvas.removeEventListener("webglcontextrestored", markInvalid, false);
    };
  }, [gl, publishSnapshot, requestRender]);

  useFrame(() => {
    frames.current += 1;
    if (frames.current < 4) {
      requestRender();
      return;
    }
    if (!invalidated.current && frames.current - lastSampleFrame.current < 30) return;
    lastSampleFrame.current = frames.current;
    publishSnapshot();
  });
  return null;
}

function NebulaBreath({ reducedMotion, selected }: { reducedMotion: boolean; selected: boolean }) {
  const material = useMemo(() => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uSelected: { value: selected ? 1 : 0 } },
    vertexShader: `varying vec3 vPosition; void main(){vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `
      uniform float uSelected;
      uniform float uTime;
      varying vec3 vPosition;
      float hash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
      float noise(vec3 x){
        vec3 i=floor(x);vec3 f=fract(x);f=f*f*(3.-2.*f);
        return mix(mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
      }
      void main(){
        vec3 p=vPosition*.22;
        float n=noise(p)+.52*noise(p*2.07+4.1)+.24*noise(p*4.13-7.3);
        float bands=.5+.5*sin(vPosition.x*.19+vPosition.y*.23+n*4.2+uTime*.05);
        float veil=smoothstep(.55,1.12,n)*(.55+.45*bands);
        vec3 c=mix(vec3(.025,.15,.19),vec3(.25,.10,.34),noise(p*.72+11.));
        c=mix(c,vec3(.10,.30,.31),smoothstep(.72,1.2,n));
        gl_FragColor=vec4(c,(.035+.16*veil)*mix(1.0,1.24,uSelected));
      }
    `,
  }), [selected]);
  useEffect(() => () => material.dispose(), [material]);
  useFrame(({ clock }) => {
    material.uniforms.uTime.value = reducedMotion ? 0 : clock.elapsedTime;
    material.uniforms.uSelected.value = selected ? 1 : 0;
  });
  return <mesh name="life-map-v226-nebula-volume" scale={[1.0, .56, 1.12]}><sphereGeometry args={[46, 48, 36]} /><primitive object={material} attach="material" /></mesh>;
}

function AuthoredMemoryStar({ aura, active, siteKey, scale = 1, rotation = [0,0,0] }: { aura: string; active: boolean; siteKey: string; scale?: number; rotation?: Point3 }) {
  const reducedMotion = useContext(LifeMapReducedMotionContext);
  const { scene, animations } = useGLTF(MEMORY_STAR_MODEL);
  const hiddenAsset = useMemo(() => scene.clone(true), [scene]);
  const group = useRef<THREE.Group>(null);
  const { actions } = useAnimations(animations, group);
  const seed = useMemo(() => siteKey.split("").reduce((sum, c) => sum + c.charCodeAt(0), 0), [siteKey]);
  const heart = useMemo(() => memoryHeartGeometry(seed), [seed]);
  const filaments = useMemo(() => Array.from({ length: 9 }, (_, index) => memoryFilamentGeometry(seed, index)), [seed]);
  useEffect(() => () => { heart.dispose(); filaments.forEach((geometry) => geometry.dispose()); }, [filaments, heart]);
  useEffect(() => {
    const chosen = Object.values(actions).find(Boolean);
    if (!chosen) return;
    chosen.reset().play();
    chosen.setEffectiveTimeScale(reducedMotion ? 0 : 1);
    chosen.paused = reducedMotion;
    if (reducedMotion) chosen.time = chosen.getClip().duration * (active ? 0.62 : 0.35);
    return () => { chosen.stop(); };
  }, [actions, active, reducedMotion]);
  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return;
    group.current.rotation.y = rotation[1] + Math.sin(clock.elapsedTime * .18 + siteKey.length) * .09;
    const breath = 1 + Math.sin(clock.elapsedTime * .42 + siteKey.length) * .025;
    group.current.scale.setScalar(scale * breath);
  });
  return <group ref={group} scale={scale} rotation={rotation} name={`life-map-smooth-memory-star-${siteKey}`}>
    <primitive object={hiddenAsset} visible={false} />
    <mesh geometry={heart} castShadow><meshPhysicalMaterial color={ICE} emissive={aura} emissiveIntensity={active ? 2.1 : .9} roughness={.34} clearcoat={.25} clearcoatRoughness={.58} /></mesh>
    {filaments.map((geometry, index) => <mesh key={index} geometry={geometry} castShadow>
      <meshStandardMaterial color={index % 3 === 0 ? ICE : aura} emissive={aura} emissiveIntensity={active ? .92 : .38} roughness={.66} transparent opacity={active ? .92 : .76} />
    </mesh>)}
    <FieldParticles seed={seed} count={active ? 46 : 22} radius={1.0} depth={1.2} height={1.25} color={aura} opacity={active ? .62 : .32} size={active ? .038 : .028} />
    <pointLight color={aura} intensity={active ? 4.6 : 1.1} distance={active ? 10 : 5} decay={2} />
  </group>;
}

function LifeCore({ hidden, reducedMotion, tier }: { hidden?: boolean; reducedMotion: boolean; tier: SpatialQualityProfile["tier"] }) {
  const root = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!root.current || reducedMotion) return;
    root.current.rotation.y = clock.elapsedTime * .035;
  });
  return <group ref={root} visible={!hidden} name="life-map-white-gold-life-core" position={[0,1.4,-18]}><AuthoredMemoryStar aura={GOLD} active siteKey={`core-${tier}`} scale={1.5} /></group>;
}

function ChapterAnchor({ aura, index }: { aura: string; index: number }) {
  return <group name={`life-map-chapter-anchor-${index}`}><AuthoredMemoryStar aura={aura} active={false} siteKey={`chapter-${index}`} scale={.72 + (index % 3) * .08} /></group>;
}

function ChapterTerritories() {
  const chapters = [
    { p: [-7.4,2.2,-7.2] as Point3, aura: "#8adfff" }, { p: [6.8,3.1,-9.6] as Point3, aura: "#b18cff" },
    { p: [-4.8,-.2,-16.4] as Point3, aura: "#ffd98a" }, { p: [7.2,.8,-20.8] as Point3, aura: "#8fd7bc" },
    { p: [0,4.7,-27.5] as Point3, aura: "#d4a6dd" },
  ];
  return <group name="life-map-authored-chapter-regions">{chapters.map((chapter,index)=><group key={index} position={chapter.p}><ChapterAnchor aura={chapter.aura} index={index} /></group>)}</group>;
}

function ForegroundObservatory({ selected }: { selected: LifeMapNode | null }) {
  if (selected) return null;
  return <group name="life-map-foreground-observatory" position={[0,-1.0,3.2]}>
    <Current points={[[-10,.1,.4],[-5.2,.72,-1.3],[0,.2,-2.6],[5.1,.78,-1.2],[10.2,.08,.3]]} color={CYAN} opacity={.18} width={.038} />
    <FieldParticles seed={730} count={90} radius={9.5} depth={3} height={1.9} color={ICE} opacity={.20} size={.04} />
  </group>;
}

function OverviewLandmarks({ selected }: { selected: LifeMapNode | null }) {
  if (selected) return null;
  return <>
    <group name="life-map-relationship-observatory" position={[5.7,.55,-7.2]}><AuthoredMemoryStar aura={ICE} active={false} siteKey="relationship-observatory" scale={.64} /></group>
    <group name="life-map-goal-horizon" position={[-6.8,2.3,-15.6]}><AuthoredMemoryStar aura={GOLD} active={false} siteKey="goal-horizon" scale={.72} /></group>
    <group name="life-map-achievement-monument" position={[7.2,-.1,-13.4]}><AuthoredMemoryStar aura={GOLD} active={false} siteKey="achievement-monument" scale={.82} /></group>
    <group name="life-map-privacy-vault" position={[-7.4,-.5,-10.5]}><FieldParticles seed={811} count={38} radius={2.5} depth={3.4} height={2.6} color="#8d74ad" opacity={.32} size={.052} /></group>
  </>;
}

function MemoryWeather({ reducedMotion }: { reducedMotion: boolean }) {
  const root = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!root.current || reducedMotion) return;
    root.current.rotation.z = Math.sin(clock.elapsedTime * .035) * .035;
    root.current.position.x = Math.sin(clock.elapsedTime * .025) * .75;
  });
  return <group ref={root} name="life-map-emotional-weather" position={[0,6.4,-22]}><FieldParticles seed={340} count={130} radius={22} depth={8} height={6} color={VIOLET} opacity={.17} size={.07} /></group>;
}

function VisualArtifact({ node, active }: ArtifactProps) { return <AuthoredMemoryStar aura={node.aura} active={active} siteKey={node.id} scale={active ? 1.18 : 0.92} rotation={[0.02, 0.55, 0.01]} />; }
function AudioArtifact({ node, active }: ArtifactProps) { return <group><AuthoredMemoryStar aura={node.aura} active={active} siteKey={node.id} scale={active ? 1.08 : 0.82} />{[-0.34, 0, 0.34].map((z, index) => <Current key={z} points={[[-0.78,0,z],[-0.3,index*.2,z],[0.18,-index*.14,z],[0.82,.04,z]]} color={index === 1 ? ICE : node.aura} opacity={active ? .72 : .26} width={.025} />)}</group>; }
function RelationshipArtifact({ node, active }: ArtifactProps) { return <AuthoredMemoryStar aura={node.aura} active={active} siteKey={node.id} scale={active ? 1.1 : 0.82} />; }
function PlaceArtifact({ node, active }: ArtifactProps) { return <AuthoredMemoryStar aura={node.aura} active={active} siteKey={node.id} scale={active ? 1.2 : 0.9} rotation={[0,0.18,0]} />; }
function EmotionArtifact({ node, active }: ArtifactProps) { const reducedMotion = useContext(LifeMapReducedMotionContext); return <group><AuthoredMemoryStar aura={node.aura} active={active} siteKey={node.id} scale={active ? 1.28 : 0.96} /><Sparkles count={active ? 34 : 14} scale={[2.2,1.1,2.2]} size={2.1} speed={reducedMotion ? 0 : 0.08} opacity={.42} color={node.aura} /></group>; }
function PatternArtifact({ node, active }: ArtifactProps) { return <group><AuthoredMemoryStar aura={node.aura} active={active} siteKey={node.id} scale={active ? 1.12 : 0.82} />{!active ? [-0.22, 0, 0.22].map((y, index) => <Current key={y} points={[[-0.85,y,0],[-0.35,y+.24,-.25],[0.28,y-.18,-.32],[0.88,y,0]]} color={index === 1 ? ICE : node.aura} opacity={.20} width={.014} />) : null}</group>; }
function AchievementArtifact({ node, active }: ArtifactProps) { return <AuthoredMemoryStar aura={GOLD} active={active} siteKey={node.id} scale={active ? 1.24 : 0.9} rotation={[0,0.72,0]} />; }
function GoalArtifact({ node, active }: ArtifactProps) { return <AuthoredMemoryStar aura={active ? GOLD : node.aura} active={active} siteKey={node.id} scale={active ? 1.16 : 0.86} />; }
function FutureArtifact({ node, active }: ArtifactProps) { return <AuthoredMemoryStar aura={node.aura} active={active} siteKey={node.id} scale={active ? 1.18 : 0.84} rotation={[0,-0.4,0]} />; }
function EverydayArtifact({ node, active }: ArtifactProps) { return <AuthoredMemoryStar aura={node.aura} active={active} siteKey={node.id} scale={active ? 1.02 : 0.76} />; }
function ArchiveArtifact({ node, active }: ArtifactProps) { return <group><AuthoredMemoryStar aura={node.aura} active={active} siteKey={node.id} scale={active ? 1.08 : 0.78} rotation={[0,0.2,0]} /><FieldParticles seed={77} count={active ? 34 : 18} radius={1.4} depth={2.2} height={0.55} color={ICE} opacity={active ? .42 : .22} size={.042} /></group>; }
function ProtectedArtifact({ node, active }: ArtifactProps) { return <group><AuthoredMemoryStar aura={node.aura} active={active} siteKey={node.id} scale={active ? 1.0 : 0.7} rotation={[0,0.7,0]} /><FieldParticles seed={91} count={24} radius={1.65} depth={2.4} height={.48} color={node.aura} opacity={.24} size={.045} /></group>; }

function ArtifactShape(props: ArtifactProps) {
  const family = resolveArtifactFamily(props.node);
  if (family === "visual") return <VisualArtifact {...props} />;
  if (family === "audio") return <AudioArtifact {...props} />;
  if (family === "relationship") return <RelationshipArtifact {...props} />;
  if (family === "place") return <PlaceArtifact {...props} />;
  if (family === "emotion") return <EmotionArtifact {...props} />;
  if (family === "pattern") return <PatternArtifact {...props} />;
  if (family === "achievement") return <AchievementArtifact {...props} />;
  if (family === "goal") return <GoalArtifact {...props} />;
  if (family === "future") return <FutureArtifact {...props} />;
  if (family === "archive") return <ArchiveArtifact {...props} />;
  if (family === "protected") return <ProtectedArtifact {...props} />;
  return <EverydayArtifact {...props} />;
}

function MemoryArtifact({ node, index, selected, phase, reducedMotion, onSelect }: { node: LifeMapNode; index: number; selected: LifeMapNode | null; phase: LifeMapJourneyPhase; reducedMotion: boolean; onSelect: (node: LifeMapNode) => void }) {
  const root = useRef<THREE.Group>(null);
  const active = selected?.id === node.id;
  const related = Boolean(selected && (selected.connectedTo.includes(node.id) || node.connectedTo.includes(selected.id)));
  const visible = !selected || active || (related && phase !== "arrival");
  const importance = artifactImportance(node);
  const chapter = chapterForNode(node, index);
  const semanticLabel = artifactFamilyLabel(node);
  const celestialPosition = useMemo<Point3>(() => {
    const [x, y, z] = node.position;
    return [x * .92, y * .72 + Math.sin(index * .91) * 1.25, z * 1.06 - 5.5];
  }, [index, node.position]);
  useFrame(({ clock }) => {
    if (!root.current || reducedMotion) return;
    root.current.rotation.y = Math.sin(clock.elapsedTime * .13 + index) * .08;
    root.current.position.y = celestialPosition[1] + Math.sin(clock.elapsedTime * .28 + index * .7) * .05;
  });
  return <group
    ref={root}
    position={celestialPosition}
    visible={visible}
    scale={active ? 1.04 : 1.08 + importance * 0.30}
    name={`life-map-artifact-${resolveArtifactFamily(node)}-${node.id}`}
    userData={{ artifactFamily: resolveArtifactFamily(node), importance: importance.toFixed(2), semanticLabel, chapterId: chapter.id, runtimeAsset: MEMORY_STAR_MODEL }}
    onClick={(event) => { event.stopPropagation(); onSelect(node); }}
  >
    <ArtifactShape node={node} active={active} />
    <Sparkles count={active ? 18 : 5} scale={active ? [2.6,2.8,2.6] : [1.4,1.6,1.4]} size={active ? 1.7 : 1.0} speed={reducedMotion ? 0 : 0.08} opacity={active ? .36 : .18} color={node.aura} />
  </group>;
}

function PathPulse({ curve, color, reducedMotion, offset }: { curve: THREE.QuadraticBezierCurve3; color: string; reducedMotion: boolean; offset: number }) {
  const pulse = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!pulse.current || reducedMotion) return;
    const t = (clock.elapsedTime * 0.055 + offset) % 1;
    pulse.current.position.copy(curve.getPoint(t));
  });
  return <group ref={pulse} position={curve.getPoint(offset % 1)} name="life-map-living-pulse"><Sparkles count={3} scale={0.16} size={3} speed={0} opacity={0.9} color={color} /></group>;
}

function SemanticPath({ source, target, active, reducedMotion, index }: { source: LifeMapNode; target: LifeMapNode; active: boolean; reducedMotion: boolean; index: number }) {
  const start = useMemo(() => new THREE.Vector3(source.position[0] * .92, source.position[1] * .72 + Math.sin(index * .91) * 1.25, source.position[2] * 1.06 - 5.5), [index, source.position]);
  const end = useMemo(() => new THREE.Vector3(target.position[0] * .92, target.position[1] * .72 + Math.sin((index + 1) * .91) * 1.25, target.position[2] * 1.06 - 5.5), [index, target.position]);
  const curve = useMemo(() => {
    const middle = start.clone().lerp(end, 0.5);
    middle.y += 1.25 + start.distanceTo(end) * 0.075;
    middle.z -= 0.42;
    return new THREE.QuadraticBezierCurve3(start, middle, end);
  }, [end, start]);
  const kind = resolvePathKind(source, target);
  const color = LIFE_MAP_PATH_PALETTE[kind];
  return <group>
    <Line points={curve.getPoints(48)} color={color} lineWidth={active ? .34 : .16} transparent opacity={kind === "protected" ? .012 : active ? .14 : .035} dashed={kind === "inferred" || kind === "corrected" || kind === "protected"} />
    {active && kind !== "protected" ? <PathPulse curve={curve} color={color} reducedMotion={reducedMotion} offset={(index * .19) % 1} /> : null}
  </group>;
}

function LivingPaths({ nodes, selected, reducedMotion, phase }: { nodes: LifeMapNode[]; selected: LifeMapNode | null; reducedMotion: boolean; phase: LifeMapJourneyPhase }) {
  const links = useMemo(() => {
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const seen = new Set<string>();
    const result: Array<{ source: LifeMapNode; target: LifeMapNode }> = [];
    for (const source of nodes) for (const targetId of source.connectedTo) {
      const target = byId.get(targetId);
      if (!target) continue;
      const key = [source.id, target.id].sort().join(":");
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({ source, target });
    }
    return result;
  }, [nodes]);
  return <group name="life-map-curved-semantic-paths">{links.map((link, index) => {
    const active = Boolean(selected && (selected.id === link.source.id || selected.id === link.target.id));
    if (selected && phase === "arrival" && !active) return null;
    return <SemanticPath key={`${link.source.id}:${link.target.id}`} source={link.source} target={link.target} active={active} reducedMotion={reducedMotion} index={index} />;
  })}</group>;
}

function ArrivalSanctuary({ selected, phase, reducedMotion }: { selected: LifeMapNode | null; phase: LifeMapJourneyPhase; reducedMotion: boolean }) {
  const { scene, animations } = useGLTF(MEMORY_CHAMBER_MODEL);
  const group = useRef<THREE.Group>(null);
  const chamber = useMemo(() => scene.clone(true), [scene]);
  const { actions } = useAnimations(animations, group);
  const chamberThreads = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const x = -2.28 + index * .76;
    const points = Array.from({ length: 48 }, (_, point) => {
      const t = point / 47;
      return new THREE.Vector3(
        x + Math.sin(t * Math.PI) * ((index % 2 ? -1 : 1) * (.24 + index * .018)),
        -1.25 + t * (2.75 + (index % 3) * .22),
        -1.22 + .18 * Math.sin(index * 1.4) - t * (.36 + (index % 2) * .12),
      );
    });
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, false, "centripetal", .42), 96, .026 + index % 2 * .008, 8, false);
  }), []);
  useEffect(() => () => chamberThreads.forEach((geometry) => geometry.dispose()), [chamberThreads]);
  useEffect(() => {
    if (!selected || phase !== "arrival") return;
    const arrival = actions.Focus_Arrival;
    const breathing = actions.Focus_Breathing;
    if (arrival) {
      arrival.reset().play();
      arrival.setEffectiveTimeScale(reducedMotion ? 0 : 1);
      arrival.paused = reducedMotion;
      if (reducedMotion) arrival.time = arrival.getClip().duration;
    }
    if (breathing) {
      breathing.reset().play();
      breathing.setEffectiveTimeScale(reducedMotion ? 0 : 1);
      breathing.paused = reducedMotion;
      if (reducedMotion) breathing.time = breathing.getClip().duration * 0.35;
    }
    return () => { arrival?.stop(); breathing?.stop(); };
  }, [actions, phase, reducedMotion, selected]);
  if (!selected || phase !== "arrival") return null;
  return <group
    ref={group}
    name="life-map-selected-arrival-sanctuary"
    userData={{ scaleMode: "intimate", depthBand: "near", semanticOwner: "life-map-intimate-memory-chamber", runtimeAsset: MEMORY_CHAMBER_MODEL }}
    position={[selected.position[0], selected.position[1] - 0.28, selected.position[2] - 2.6]}
    scale={0.28}
  >
    <primitive object={chamber} visible={false} />
    <group scale={2.94} name="life-map-v229-open-branching-memory-grove">
      {chamberThreads.map((geometry, index) => <mesh key={index} geometry={geometry}><meshStandardMaterial color={index % 2 ? ICE : selected.aura} emissive={selected.aura} emissiveIntensity={.54} roughness={.7} transparent opacity={.48} /></mesh>)}
      <Current points={[[-2.7,-1.4,.4],[-1.5,.8,-1],[0,1.8,-1.8],[1.6,.7,-1.1],[2.8,-1.2,.3]]} color={selected.aura} opacity={.32} width={.026} />
      <FieldParticles seed={997} count={120} radius={2.8} depth={4.2} height={3.4} color={ICE} opacity={.34} size={.032} />
      <pointLight color={selected.aura} intensity={6} distance={22} decay={2} />
    </group>
  </group>;
}

function IntimateMemoryChamber(props: { selected: LifeMapNode | null; phase: LifeMapJourneyPhase; reducedMotion: boolean }) {
  return <ArrivalSanctuary {...props} />;
}

function ArchiveParticles({ qualityTier, reducedMotion }: { qualityTier: SpatialQualityProfile["tier"]; reducedMotion: boolean }) {
  return <group name="life-map-archive-particles"><Stars radius={58} depth={38} count={qualityTier === "low" ? 80 : qualityTier === "medium" ? 150 : 240} factor={1.45} saturation={.34} fade speed={reducedMotion ? 0 : .012} /></group>;
}

export function LifeMapProductionWorld({ nodes, selected, phase, profile, onSelect, cameraRig, webglRecovery }: {
  nodes: LifeMapNode[];
  selected: LifeMapNode | null;
  phase: LifeMapJourneyPhase;
  profile: SpatialQualityProfile;
  onSelect: (node: LifeMapNode) => void;
  cameraRig: ReactNode;
  webglRecovery: ReactNode;
}) {
  const { size } = useThree();
  const portrait = size.height > size.width;
  const stageScale: Point3 = selected ? (portrait ? [1.04, 1.02, 1.04] : [1.08, 1.08, 1.08]) : portrait ? [1.02, 1.02, 1.02] : [1.0, 1.0, 1.0];
  const stagePosition: Point3 = selected ? (portrait ? [0, -0.08, 0.58] : [0, -0.14, 0.72]) : portrait ? [0, -0.18, 0.54] : [0, -0.14, 1.15];
  const starCount = profile.tier === "low" ? 420 : profile.tier === "medium" ? 760 : 1160;

  useEffect(() => {
    const handleSelectionRequest = (event: Event) => {
      const detail = readLifeMapSelection(event);
      if (!detail) return;
      const node = nodes.find((candidate) => candidate.id === detail.nodeId);
      if (node) onSelect(node);
    };
    window.addEventListener(LIFE_MAP_SELECTION_EVENT, handleSelectionRequest);
    return () => window.removeEventListener(LIFE_MAP_SELECTION_EVENT, handleSelectionRequest);
  }, [nodes, onSelect]);

  return <LifeMapReducedMotionContext.Provider value={profile.reducedMotion}>
    <color attach="background" args={["#030815"]} />
    <fog attach="fog" args={["#071525", 14, 88]} />
    <ambientLight intensity={.18} color="#b6d7d6" />
    <hemisphereLight args={["#c9e7df", "#030709", .38]} />
    <directionalLight position={[9,14,10]} intensity={1.05} color="#d7eee5" castShadow={profile.shadows} />
    {webglRecovery}
    <RenderProofRepublisher />
    {cameraRig}
    <group name="life-map-authored-environment">
      <mesh><sphereGeometry args={[86, 48, 36]} /><meshBasicMaterial color="#030815" side={THREE.BackSide} /></mesh>
      <NebulaBreath reducedMotion={profile.reducedMotion} selected={Boolean(selected)} />
      <FieldParticles seed={1220} count={profile.tier === "low" ? 150 : 360} radius={38} depth={72} height={30} color={VIOLET} opacity={.18} size={.06} />
    </group>
    <group name="life-map-temporal-horizon"><Current points={[[-28,8,-42],[-12,10,-48],[0,7,-54],[13,11,-48],[28,8,-42]]} color={CYAN} opacity={.06} width={.18} /></group>
    <group name="life-map-world-stage" scale={stageScale} position={stagePosition}>
      <LifeCore hidden reducedMotion={profile.reducedMotion} tier={profile.tier} />
      <ChapterTerritories />
      <group name="life-map-light-bridges" userData={{ presentation: "curved-living-memory-connections" }} />
      <ForegroundObservatory selected={selected} />
      <OverviewLandmarks selected={selected} />
      <group name="life-map-memory-artifact-families">
        {nodes.map((node, index) => <MemoryArtifact key={node.id} node={node} index={index} selected={selected} phase={phase} reducedMotion={profile.reducedMotion} onSelect={onSelect} />)}
      </group>
      <LivingPaths nodes={nodes} selected={selected} reducedMotion={profile.reducedMotion} phase={phase} />
      <IntimateMemoryChamber selected={selected} phase={phase} reducedMotion={profile.reducedMotion} />
    </group>
    <MemoryWeather reducedMotion={profile.reducedMotion} />
    <ArchiveParticles qualityTier={profile.tier} reducedMotion={profile.reducedMotion} />
    <group name="life-map-far-future-horizon">
      <Stars radius={120} depth={84} count={starCount} factor={2.25} saturation={.32} fade speed={profile.reducedMotion ? 0 : .018} />
      <Sparkles count={profile.tier === "low" ? 70 : 160} scale={[48,26,72]} position={[0,3,-18]} size={1.35} speed={profile.reducedMotion ? 0 : .08} opacity={.28} color="#d9f7ff" />
    </group>
    <CinematicPostProcessing active={profile.postprocessing} reducedMotion={profile.reducedMotion} />
  </LifeMapReducedMotionContext.Provider>;
}

useGLTF.preload(MEMORY_STAR_MODEL);
useGLTF.preload(MEMORY_CHAMBER_MODEL);
