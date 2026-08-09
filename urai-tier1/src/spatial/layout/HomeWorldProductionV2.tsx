"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, Stars, useGLTF } from "@react-three/drei";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import * as THREE from "three";
import { MobileMovementPad, stepEmbodiedMotion, useDragLook, useMovementInput, type MovementInput } from "@/spatial/navigation/EmbodiedNavigation";
import { useSceneStore } from "@/spatial/store/useSceneStore";
import { requestUraiWorldOrbOpen, requestUraiWorldTravel } from "@/spatial/world/worldEvents";
import styles from "./HomeWorldProduction.module.css";

const HOME_PROVIDER_ENVIRONMENT = "/assets/urai/replay/replay-memory-film-main.webp";
const HOME_SANCTUARY_MODEL = "/assets/urai/generated/models/home-entry-chamber-v1.glb";
const HOME_ORB_MODEL = "/assets/urai/generated/models/urai-orb-avatar-v1.glb";
const HOME_FERN_MODEL = "/assets/urai/home-production/cc0/polyhaven-fern-02-geometry-v1.glb";
const HOME_BOUNDS = { minX: -12.5, maxX: 12.5, minZ: -15.5, maxZ: 10.5 };
const SPAWN = new THREE.Vector3(0, 0, 7.8);
const ORB = new THREE.Vector3(0, 1.02, -2.85);
const GROUND_THRESHOLD = new THREE.Vector3(-4.9, 0, -7.2);
const LIFE_MAP_LOOKOUT = new THREE.Vector3(4.9, 0, -7.2);
const ORB_CLIPS = { dormant: "Orb_Resting", idle: "Orb_Idle", attention: "Orb_Attention", listening: "Orb_Listening", thinking: "Orb_Thinking", speaking: "Orb_Speaking", guiding: "Orb_Guiding", reflecting: "Orb_Reflecting", calming: "Orb_Calming", privacy: "Orb_Privacy", warning: "Orb_Degraded", transition: "Orb_Transition" } as const;

type OrbState = keyof typeof ORB_CLIPS;
type Nearby = "orb" | "ground" | "life-map" | null;
type Props = { onOrbOpen?: () => void; webglAvailable?: boolean };

function terrainHeight(x: number, z: number) {
  const base = Math.sin(x * 0.12) * 0.2 + Math.cos(z * 0.1) * 0.17;
  const edge = Math.max(0, (Math.hypot(x * 0.78, z + 4) - 7.5) / 12);
  return base + edge * edge * 2.6 - 0.18;
}

function makeTerrain() {
  const geometry = new THREE.PlaneGeometry(70, 70, 180, 180);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < position.count; i += 1) position.setY(i, terrainHeight(position.getX(i), position.getZ(i)));
  geometry.computeVertexNormals();
  return geometry;
}

const TERRAIN = makeTerrain();

function prepared(source: THREE.Object3D, role: "sanctuary" | "orb") {
  const clone = source.clone(true);
  const rejected = /portal|ring|threshold|village|mannequin|avatar|debug|marker|label|embodied|presence|memory-place-anchor|living-growth/i;
  const rejectedForgeForms = /vault|monolith|bridge|grove|firefly|alcove|veil|waterfall|mountain|vegetation|tree|sculpture|beam|column/i;
  clone.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const name = object.name.toLowerCase();
    if (role === "sanctuary") object.visible = !rejected.test(name) && !rejectedForgeForms.test(name);
    if (!object.visible) return;
    object.castShadow = true;
    object.receiveShadow = true;
    if (role === "sanctuary") object.material = new THREE.MeshStandardMaterial({ color: /stone|path|ground|basin/.test(name) ? "#59655d" : "#45584d", roughness: 0.96, metalness: 0 });
  });
  return clone;
}

function WorldGeometry({ target }: { target: MutableRefObject<THREE.Vector3 | null> }) {
  const sanctuarySource = useGLTF(HOME_SANCTUARY_MODEL);
  const sanctuary = useMemo(() => prepared(sanctuarySource.scene, "sanctuary"), [sanctuarySource.scene]);
  const walk = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (useSceneStore.getState().inputLocked) return;
    target.current = new THREE.Vector3(THREE.MathUtils.clamp(event.point.x, HOME_BOUNDS.minX, HOME_BOUNDS.maxX), 0, THREE.MathUtils.clamp(event.point.z, HOME_BOUNDS.minZ, HOME_BOUNDS.maxZ));
  };
  return <group name="home-authored-terrain"><primitive object={sanctuary} /><mesh name="home-natural-terrain" geometry={TERRAIN} receiveShadow onClick={walk}><meshStandardMaterial color="#42644a" roughness={0.99} /></mesh><mesh name="home-walkable-navigation-surface" rotation={[-Math.PI/2,0,0]} position={[0,0.55,-2]} onClick={walk}><planeGeometry args={[25,28]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh></group>;
}

const FERNS = [[-7,-5,.85,-.3],[-6,-8,1.05,.7],[-5,-11,.9,1.8],[-3.8,-4,.74,-1.4],[-3,-9,1.12,2.3],[-2,-12,.9,.2],[2.4,-4,.8,.9],[3.3,-9,1.08,-.6],[4.2,-11,.9,1.4],[5.7,-5,.8,2.6],[6.5,-8,1.03,-1.8],[7.2,-11,.9,.4],[-8,1,.8,1.1],[-6,2.5,.75,-2.2],[6,2,.78,2],[8,.2,.86,-.8],[-4.5,4.2,.65,.4],[4.8,4.0,.68,-.7],[-2.7,2.7,.58,1.7],[2.9,2.9,.6,-1.4]] as const;
function Nature() {
  const source = useGLTF(HOME_FERN_MODEL);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: "#789d70", roughness: .94, side: THREE.DoubleSide }), []);
  useEffect(() => () => material.dispose(), [material]);
  const objects = useMemo(() => FERNS.map(([x,z,scale,yaw], i) => { const o = source.scene.clone(true); o.name=`home-scanned-fern-${i+1}`; o.position.set(x,terrainHeight(x,z),z); o.rotation.y=yaw; o.scale.setScalar(scale); o.traverse(c=>{ if(c instanceof THREE.Mesh){c.material=material;c.castShadow=true;c.receiveShadow=true;} }); return o; }), [source.scene, material]);
  return <group name="home-living-vegetation">{objects.map(o=><primitive key={o.name} object={o}/>)}</group>;
}

function AuthoredOrb({ onOpen, reducedMotion }: { onOpen: () => void; reducedMotion: boolean }) {
  const source = useGLTF(HOME_ORB_MODEL);
  const object = useMemo(() => { const o=prepared(source.scene,"orb"); o.scale.setScalar(.42); return o; }, [source.scene]);
  const root = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  useFrame(({clock}) => { if(reducedMotion) return; const breathe=1+Math.sin(clock.elapsedTime*.82)*.012; root.current?.scale.setScalar(breathe); if(light.current) light.current.intensity=.62+Math.sin(clock.elapsedTime*.82)*.06; });
  return <group ref={root} name="home-orb-sanctuary" position={ORB} onClick={e=>{e.stopPropagation();onOpen();}} userData={{geometryOwner:"urai-orb-avatar-v1.glb",primitiveSphere:false}}><primitive object={object}/><pointLight ref={light} color="#9ad1cb" intensity={.62} distance={5} decay={2}/></group>;
}

function Presence({ root }: { root: MutableRefObject<THREE.Group|null> }) { return <group ref={root} name="home-authored-embodied-self" position={SPAWN}><mesh position={[0,.01,.25]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[.32,32]}/><meshBasicMaterial color="#07100c" transparent opacity={.05} depthWrite={false}/></mesh></group>; }
function Landmarks({ onGround, onLifeMap }: { onGround:()=>void; onLifeMap:()=>void }) { return <><group name="home-ground-environmental-threshold" position={GROUND_THRESHOLD}><mesh position={[0,.7,0]} onClick={e=>{e.stopPropagation();onGround();}}><boxGeometry args={[3.8,2.4,3.8]}/><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false}/></mesh></group><group name="home-life-map-sky-lookout" position={LIFE_MAP_LOOKOUT}><mesh position={[0,.7,0]} onClick={e=>{e.stopPropagation();onLifeMap();}}><boxGeometry args={[3.8,2.4,3.8]}/><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false}/></mesh></group><group name="home-mountain-horizon"/><group name="home-sanctuary-pavilion"/><group name="home-sanctuary-path"/></>; }

function Rig({ input,yaw,pitch,target,avatar,onNearby,groundDescent,onGroundComplete,reducedMotion }: { input:MovementInput;yaw:MutableRefObject<number>;pitch:MutableRefObject<number>;target:MutableRefObject<THREE.Vector3|null>;avatar:MutableRefObject<THREE.Group|null>;onNearby:(n:Nearby)=>void;groundDescent:boolean;onGroundComplete:()=>void;reducedMotion:boolean }) {
  const {camera,size}=useThree(); const pos=useRef(SPAWN.clone()); const vel=useRef(new THREE.Vector3()); const last=useRef<Nearby>(null); const groundStart=useRef<number|null>(null); const groundDone=useRef(false); const ascentStart=useRef<number|null>(null); const ascentDone=useRef(false);
  const place=useCallback(()=>{const portrait=size.height>size.width;camera.position.copy(pos.current).add(new THREE.Vector3(0,portrait?1.62:1.7,.12));const f=new THREE.Vector3(Math.sin(yaw.current),0,-Math.cos(yaw.current));const l=pos.current.clone().addScaledVector(f,portrait?6.2:8.2);camera.lookAt(l.x,.9+pitch.current,l.z);},[camera,pitch,size.height,size.width,yaw]); useLayoutEffect(()=>place(),[place]);
  useFrame(({clock},delta)=>{const store=useSceneStore.getState(); if(groundDescent){if(groundStart.current===null)groundStart.current=clock.elapsedTime;const t=THREE.MathUtils.clamp((clock.elapsedTime-groundStart.current)/(reducedMotion?.45:2.8),0,1);camera.position.lerp(new THREE.Vector3(-3.8,-3.2,-13.7),.06);camera.lookAt(-4.8,-1,-13.2);store.setProgress(t);if(t>=1&&!groundDone.current){groundDone.current=true;onGroundComplete();}return;} groundStart.current=null;groundDone.current=false; if(store.phase==="ASCENT"){if(ascentStart.current===null)ascentStart.current=clock.elapsedTime;const t=THREE.MathUtils.clamp((clock.elapsedTime-ascentStart.current)/(reducedMotion?.45:3.6),0,1);camera.position.lerp(new THREE.Vector3(0,48,-57),.04);camera.lookAt(0,46,-76);store.setProgress(t);if(t>=1&&!ascentDone.current){ascentDone.current=true;requestUraiWorldTravel({destination:"life-map",href:"/life-map/?from=home-sky",entryPortal:"home-sky",cameraCheckpoint:"home-sky-ascent-complete"});}return;} ascentStart.current=null;ascentDone.current=false; stepEmbodiedMotion({delta,input,yaw:yaw.current,position:pos.current,velocity:vel.current,target,bounds:HOME_BOUNDS,speed:3.1,acceleration:9,deceleration:12});if(avatar.current){avatar.current.position.copy(pos.current);avatar.current.rotation.y=yaw.current;}place();const choices:readonly[Nearby,THREE.Vector3,number][]=[["orb",ORB,3.15],["ground",GROUND_THRESHOLD,2.55],["life-map",LIFE_MAP_LOOKOUT,2.55]];let next:Nearby=null,best=Infinity;for(const[n,p,r]of choices){const d=Math.hypot(pos.current.x-p.x,pos.current.z-p.z);if(d<r&&d<best){next=n;best=d;}}if(next!==last.current){last.current=next;onNearby(next);}}); return null;
}

function Scene({ input,yaw,pitch,target,avatar,onNearby,onOrb,onGround,onGroundComplete,onLifeMap,onReady,groundDescent,reducedMotion }: any) {
  const phase=useSceneStore(s=>s.phase); const cosmic=phase==="ASCENT"; const frames=useRef(0); useFrame(()=>{frames.current++;if(frames.current===5)onReady();});
  return <><color attach="background" args={[cosmic?"#01050b":"#203b3a"]}/><Stars radius={190} depth={90} count={cosmic?2500:90} factor={cosmic?2.8:.34} saturation={.1} fade speed={reducedMotion?0:.012}/><fogExp2 attach="fog" args={[cosmic?"#050b14":"#203b3a",cosmic?.0017:.018]}/><ambientLight intensity={cosmic?.12:.68} color="#d7e3da"/><hemisphereLight args={["#c8ddd5","#20301f",cosmic?.2:.96]}/><directionalLight position={[8,16,7]} intensity={cosmic?.32:2.1} color="#f0f4e9" castShadow/><WorldGeometry target={target}/><Nature/><AuthoredOrb onOpen={onOrb} reducedMotion={reducedMotion}/><Presence root={avatar}/><Landmarks onGround={onGround} onLifeMap={onLifeMap}/><Rig input={input} yaw={yaw} pitch={pitch} target={target} avatar={avatar} onNearby={onNearby} groundDescent={groundDescent} onGroundComplete={onGroundComplete} reducedMotion={reducedMotion}/>{!cosmic?<ContactShadows position={[0,-.08,-2.5]} opacity={.14} scale={28} blur={5} far={14} resolution={512} frames={1}/>:null}</>;
}

export function HomeWorldProductionV2({ onOrbOpen=requestUraiWorldOrbOpen, webglAvailable=true }: Props) {
  const [canvasReady,setCanvasReady]=useState(false),[sceneReady,setSceneReady]=useState(false),[nearby,setNearby]=useState<Nearby>(null),[dragging,setDragging]=useState(false),[reviewFixture,setReviewFixture]=useState("none"),[orbState,setOrbState]=useState<OrbState>("idle"),[groundDescent,setGroundDescent]=useState(false),[reducedMotion,setReducedMotion]=useState(false),[mobileControls,setMobileControls]=useState(false);
  const phase=useSceneStore(s=>s.phase),progress=useSceneStore(s=>s.progress),inputLocked=useSceneStore(s=>s.inputLocked); const yaw=useRef(0),pitch=useRef(-.045),target=useRef<THREE.Vector3|null>(null),avatar=useRef<THREE.Group|null>(null);
  const openOrb=useCallback(()=>{if(!useSceneStore.getState().inputLocked&&!groundDescent)onOrbOpen();},[groundDescent,onOrbOpen]); const startGround=useCallback(()=>{if(useSceneStore.getState().inputLocked||groundDescent)return;target.current=null;setOrbState("transition");setGroundDescent(true);},[groundDescent]); const finishGround=useCallback(()=>requestUraiWorldTravel({destination:"infrastructure-hub",href:"/ground/",entryPortal:"home-ground",cameraCheckpoint:"home-ground-descent"}),[]); const startLife=useCallback(()=>{const s=useSceneStore.getState();if(s.inputLocked||groundDescent||s.phase==="ASCENT")return;target.current=null;setOrbState("transition");s.enterLifeMap();},[groundDescent]);
  const interact=useCallback(()=>{if(nearby==="orb")openOrb();else if(nearby==="ground")startGround();else if(nearby==="life-map")startLife();},[nearby,openOrb,startGround,startLife]); const input=useMovementInput({enabled:!groundDescent,onInteract:interact,onReset:()=>{yaw.current=0;pitch.current=-.045;target.current=SPAWN.clone();}}); const look=useDragLook({yaw,pitch,enabled:!groundDescent&&phase!=="ASCENT",sensitivity:.0031,minPitch:-.55,maxPitch:.68,onDragState:setDragging});
  useEffect(()=>{const q=new URLSearchParams(window.location.search);setReviewFixture(q.get("homePrivateFixture")==="1"?"safe-private":"none");const state=q.get("homeOrbState");if(state&&state in ORB_CLIPS)setOrbState(state as OrbState);const r=window.matchMedia("(prefers-reduced-motion: reduce)"),m=window.matchMedia("(pointer: coarse), (max-width: 700px)");const apply=()=>{setReducedMotion(r.matches);setMobileControls(m.matches);};apply();r.addEventListener?.("change",apply);m.addEventListener?.("change",apply);return()=>{r.removeEventListener?.("change",apply);m.removeEventListener?.("change",apply);};},[]);
  if(!webglAvailable)return null; const ready=canvasReady&&sceneReady,transitioning=phase==="ASCENT"||groundDescent; const context=phase==="ASCENT"?"Ascending through the sky":groundDescent?"Descending into Ground":nearby==="orb"?"The Orb is here":nearby==="ground"?"The path descends":nearby==="life-map"?"Look to the sky":null;
  return <main className={`${styles.world} urai-asset-home-world`} data-urai-home-production data-urai-true-3d="true" data-home-primary-owner="asset-driven" data-home-real-world-first="true" data-home-visible-world="authored-coherent-three-dimensional-sanctuary" data-home-world-character="believable-natural-inhabitable-environment" data-home-visible-portals="false" data-home-transition-affordances="ground-environmental-descent life-map-sky-lookout" data-home-provider-environment={HOME_PROVIDER_ENVIRONMENT} data-home-provider-role="atmospheric-support-only" data-home-generated-scenery="suppressed" data-home-physical-base="authored-coherent-world" data-home-visual-ownership="three-dimensional-geometry" data-home-desktop-mobile-world="same-scene" data-home-embodied-self="privacy-preserving-shadow" data-home-movement="walk-keyboard-click-touch" data-home-pointer-lock="false" data-home-audio="production-opus-consent-controlled" data-home-assets-ready={ready?"true":"false"} data-home-runtime-assets="home-entry-chamber-v1.glb polyhaven-fern-02-geometry-v1.glb urai-orb-avatar-v1.glb local-three-dimensional-terrain" data-home-authored-regions="home-sanctuary-geometry home-mountain-horizon home-living-vegetation home-reflecting-water" data-home-nearby={nearby??"none"} data-home-camera-mode={groundDescent?"descent":phase==="ASCENT"?"ascent":dragging?"look":"embodied-first-person"} data-home-scene-phase={groundDescent?"GROUND_DESCENT":phase} data-home-ascent-progress={phase==="ASCENT"?progress.toFixed(3):"0.000"} data-home-input-locked={transitioning||inputLocked?"true":"false"} data-home-portal-sequence={groundDescent?"ground:traversal":phase==="ASCENT"?"life-map:traversal":"idle"} data-home-portal-lifecycle="environmental-approach-traversal-arrival" data-home-review-fixture={reviewFixture} data-home-orb-state={orbState} data-home-orb-clip={ORB_CLIPS[orbState]} data-home-animation-owner="owned-sanctuary-cc0-nature-authored-orb" data-testid="home-visible-navigable-sanctuary-world" style={{position:"relative",overflow:"hidden",background:"#203b3a"}} {...look}><div style={{position:"absolute",inset:0,zIndex:1}}><Canvas className={styles.canvas} dpr={[1,1.3]} shadows camera={{position:[0,1.7,8],fov:50,near:.05,far:300}} gl={{antialias:true,alpha:false,powerPreference:"high-performance"}} onCreated={({gl})=>{gl.outputColorSpace=THREE.SRGBColorSpace;gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=1.08;gl.shadowMap.type=THREE.PCFSoftShadowMap;gl.setClearColor(0x203b3a,1);setCanvasReady(true);}}><Scene input={input} yaw={yaw} pitch={pitch} target={target} avatar={avatar} onNearby={setNearby} onOrb={openOrb} onGround={startGround} onGroundComplete={finishGround} onLifeMap={startLife} onReady={()=>setSceneReady(true)} groundDescent={groundDescent} reducedMotion={reducedMotion}/></Canvas></div><header className={styles.brand} aria-label="URAI" style={{zIndex:3}}><strong>URAI</strong></header>{context?<div className={`${styles.worldHint} home-world-context`} data-home-world-context data-home-world-context-for={nearby??phase} role="status" aria-live="polite" style={{zIndex:3}}>{context}</div>:null}{!transitioning&&mobileControls?<MobileMovementPad input={input} label="Home movement controls"/>:null}<span className="sr-only" data-testid="urai-home-webgl-orb">The authored Orb companion is physically present in the Home environment.</span><span className="sr-only" data-testid="urai-home-embodied-avatar">Your privacy-preserving embodied presence is represented without fabricating personal identity.</span></main>;
}
