"use client";

import { MemorySurfaceMaterial } from "@/spatial/assets/MemorySurfaceMaterial";
import { Line, Sparkles, Stars, useAnimations, useGLTF, useTexture } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import CinematicPostProcessing from "@/spatial/cinematic/CinematicPostProcessing";
import type { SpatialQualityProfile } from "@/spatial/performance/useAdaptiveSpatialQuality";
import { lifeMapLocalPoint as celestialNodePosition, lifeMapStage } from "./lifeMapSpatialLayout";
import type { LifeMapNode } from "./lifeMapData";
import { LIFE_MAP_SELECTION_EVENT, readLifeMapSelection } from "./lifeMapSelection";
import { LIFE_MAP_PATH_PALETTE, artifactFamilyLabel, artifactImportance, chapterForNode, resolveArtifactFamily, resolvePathKind } from "./lifeMapVisualSystem";

// V236 literal-pixel authority: a continuous eroded memory valley whose
// manifestations grow from authored geography instead of floating as a graph.
export type LifeMapJourneyPhase = "overview" | "departure" | "travel" | "approach" | "arrival";
type Point3 = [number, number, number];
type ArtifactProps = { node: LifeMapNode; active: boolean };
type MemoryForm = "petal" | "fan" | "wave" | "branch" | "shell";

const LifeMapReducedMotionContext = createContext(false);
const MEMORY_STAR_MODEL = "/assets/urai/generated/models/life-map-memory-star-v1.glb";
const MEMORY_CHAMBER_MODEL = "/assets/urai/generated/models/focus-memory-chamber-v1.glb";
const GOLD = "#ffd98a";
const ICE = "#dff8ff";
const CYAN = "#78e7ff";
const VIOLET = "#b18cff";
const MEMORY_STONE_MAPS = [
  "/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-diff-1k.webp",
  "/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-normal-gl-1k.webp",
  "/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-arm-1k.webp",
] as const;

function seeded(index: number, salt: number) {
  const value = Math.sin(index * 91.317 + salt * 13.77) * 43758.5453;
  return value - Math.floor(value);
}

// Open lamellar forms have actual surface depth and tapered edges, rather than
// uniform-width tubes. The deterministic seed gives each memory its own contour.
function memoryMembrane(seed: number, layer: number, core: boolean, form: MemoryForm = "petal") {
  const positions: number[] = [], colors: number[] = [], indices: number[] = [];
  const rows = 56, cols = 18;
  const phase = seeded(seed, layer + 3) * Math.PI * 2;
  const azimuth = layer * 2.39996323 + phase * .17;
  const pale = new THREE.Color("#d8eee5"), deep = new THREE.Color("#244d62");
  for (let row = 0; row <= rows; row++) {
    const t = row / rows;
    const envelope = Math.pow(Math.sin(Math.PI * t), .74);
    const lean = .19 * Math.sin(t * 4.5 + phase);
    for (let col = 0; col <= cols; col++) {
      const across = col / cols * 2 - 1;
      const lane = layer - 2.5;
      let x: number, y: number, z: number;
      if (form === "fan") {
        const width = (core ? .05 : .04 + .30 * Math.pow(t, .72)) * (core ? 1 : .82 + seeded(seed, layer) * .35);
        x = lane * .17 * t + across * width + .10 * Math.sin(t * 4.2 + phase);
        y = -.76 + 1.58 * t + .08 * across * t - .13 * across * across * Math.pow(t, 4);
        z = lane * .075 + .18 * Math.sin(t * 2.4 + phase * .22) + .12 * across * across * envelope;
      } else if (form === "wave") {
        const width = (core ? .08 : .15) * envelope;
        x = -.86 + 1.72 * t + .10 * Math.sin(t * 5.1 + phase);
        y = lane * .12 + .34 * Math.sin(t * Math.PI * 1.25 + phase * .18) + across * width;
        z = lane * .10 + .23 * Math.sin(t * Math.PI * 2 + phase) + .06 * across * envelope + .10 * across * across * envelope;
      } else if (form === "branch") {
        const side = layer % 2 ? -1 : 1;
        const width = (core ? .05 : .14) * envelope;
        x = side * (.06 + .68 * t) + .12 * Math.sin(t * 4.4 + phase) + across * width;
        y = -.80 + 1.62 * t + .05 * Math.sin(t * 5.2 + phase);
        z = lane * .11 + .16 * Math.sin(t * 3.2 + phase * .35) + .06 * across * envelope + .10 * across * across * envelope;
      } else if (form === "shell") {
        const angle = phase * .12 - 1.15 + t * 3.7;
        const radius = .10 + .64 * t;
        const width = (core ? .04 : .13) * envelope;
        x = Math.cos(angle) * radius + Math.cos(angle + Math.PI / 2) * across * width;
        z = Math.sin(angle) * radius + Math.sin(angle + Math.PI / 2) * across * width + lane * .045;
        y = -.50 + 1.05 * t + lane * .055 + .04 * across * envelope;
      } else {
        const width = envelope * (core ? .46 : .42 + seeded(seed, layer) * .25);
        const radius = .06 + t * (core ? .52 : .72 + seeded(seed, layer + 7) * .42) + .16 * across * across * envelope;
        const twist = azimuth + t * (core ? .75 : .38) + across * .38 * envelope;
        const fluting = .018 * Math.cos(across * 22 + t * 6) * envelope;
        x = Math.cos(twist) * radius + Math.sin(twist) * across * width + lean;
        z = Math.sin(twist) * radius - Math.cos(twist) * across * width + fluting;
        y = (t - .5) * (core ? 1.5 : 1.55 + .32 * Math.sin(phase)) - .18 * t * t + .18 * across * envelope;
      }
      positions.push(x, y, z);
      const c = deep.clone().lerp(pale, .22 + .62 * Math.pow(Math.abs(across), 2) + .10 * envelope);
      colors.push(c.r, c.g, c.b);
    }
  }
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
    const a = row * (cols + 1) + col, b = a + 1, c = a + cols + 1, d = c + 1;
    indices.push(a,b,c,b,d,c);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function memoryHeartGeometry(seed: number, form: MemoryForm) {
  return memoryMembrane(seed, 0, true, form);
}

function memoryFilamentGeometry(seed: number, filament: number, form: MemoryForm) {
  return memoryMembrane(seed, filament + 1, false, form);
}

function Current({ points, color, opacity = 0.4, width = 0.014 }: { points: Point3[]; color: string; opacity?: number; width?: number }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))).getPoints(48), [points]);
  return <Line points={curve} color={color} lineWidth={Math.max(1, width * 28)} transparent depthWrite={false} opacity={opacity} />;
}

function FieldParticles({ seed, count, radius, depth, height, color, opacity = 0.5, size = 0.055 }: { seed: number; count: number; radius: number; depth: number; height: number; color: string; opacity?: number; size?: number }) {
  const texture = useMemo(() => {
    const data = new Uint8Array(32 * 32 * 4);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      const r = Math.hypot((x - 15.5) / 15.5, (y - 15.5) / 15.5), i = (y * 32 + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = 255;
      data[i + 3] = Math.round(255 * Math.exp(-r * r * 6) * (1 - THREE.MathUtils.smoothstep(r, .65, 1)));
    }
    const map = new THREE.DataTexture(data, 32, 32, THREE.RGBAFormat);
    map.magFilter = map.minFilter = THREE.LinearFilter; map.needsUpdate = true;
    return map;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
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
  return <points geometry={geometry}><pointsMaterial map={texture} alphaTest={.005} color={color} size={size} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></points>;
}

function memoryValleyHeight(x: number, z: number) {
  const distanceFromPath = Math.abs(x - (.58 * Math.sin((z + 5.5) * .17) + .18 * Math.sin(z * .51)));
  const shoulder = Math.max(0, distanceFromPath - 2.7);
  const deepTime = THREE.MathUtils.clamp((-z - 2) / 39, 0, 1);
  const weathering = .34 * Math.sin(x * .52 + z * .29) * Math.cos(z * .23 - x * .31)
    + .13 * Math.sin(x * 1.67 - z * .83)
    + .08 * Math.cos(x * 3.1 + z * 1.94);
  const terraces = .24 * Math.tanh(Math.sin(z * .43 + x * .11) * 2.4);
  return -4.15 + shoulder * (.36 + deepTime * .22) + weathering + terraces + deepTime * .58;
}

function memoryValleyGeometry() {
  const cols = 104, rows = 148;
  const positions: number[] = [], colors: number[] = [], uvs: number[] = [], indices: number[] = [];
  const shadow = new THREE.Color("#101d25"), earth = new THREE.Color("#39423f"), lichen = new THREE.Color("#647269"), history = new THREE.Color("#786a62");
  for (let row = 0; row <= rows; row += 1) {
    const v = row / rows, z = 7 - v * 47;
    for (let col = 0; col <= cols; col += 1) {
      const u = col / cols, x = -15 + u * 30, y = memoryValleyHeight(x, z);
      positions.push(x, y, z);
      uvs.push(u * 5.2, v * 9.4);
      const shoulder = THREE.MathUtils.clamp((Math.abs(x) - 1.8) / 11, 0, 1);
      const age = THREE.MathUtils.clamp((-z + 5) / 46, 0, 1);
      const stain = .5 + .5 * Math.sin(x * 1.17 + z * .71) * Math.cos(z * .37 - x * .91);
      const color = shadow.clone().lerp(earth, .34 + shoulder * .32).lerp(lichen, .10 + stain * .16).lerp(history, age * .12);
      colors.push(color.r, color.g, color.b);
    }
  }
  const stride = cols + 1;
  for (let row = 0; row < rows; row += 1) for (let col = 0; col < cols; col += 1) {
    const a = row * stride + col, b = a + 1, c = a + stride, d = c + 1;
    if ((row + col) % 2) indices.push(a, c, b, b, c, d);
    else indices.push(a, c, d, a, d, b);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function memoryPathGeometry() {
  const rows = 132, cols = 8;
  const positions: number[] = [], colors: number[] = [], indices: number[] = [];
  const umber = new THREE.Color("#584c42"), warm = new THREE.Color("#9b8065"), pearl = new THREE.Color("#b9b39e");
  for (let row = 0; row <= rows; row += 1) {
    const t = row / rows, z = 6.1 - t * 44.8;
    const center = .58 * Math.sin((z + 5.5) * .17) + .18 * Math.sin(z * .51);
    const width = .78 - .18 * t + .08 * Math.sin(t * Math.PI * 5);
    for (let col = 0; col <= cols; col += 1) {
      const across = col / cols * 2 - 1, x = center + across * width;
      positions.push(x, memoryValleyHeight(x, z) + .045 + .025 * Math.cos(across * Math.PI), z);
      const color = umber.clone().lerp(warm, .32 + .3 * (1 - Math.abs(across))).lerp(pearl, .09 * Math.sin(t * Math.PI));
      colors.push(color.r, color.g, color.b);
    }
  }
  const stride = cols + 1;
  for (let row = 0; row < rows; row += 1) for (let col = 0; col < cols; col += 1) {
    const a = row * stride + col, b = a + 1, c = a + stride, d = c + 1;
    indices.push(a, c, b, b, c, d);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function ridgeWallGeometry(side: -1 | 1, distance: number, seed: number) {
  const samples = 72, positions: number[] = [], colors: number[] = [], indices: number[] = [];
  const lower = new THREE.Color("#192728"), upper = new THREE.Color(side < 0 ? "#4c5650" : "#4a3e4f");
  for (let sample = 0; sample <= samples; sample += 1) {
    const t = sample / samples, z = 5 - t * 45;
    const x = side * (distance + 1.1 * Math.sin(t * 8.3 + seed) + .38 * Math.sin(t * 23.1 - seed));
    const floor = memoryValleyHeight(x, z) - .25;
    const crest = floor + 3.2 + 2.8 * Math.pow(.5 + .5 * Math.sin(t * 7.1 + seed), 1.35) + 1.1 * Math.sin(t * 17.7 + seed * .4);
    for (let layer = 0; layer <= 4; layer += 1) {
      const u = layer / 4, inset = Math.sin(u * Math.PI) * (.42 + .16 * Math.sin(t * 12 + seed));
      positions.push(x - side * inset, THREE.MathUtils.lerp(floor, crest, u), z + .12 * Math.sin(u * 5 + t * 9));
      const color = lower.clone().lerp(upper, u * (.72 + .18 * Math.sin(t * 11 + seed)));
      colors.push(color.r, color.g, color.b);
    }
  }
  const stride = 5;
  for (let sample = 0; sample < samples; sample += 1) for (let layer = 0; layer < 4; layer += 1) {
    const a = sample * stride + layer, b = a + 1, c = a + stride, d = c + 1;
    indices.push(a, c, b, b, c, d);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function LivingMemoryGeography() {
  const maps = useTexture(MEMORY_STONE_MAPS as unknown as string[]) as THREE.Texture[];
  const terrain = useMemo(memoryValleyGeometry, []), path = useMemo(memoryPathGeometry, []);
  const ridges = useMemo(() => [ridgeWallGeometry(-1, 9.2, .7), ridgeWallGeometry(1, 8.4, 2.1), ridgeWallGeometry(-1, 13.1, 4.3), ridgeWallGeometry(1, 12.6, 5.7)], []);
  const preparedMaps = useMemo(() => maps.map((source, index) => {
    const texture = source.clone();
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(5.2, 9.4);
    texture.anisotropy = 8;
    texture.colorSpace = index === 0 ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    texture.needsUpdate = true;
    return texture;
  }), [maps]);
  useEffect(() => () => { terrain.dispose(); path.dispose(); ridges.forEach((ridge) => ridge.dispose()); preparedMaps.forEach((map) => map.dispose()); }, [path, preparedMaps, ridges, terrain]);
  return <group name="life-map-v236-continuous-eroded-memory-geography" userData={{ visualIntent: "rooted-life-history-valley", topology: "one-continuous-traversable-world" }}>
    <mesh geometry={terrain} receiveShadow castShadow name="life-map-v236-weathered-valley-floor">
      <meshStandardMaterial map={preparedMaps[0]} normalMap={preparedMaps[1]} roughnessMap={preparedMaps[2]} normalScale={new THREE.Vector2(.48,.48)} vertexColors color="#718078" roughness={.94} metalness={0} />
    </mesh>
    <mesh geometry={path} receiveShadow name="life-map-v236-worn-lineage-path"><meshStandardMaterial vertexColors color="#9b8b75" roughness={.98} /></mesh>
    {ridges.map((ridge, index) => <mesh key={index} geometry={ridge} receiveShadow castShadow name={`life-map-v236-stratified-history-ridge-${index}`}>
      <meshStandardMaterial map={preparedMaps[0]} normalMap={preparedMaps[1]} normalScale={new THREE.Vector2(.62,.62)} vertexColors color={index % 2 ? "#5f5964" : "#5a6861"} roughness={.96} side={THREE.DoubleSide} />
    </mesh>)}
    <pointLight position={[-4,1,-10]} color="#82c6b4" intensity={1.25} distance={15} decay={2} />
    <pointLight position={[4,2,-23]} color="#b79ac2" intensity={.95} distance={18} decay={2} />
  </group>;
}

function MemoryRoots({ node, index, active }: { node: LifeMapNode; index: number; active: boolean }) {
  const position = useMemo<Point3>(() => celestialNodePosition(node, index), [index, node]);
  const geometries = useMemo(() => Array.from({ length: 4 }, (_, branch) => {
    const angle = branch * 1.83 + seeded(index + 11, branch + 4) * .7;
    const baseY = memoryValleyHeight(position[0] + Math.cos(angle) * .45, position[2] + Math.sin(angle) * .45) - position[1];
    const start = new THREE.Vector3(Math.cos(angle) * (.46 + branch * .05), baseY, Math.sin(angle) * (.46 + branch * .05));
    const middle = new THREE.Vector3(Math.cos(angle) * (.28 + branch * .03), baseY * .52 - .12, Math.sin(angle) * (.28 + branch * .03));
    const end = new THREE.Vector3(Math.cos(angle + .4) * .11, -.58 + branch * .035, Math.sin(angle + .4) * .11);
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3([start, middle, end], false, "centripetal", .38), 32, .055 - branch * .006, 7, false);
  }), [index, position]);
  useEffect(() => () => geometries.forEach((geometry) => geometry.dispose()), [geometries]);
  return <group name={`life-map-v236-root-system-${node.id}`}>{geometries.map((geometry, branch) => <mesh key={branch} geometry={geometry} castShadow receiveShadow>
    <meshStandardMaterial color={branch % 2 ? "#526a65" : "#64596b"} emissive={node.aura} emissiveIntensity={active ? .22 : .055} roughness={.89} metalness={.01} />
  </mesh>)}</group>;
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
        vec3 p=vPosition*.055;
        float n=noise(p)+.52*noise(p*2.07+4.1)+.24*noise(p*4.13-7.3);
        float bands=.5+.5*sin(vPosition.x*.19+vPosition.y*.23+n*4.2+uTime*.05);
        float lane=exp(-pow((vPosition.y-vPosition.x*.17-3.*sin(vPosition.x*.08))/9.,2.));
        float veil=smoothstep(.55,1.12,n)*(.55+.45*bands)*lane;
        vec3 c=mix(vec3(.025,.15,.19),vec3(.25,.10,.34),noise(p*.72+11.));
        c=mix(c,vec3(.10,.30,.31),smoothstep(.72,1.2,n));
        gl_FragColor=vec4(c,(.04+.42*veil)*mix(1.0,1.12,uSelected));
        #include <colorspace_fragment>
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

function AuthoredMemoryStar({ aura, active, siteKey, scale = 1, rotation = [0,0,0], form }: { aura: string; active: boolean; siteKey: string; scale?: number; rotation?: Point3; form?: MemoryForm }) {
  const reducedMotion = useContext(LifeMapReducedMotionContext);
  const { scene, animations } = useGLTF(MEMORY_STAR_MODEL);
  const hiddenAsset = useMemo(() => scene.clone(true), [scene]);
  const group = useRef<THREE.Group>(null);
  const { actions } = useAnimations(animations, group);
  const seed = useMemo(() => siteKey.split("").reduce((sum, c) => sum + c.charCodeAt(0), 0), [siteKey]);
  const resolvedForm = form ?? (["petal", "fan", "wave", "branch", "shell"] as MemoryForm[])[seed % 5];
  const heart = useMemo(() => memoryHeartGeometry(seed, resolvedForm), [resolvedForm, seed]);
  const filaments = useMemo(() => Array.from({ length: 5 }, (_, index) => memoryFilamentGeometry(seed, index, resolvedForm)), [resolvedForm, seed]);
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
  return <group ref={group} scale={scale} rotation={rotation} name={`life-map-smooth-memory-star-${siteKey}`} userData={{ artRevision:'v230-semantic-memory-forms', form:resolvedForm }}>
    <primitive object={hiddenAsset} visible={false} />
    <mesh geometry={heart} castShadow><MemorySurfaceMaterial color={aura} reducedMotion={reducedMotion} /></mesh>
    {filaments.map((geometry, index) => <mesh key={index} geometry={geometry} castShadow>
      <MemorySurfaceMaterial color={index % 3 === 0 ? ICE : aura} reducedMotion={reducedMotion} />
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

function ChapterAnchor({ aura, index, form, scale = 1 }: { aura: string; index: number; form: MemoryForm; scale?: number }) {
  return <group name={`life-map-chapter-anchor-${index}`}><AuthoredMemoryStar aura={aura} active={false} siteKey={`chapter-${index}-${form}`} form={form} scale={scale} /></group>;
}

function ChapterTerritories() {
  const chapters = [
    { p: [-5.8,2.1,-7.2] as Point3, aura: "#8adfff", form: "fan" as MemoryForm, satellite: [-1.45,-.65,-.9] as Point3 },
    { p: [-1.5,-2.15,-12.3] as Point3, aura: "#df8ccc", form: "branch" as MemoryForm, satellite: [1.3,.95,-1.1] as Point3 },
    { p: [5.45,.75,-16.2] as Point3, aura: "#d9efff", form: "petal" as MemoryForm, satellite: [-1.35,1.05,-1.5] as Point3 },
    { p: [1.35,4.5,-22.6] as Point3, aura: "#efd098", form: "shell" as MemoryForm, satellite: [1.55,-.9,-1.7] as Point3 },
    { p: [-4.15,-1.35,-28] as Point3, aura: "#987eb5", form: "wave" as MemoryForm, satellite: [1.2,1.25,-1.25] as Point3 },
  ];
  return <group name="life-map-authored-chapter-regions" userData={{ composition: "five-asymmetric-depth-bands" }}>{chapters.map((chapter,index)=><group key={index} position={chapter.p} name={`life-map-depth-territory-${index}`}>
    <ChapterAnchor aura={chapter.aura} index={index} form={chapter.form} scale={.58 + index * .035} />
    <group position={chapter.satellite} rotation={[.15 + index * .08,-.3 + index * .13,.2]}>
      <ChapterAnchor aura={index % 2 ? ICE : chapter.aura} index={index + 5} form={(["wave","shell","fan","branch","petal"] as MemoryForm[])[index]} scale={.28 + (index % 2) * .06} />
    </group>
    <FieldParticles seed={510 + index * 61} count={44} radius={2.8 + index * .3} depth={4.2} height={2.8} color={chapter.aura} opacity={.18} size={.036} />
  </group>)}</group>;
}

function ForegroundObservatory({ selected }: { selected: LifeMapNode | null }) {
  if (selected) return null;
  return <group name="life-map-foreground-observatory" position={[0,-1.0,3.2]}>
    <FieldParticles seed={730} count={90} radius={9.5} depth={3} height={1.9} color={ICE} opacity={.20} size={.04} />
    <group position={[-6.6,.8,-.6]} rotation={[.18,.5,-.2]}><AuthoredMemoryStar aura="#7198ad" active={false} siteKey="near-memory-left" form="wave" scale={.34} /></group>
    <group position={[6.2,-.25,-1.8]} rotation={[-.12,-.55,.26]}><AuthoredMemoryStar aura="#b19bc5" active={false} siteKey="near-memory-right" form="branch" scale={.28} /></group>
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

function VisualArtifact({ node, active }: ArtifactProps) { return <AuthoredMemoryStar aura={node.aura} active={active} siteKey={node.id} form="fan" scale={active ? 1.18 : 0.92} rotation={[0.02, 0.55, 0.01]} />; }
function AudioArtifact({ node, active }: ArtifactProps) { return <group><AuthoredMemoryStar aura={node.aura} active={active} siteKey={node.id} form="wave" scale={active ? 1.08 : 0.82} />{[-0.34, 0, 0.34].map((z, index) => <Current key={z} points={[[-0.78,0,z],[-0.3,index*.2,z],[0.18,-index*.14,z],[0.82,.04,z]]} color={index === 1 ? ICE : node.aura} opacity={active ? .72 : .26} width={.025} />)}</group>; }
function RelationshipArtifact({ node, active }: ArtifactProps) { return <AuthoredMemoryStar aura={node.aura} active={active} siteKey={node.id} form="petal" scale={active ? 1.1 : 0.82} />; }
function PlaceArtifact({ node, active }: ArtifactProps) { return <AuthoredMemoryStar aura={node.aura} active={active} siteKey={node.id} form="shell" scale={active ? 1.2 : 0.9} rotation={[0,0.18,0]} />; }
function EmotionArtifact({ node, active }: ArtifactProps) { const reducedMotion = useContext(LifeMapReducedMotionContext); return <group><AuthoredMemoryStar aura={node.aura} active={active} siteKey={node.id} form="branch" scale={active ? 1.28 : 0.96} /><Sparkles count={active ? 34 : 14} scale={[2.2,1.1,2.2]} size={2.1} speed={reducedMotion ? 0 : 0.08} opacity={.42} color={node.aura} /></group>; }
function PatternArtifact({ node, active }: ArtifactProps) { return <group><AuthoredMemoryStar aura={node.aura} active={active} siteKey={node.id} form="wave" scale={active ? 1.12 : 0.82} />{!active ? [-0.22, 0, 0.22].map((y, index) => <Current key={y} points={[[-0.85,y,0],[-0.35,y+.24,-.25],[0.28,y-.18,-.32],[0.88,y,0]]} color={index === 1 ? ICE : node.aura} opacity={.20} width={.014} />) : null}</group>; }
function AchievementArtifact({ node, active }: ArtifactProps) { return <AuthoredMemoryStar aura={GOLD} active={active} siteKey={node.id} form="fan" scale={active ? 1.24 : 0.9} rotation={[0,0.72,0]} />; }
function GoalArtifact({ node, active }: ArtifactProps) { return <AuthoredMemoryStar aura={active ? GOLD : node.aura} active={active} siteKey={node.id} form="branch" scale={active ? 1.16 : 0.86} />; }
function FutureArtifact({ node, active }: ArtifactProps) { return <AuthoredMemoryStar aura={node.aura} active={active} siteKey={node.id} form="shell" scale={active ? 1.18 : 0.84} rotation={[0,-0.4,0]} />; }
function EverydayArtifact({ node, active }: ArtifactProps) { return <AuthoredMemoryStar aura={node.aura} active={active} siteKey={node.id} form="fan" scale={active ? 1.02 : 0.76} />; }
function ArchiveArtifact({ node, active }: ArtifactProps) { return <group><AuthoredMemoryStar aura={node.aura} active={active} siteKey={node.id} form="shell" scale={active ? 1.08 : 0.78} rotation={[0,0.2,0]} /><FieldParticles seed={77} count={active ? 34 : 18} radius={1.4} depth={2.2} height={0.55} color={ICE} opacity={active ? .42 : .22} size={.042} /></group>; }
function ProtectedArtifact({ node, active }: ArtifactProps) { return <group><AuthoredMemoryStar aura={node.aura} active={active} siteKey={node.id} form="petal" scale={active ? 1.0 : 0.7} rotation={[0,0.7,0]} /><FieldParticles seed={91} count={24} radius={1.65} depth={2.4} height={.48} color={node.aura} opacity={.24} size={.045} /></group>; }

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
  const celestialPosition = useMemo<Point3>(() => celestialNodePosition(node, index), [index, node]);
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
    <MemoryRoots node={node} index={index} active={active} />
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

function LineageRibbon({ curve, color, active, protectedPath }: { curve: THREE.QuadraticBezierCurve3; color: string; active: boolean; protectedPath: boolean }) {
  const geometry = useMemo(() => {
    const samples = curve.getPoints(40);
    const positions: number[] = [];
    const indices: number[] = [];
    const up = new THREE.Vector3(0, 1, 0);
    const side = new THREE.Vector3();
    const tangent = new THREE.Vector3();
    samples.forEach((point, index) => {
      tangent.copy(curve.getTangent(index / (samples.length - 1))).normalize();
      side.crossVectors(tangent, up);
      if (side.lengthSq() < .001) side.set(1, 0, 0);
      side.normalize();
      const taper = Math.pow(Math.sin(Math.PI * index / (samples.length - 1)), .42);
      const width = (active ? .105 : .052) * (.28 + .72 * taper);
      positions.push(
        point.x + side.x * width, point.y + side.y * width, point.z + side.z * width,
        point.x - side.x * width, point.y - side.y * width, point.z - side.z * width,
      );
      if (index < samples.length - 1) {
        const a = index * 2, b = a + 1, c = a + 2, d = a + 3;
        indices.push(a, b, c, b, d, c);
      }
    });
    const next = new THREE.BufferGeometry();
    next.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    next.setIndex(indices);
    next.computeVertexNormals();
    return next;
  }, [active, curve]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} name="life-map-lineage-ribbon">
    <meshBasicMaterial color={color} transparent opacity={protectedPath ? .018 : active ? .28 : .075} depthWrite={false} side={THREE.DoubleSide} />
  </mesh>;
}

function SemanticPath({ source, target, active, reducedMotion, index, sourceIndex, targetIndex }: { source: LifeMapNode; target: LifeMapNode; active: boolean; reducedMotion: boolean; index: number; sourceIndex: number; targetIndex: number }) {
  const start = useMemo(() => new THREE.Vector3(...celestialNodePosition(source, sourceIndex)), [sourceIndex, source]);
  const end = useMemo(() => new THREE.Vector3(...celestialNodePosition(target, targetIndex)), [targetIndex, target]);
  const curve = useMemo(() => {
    const middle = start.clone().lerp(end, 0.5);
    middle.y += 1.25 + start.distanceTo(end) * 0.075;
    middle.z -= 0.42;
    return new THREE.QuadraticBezierCurve3(start, middle, end);
  }, [end, start]);
  const kind = resolvePathKind(source, target);
  const color = LIFE_MAP_PATH_PALETTE[kind];
  return <group>
    <LineageRibbon curve={curve} color={color} active={active} protectedPath={kind === "protected"} />
    {active ? <Line points={curve.getPoints(48)} color={color} lineWidth={1} transparent depthWrite={false} opacity={.34} dashed={kind === "inferred" || kind === "corrected"} /> : null}
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
    return <SemanticPath key={`${link.source.id}:${link.target.id}`} source={link.source} target={link.target} active={active} reducedMotion={reducedMotion} index={index} sourceIndex={nodes.indexOf(link.source)} targetIndex={nodes.indexOf(link.target)} />;
  })}</group>;
}

function ArrivalSanctuary({ selected, selectedIndex, phase, reducedMotion }: { selectedIndex: number; selected: LifeMapNode | null; phase: LifeMapJourneyPhase; reducedMotion: boolean }) {
  const { scene, animations } = useGLTF(MEMORY_CHAMBER_MODEL);
  const group = useRef<THREE.Group>(null);
  const chamber = useMemo(() => scene.clone(true), [scene]);
  const { actions } = useAnimations(animations, group);
  const chamberThreads = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const points = Array.from({ length: 64 }, (_, point) => {
      const t = point / 63, angle = -.25 + t * Math.PI * 1.25 + index * .11;
      const radius = 1.5 + index * .16;
      return new THREE.Vector3(
        Math.cos(angle) * radius,
        -1.40 + Math.sin(t * Math.PI) * .18 + index * .025,
        -1.7 + Math.sin(angle) * radius * .48,
      );
    });
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, false, "centripetal", .42), 96, .009, 6, false);
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
  const [memoryX, memoryY, memoryZ] = celestialNodePosition(selected, selectedIndex);
  return <group
    ref={group}
    name="life-map-selected-arrival-sanctuary"
    userData={{ scaleMode: "intimate", depthBand: "near", semanticOwner: "life-map-intimate-memory-chamber", runtimeAsset: MEMORY_CHAMBER_MODEL }}
    position={[memoryX, memoryY - .28, memoryZ - .6]}
    scale={0.28}
  >
    <primitive object={chamber} visible={false} />
    <group scale={2.94} name="life-map-v229-open-branching-memory-grove">
      {chamberThreads.map((geometry, index) => <mesh key={index} geometry={geometry}><meshStandardMaterial color={index % 2 ? ICE : selected.aura} emissive={selected.aura} emissiveIntensity={.24} roughness={.7} transparent opacity={.24} /></mesh>)}
      <Current points={[[-2.7,-1.4,.4],[-1.5,.8,-1],[0,1.8,-1.8],[1.6,.7,-1.1],[2.8,-1.2,.3]]} color={selected.aura} opacity={.32} width={.026} />
      <FieldParticles seed={997} count={120} radius={2.8} depth={4.2} height={3.4} color={ICE} opacity={.34} size={.032} />
      <pointLight color={selected.aura} intensity={6} distance={22} decay={2} />
    </group>
  </group>;
}

function IntimateMemoryChamber(props: { selectedIndex: number; selected: LifeMapNode | null; phase: LifeMapJourneyPhase; reducedMotion: boolean }) {
  return <ArrivalSanctuary {...props} />;
}

function PersonalStarField({ count }: { count: number }) {
  const { gl } = useThree();
  const geometry = useMemo(() => {
    const positions: number[] = [], sizes: number[] = [], colors: number[] = [];
    const warm = new THREE.Color('#e7c899'), cool = new THREE.Color('#a4c8dd');
    for (let i = 0; i < count; i++) {
      const x = (seeded(i, 31) - .5) * 96;
      const spread = Math.pow(seeded(i, 32), 1.6) * (seeded(i, 33) > .5 ? 1 : -1);
      const y = x * .16 + spread * 20 + 4 * Math.sin(x * .07);
      const z = -28 - seeded(i, 34) * 54;
      positions.push(x, y, z);
      sizes.push(.6 + Math.pow(seeded(i, 35), 5) * 2.4);
      const color = cool.clone().lerp(warm, seeded(i, 36));
      colors.push(color.r, color.g, color.b);
    }
    const result = new THREE.BufferGeometry();
    result.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    result.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1));
    result.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return result;
  }, [count]);
  const material = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, vertexColors: true,
    uniforms: { uDpr: { value: gl.getPixelRatio() } },
    vertexShader: `uniform float uDpr; attribute float aSize; varying vec3 vColor; void main() { vColor=color; vec4 p=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*p; gl_PointSize=clamp(aSize*90./max(8.,-p.z),1.,4.5)*uDpr; }`,
    fragmentShader: `varying vec3 vColor; void main() { float r=length(gl_PointCoord-.5)*2.; float a=exp(-r*r*3.)*(1.-smoothstep(.65,1.,r)); gl_FragColor=vec4(vColor,a*.85);
#include <colorspace_fragment>
 }`,
  }), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  useFrame(() => { material.uniforms.uDpr.value = gl.getPixelRatio(); });
  return <points name="life-map-personal-galaxy-star-depth" geometry={geometry} material={material} />;
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
  const { scale: stageScale, position: stagePosition } = lifeMapStage(Boolean(selected), portrait);
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
    <color attach="background" args={["#07131c"]} />
    <fog attach="fog" args={["#122a31", 20, 88]} />
    <ambientLight intensity={.26} color="#b6d7d6" />
    <hemisphereLight args={["#c9e7df", "#07110f", .52]} />
    <directionalLight position={[9,14,10]} intensity={1.42} color="#ead9be" castShadow={profile.shadows} />
    <directionalLight position={[-12,7,-24]} intensity={.62} color="#6fa9a5" />
    {webglRecovery}
    <RenderProofRepublisher />
    {cameraRig}
    <group name="life-map-authored-environment">
      {/* Scene background supplies the sky; an opaque sphere here occludes the far star field. */}
      <NebulaBreath reducedMotion={profile.reducedMotion} selected={Boolean(selected)} />
      <FieldParticles seed={1220} count={profile.tier === "low" ? 150 : 360} radius={38} depth={72} height={30} color={VIOLET} opacity={.18} size={.06} />
    </group>
    <group name="life-map-temporal-horizon" position={[0,7,-42]}><FieldParticles seed={964} count={130} radius={22} depth={12} height={6} color={CYAN} opacity={.25} size={.045} /></group>
    <group name="life-map-world-stage" scale={stageScale} position={stagePosition}>
      <LivingMemoryGeography />
      <LifeCore hidden reducedMotion={profile.reducedMotion} tier={profile.tier} />
      <ChapterTerritories />
      <group name="life-map-light-bridges" userData={{ presentation: "curved-living-memory-connections" }} />
      <ForegroundObservatory selected={selected} />
      <OverviewLandmarks selected={selected} />
      <group name="life-map-memory-artifact-families">
        {nodes.map((node, index) => <MemoryArtifact key={node.id} node={node} index={index} selected={selected} phase={phase} reducedMotion={profile.reducedMotion} onSelect={onSelect} />)}
      </group>
      <LivingPaths nodes={nodes} selected={selected} reducedMotion={profile.reducedMotion} phase={phase} />
      <IntimateMemoryChamber selectedIndex={Math.max(0, nodes.findIndex(node => node.id === selected?.id))} selected={selected} phase={phase} reducedMotion={profile.reducedMotion} />
    </group>
    <MemoryWeather reducedMotion={profile.reducedMotion} />
    <ArchiveParticles qualityTier={profile.tier} reducedMotion={profile.reducedMotion} />
    <group name="life-map-far-future-horizon">
      <PersonalStarField count={starCount} />
      <Sparkles count={profile.tier === "low" ? 70 : 160} scale={[48,26,72]} position={[0,3,-18]} size={1.35} speed={profile.reducedMotion ? 0 : .08} opacity={.28} color="#d9f7ff" />
    </group>
    <CinematicPostProcessing active={profile.postprocessing} reducedMotion={profile.reducedMotion} />
  </LifeMapReducedMotionContext.Provider>;
}

useGLTF.preload(MEMORY_STAR_MODEL);
useGLTF.preload(MEMORY_CHAMBER_MODEL);
