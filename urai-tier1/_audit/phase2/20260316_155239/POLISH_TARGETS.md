# Phase 2 Visual Targets

Timestamp: 20260316_155239

Files present:
src/app/favicon.ico
src/app/globals.css
src/app/layout.tsx
src/app/page.tsx
src/spatial/components/CameraRig.tsx
src/spatial/core/SceneController.tsx
src/spatial/data/memoryDataset.ts
src/spatial/data/stars.ts
src/spatial/replay/replayBootstrap.tsx
src/spatial/replay/replayConstants.ts
src/spatial/replay/replayModel.ts
src/spatial/replay/ReplayOverlay.tsx
src/spatial/scene/Ground.tsx
src/spatial/scene/MemorySphere.tsx
src/spatial/scene/SpatialScene.tsx
src/spatial/scene/SpatialScene.tsx.broken.20260316-135713
src/spatial/scene/Starfield.tsx
src/spatial/scene/Starfield.tsx.bak.20260316-155137
src/spatial/state/sceneStore.ts
src/spatial/state/selectedStarContract.ts
src/spatial/state/toCanonicalSelectedStar.ts
src/spatial/utils/seededRandom.ts

Likely polish hooks:
src/app/globals.css:60:  opacity: 0.98;
src/app/globals.css:84:  backdrop-filter: blur(14px);
src/app/globals.css:94:    opacity 140ms ease;
src/app/globals.css:114:    opacity: 0.68;
src/app/globals.css:118:    opacity: 0.94;
src/app/globals.css:132:  opacity: 0.92;
src/app/globals.css:138:  backdrop-filter: blur(18px);
src/app/globals.css:154:  opacity: 0.98;
src/spatial/data/memoryDataset.ts:1:import { toCanonicalSelectedStar } from "../state/toCanonicalSelectedStar";
src/spatial/data/memoryDataset.ts:45:      "Once it had a name, it stopped being fog. It became something I could return to, refine, and build around.",
src/spatial/data/memoryDataset.ts:268:    tags: ["viewport", "clarity", "user"],
src/spatial/data/stars.ts:1:import { toCanonicalSelectedStar } from "../state/toCanonicalSelectedStar";
src/spatial/state/toCanonicalSelectedStar.ts:1:import type { SelectedStar } from "./sceneStore";
src/spatial/state/toCanonicalSelectedStar.ts:3:type StarInput = Partial<SelectedStar> & {
src/spatial/state/toCanonicalSelectedStar.ts:43:export function toCanonicalSelectedStar(input: StarInput | null): SelectedStar | null {
src/spatial/state/sceneStore.ts:2:import { toCanonicalSelectedStar } from "./toCanonicalSelectedStar";
src/spatial/state/sceneStore.ts:6:export type SelectedStar = {
src/spatial/state/sceneStore.ts:25:  selectedStar: SelectedStar | null;
src/spatial/state/sceneStore.ts:30:  setSelectedStar: (star: SelectedStar | null) => void;
src/spatial/state/sceneStore.ts:35:  enterFocus: (star?: SelectedStar | null) => void;
src/spatial/state/sceneStore.ts:36:  focusStar: (star: SelectedStar | null) => void;
src/spatial/state/sceneStore.ts:67:  setSelectedStar: (selectedStar) =>
src/spatial/state/sceneStore.ts:69:      selectedStar: toCanonicalSelectedStar(selectedStar),
src/spatial/state/sceneStore.ts:96:      const nextStar = toCanonicalSelectedStar(nextStarRaw);
src/spatial/state/sceneStore.ts:107:      const nextStar = toCanonicalSelectedStar(star);
src/spatial/state/selectedStarContract.ts:1:import type { SelectedStar } from "./sceneStore";
src/spatial/state/selectedStarContract.ts:3:export type SelectedStarNormalized = SelectedStar;
src/spatial/state/selectedStarContract.ts:5:export function normalizeSelectedStar(
src/spatial/state/selectedStarContract.ts:6:  selectedStar: SelectedStar | null
src/spatial/state/selectedStarContract.ts:7:): SelectedStarNormalized | null {
src/spatial/core/SceneController.tsx:7:  const { mode, setMode, setSelectedStar } = useSceneStore();
src/spatial/core/SceneController.tsx:18:        setSelectedStar(null);
src/spatial/core/SceneController.tsx:25:  }, [mode, setMode, setSelectedStar]);
src/spatial/replay/replayConstants.ts:2:export const REPLAY_OVERLAY_HOST_ID = "urai-replay-overlay-root";
src/spatial/replay/ReplayOverlay.tsx:30:  borderRadius: 999,
src/spatial/replay/ReplayOverlay.tsx:36:  backdropFilter: "blur(14px)",
src/spatial/replay/ReplayOverlay.tsx:38:  boxShadow: "0 14px 40px rgba(0,0,0,0.30)",
src/spatial/replay/ReplayOverlay.tsx:41:const overlayStyle: React.CSSProperties = {
src/spatial/replay/ReplayOverlay.tsx:54:  borderRadius: 28,
src/spatial/replay/ReplayOverlay.tsx:59:  boxShadow: "0 24px 90px rgba(0,0,0,0.46)",
src/spatial/replay/ReplayOverlay.tsx:61:  backdropFilter: "blur(18px)",
src/spatial/replay/ReplayOverlay.tsx:86:  borderRadius: 999,
src/spatial/replay/ReplayOverlay.tsx:110:  borderRadius: 22,
src/spatial/replay/ReplayOverlay.tsx:126:  opacity: 0.9,
src/spatial/replay/ReplayOverlay.tsx:275:      <div style={overlayStyle} onClick={() => exitReplayToFocus()}>
src/spatial/replay/ReplayOverlay.tsx:295:                    borderRadius: 999,
src/spatial/replay/ReplayOverlay.tsx:297:                    opacity: idx === stepIndex ? 1 : 0.45,
src/spatial/replay/ReplayOverlay.tsx:298:                    boxShadow: idx === stepIndex ? `0 0 22px ${glow}` : "none",
src/spatial/replay/replayModel.ts:1:import type { SelectedStar } from "../state/sceneStore";
src/spatial/replay/replayModel.ts:11:  selectedStar: SelectedStar | null
src/spatial/replay/replayModel.ts:37:export function getReplayGlow(selectedStar: SelectedStar | null) {
src/spatial/replay/replayModel.ts:41:export function getReplayMeta(selectedStar: SelectedStar | null) {
src/spatial/scene/MemorySphere.tsx:8:  const opacity = mode === "lifemap" ? 0.1 : 0.2;
src/spatial/scene/MemorySphere.tsx:16:        opacity={opacity}
src/spatial/scene/SpatialScene.tsx.broken.20260316-135713:2:import { toCanonicalSelectedStar } from "../state/toCanonicalSelectedStar";
src/spatial/scene/SpatialScene.tsx.broken.20260316-135713:4:import { Canvas, ThreeEvent, useFrame, useThree } from "@react-three/fiber";
src/spatial/scene/SpatialScene.tsx.broken.20260316-135713:7:import { SelectedStar, useSceneStore } from "../state/sceneStore";
src/spatial/scene/SpatialScene.tsx.broken.20260316-135713:16:const shellButtonStyle: CSSProperties = {
src/spatial/scene/SpatialScene.tsx.broken.20260316-135713:19:  borderRadius: 12,
src/spatial/scene/SpatialScene.tsx.broken.20260316-135713:27:  backdropFilter: "blur(20px)",
src/spatial/scene/SpatialScene.tsx.broken.20260316-135713:28:  boxShadow: "0 6px 18px rgba(0,0,0,0.22)",
src/spatial/scene/SpatialScene.tsx.broken.20260316-135713:40:function buildStars(): SelectedStar[] {
src/spatial/scene/SpatialScene.tsx.broken.20260316-135713:42:  const out: SelectedStar[] = [];
src/spatial/scene/SpatialScene.tsx.broken.20260316-135713:74:function CameraRig() {
src/spatial/scene/SpatialScene.tsx.broken.20260316-135713:81:  useFrame((_, delta) => {
src/spatial/scene/SpatialScene.tsx.broken.20260316-135713:98:    camera.position.lerp(target, t);
src/spatial/scene/SpatialScene.tsx.broken.20260316-135713:106:function Atmosphere() {
src/spatial/scene/SpatialScene.tsx.broken.20260316-135713:110:  useFrame(({ clock }) => {
src/spatial/scene/SpatialScene.tsx.broken.20260316-135713:120:      <fog attach="fog" args={["#030712", 140, 420]} />
src/spatial/scene/SpatialScene.tsx.broken.20260316-135713:126:        <meshBasicMaterial color="#0b2b68" transparent opacity={0.14} />
src/spatial/scene/SpatialScene.tsx.broken.20260316-135713:132:function FloorPlane() {
src/spatial/scene/SpatialScene.tsx.broken.20260316-135713:141:function SpatialStar({ star }: { star: SelectedStar }) {
src/spatial/scene/SpatialScene.tsx.broken.20260316-135713:150:  useFrame(({ clock }) => {
src/spatial/scene/SpatialScene.tsx.broken.20260316-135713:175:function StarField() {
src/spatial/scene/SpatialScene.tsx.broken.20260316-135713:236:            borderRadius: 16,
src/spatial/scene/SpatialScene.tsx.broken.20260316-135713:239:            boxShadow: "0 12px 28px rgba(0,0,0,0.28)",
src/spatial/scene/SpatialScene.tsx.broken.20260316-135713:240:            backdropFilter: "blur(14px)",
src/spatial/scene/SpatialScene.tsx.broken.20260316-135713:243:          <div style={{ fontSize: 12, opacity: 0.72, fontWeight: 700, letterSpacing: "0.12em" }}>URAI TIER 2</div>
src/spatial/scene/SpatialScene.tsx.broken.20260316-135713:245:          <div style={{ marginTop: 8, fontSize: 14, opacity: 0.86 }}>
src/spatial/scene/SpatialScene.tsx.broken.20260316-135713:254:          <button style={shellButtonStyle} onClick={enterHome}>Home</button>
src/spatial/scene/SpatialScene.tsx.broken.20260316-135713:255:          <button style={shellButtonStyle} onClick={enterLifeMap}>LifeMap</button>
src/spatial/scene/SpatialScene.tsx.broken.20260316-135713:256:          <button style={shellButtonStyle} onClick={clearFocus}>Clear Focus</button>
src/spatial/scene/SpatialScene.tsx.broken.20260316-135713:258:            <button style={shellButtonStyle} onClick={enterReplay}>Replay</button>
src/spatial/scene/SpatialScene.tsx.broken.20260316-135713:271:            borderRadius: 18,
src/spatial/scene/SpatialScene.tsx.broken.20260316-135713:274:            boxShadow: "0 18px 36px rgba(0,0,0,0.32)",
src/spatial/scene/SpatialScene.tsx.broken.20260316-135713:275:            backdropFilter: "blur(14px)",
src/spatial/scene/SpatialScene.tsx.broken.20260316-135713:279:          <div style={{ fontSize: 12, opacity: 0.68, letterSpacing: "0.12em", fontWeight: 700 }}>SELECTED STAR</div>
src/spatial/scene/SpatialScene.tsx.broken.20260316-135713:281:          <div style={{ marginTop: 6, fontSize: 15, opacity: 0.9 }}>{selectedStar.label}</div>
src/spatial/scene/SpatialScene.tsx.broken.20260316-135713:307:          borderRadius: 999,
src/spatial/scene/SpatialScene.tsx.broken.20260316-135713:310:          boxShadow: "0 10px 24px rgba(0,0,0,0.24)",
src/spatial/scene/SpatialScene.tsx.broken.20260316-135713:341:      <Canvas
src/spatial/scene/SpatialScene.tsx.broken.20260316-135713:349:        <fog attach="fog" args={["#020712", 22, 260]} />
src/spatial/scene/SpatialScene.tsx.broken.20260316-135713:354:          <meshBasicMaterial color="#05101d" transparent opacity={0.32} depthWrite={false} />
src/spatial/scene/SpatialScene.tsx.broken.20260316-135713:363:                opacity=
src/spatial/scene/SpatialScene.tsx.broken.20260316-135713:364:        <Atmosphere />
src/spatial/scene/SpatialScene.tsx.broken.20260316-135713:365:        <CameraRig />
src/spatial/scene/SpatialScene.tsx.broken.20260316-135713:366:        <FloorPlane />
src/spatial/scene/SpatialScene.tsx.broken.20260316-135713:367:        <StarField />
src/spatial/scene/SpatialScene.tsx.broken.20260316-135713:368:      </Canvas>
src/spatial/scene/SpatialScene.tsx:2:import { toCanonicalSelectedStar } from "../state/toCanonicalSelectedStar";
src/spatial/scene/SpatialScene.tsx:4:import { Canvas, ThreeEvent, useFrame, useThree } from "@react-three/fiber";
src/spatial/scene/SpatialScene.tsx:7:import { SelectedStar, useSceneStore } from "../state/sceneStore";
src/spatial/scene/SpatialScene.tsx:16:const shellButtonStyle: CSSProperties = {
src/spatial/scene/SpatialScene.tsx:19:  borderRadius: 12,
src/spatial/scene/SpatialScene.tsx:27:  backdropFilter: "blur(20px)",
src/spatial/scene/SpatialScene.tsx:28:  boxShadow: "0 6px 18px rgba(0,0,0,0.22)",
src/spatial/scene/SpatialScene.tsx:40:function buildStars(): SelectedStar[] {
src/spatial/scene/SpatialScene.tsx:42:  const out: SelectedStar[] = [];
src/spatial/scene/SpatialScene.tsx:74:function CameraRig() {
src/spatial/scene/SpatialScene.tsx:81:  useFrame((_, delta) => {
src/spatial/scene/SpatialScene.tsx:98:    camera.position.lerp(target, t);
src/spatial/scene/SpatialScene.tsx:106:function Atmosphere() {
src/spatial/scene/SpatialScene.tsx:110:  useFrame(({ clock }) => {
src/spatial/scene/SpatialScene.tsx:120:      <fog attach="fog" args={["#030712", 140, 420]} />
src/spatial/scene/SpatialScene.tsx:126:        <meshBasicMaterial color="#0b2b68" transparent opacity={0.14} />
src/spatial/scene/SpatialScene.tsx:132:function FloorPlane() {
src/spatial/scene/SpatialScene.tsx:141:function SpatialStar({ star }: { star: SelectedStar }) {
src/spatial/scene/SpatialScene.tsx:150:  useFrame(({ clock }) => {
src/spatial/scene/SpatialScene.tsx:175:function StarField() {
src/spatial/scene/SpatialScene.tsx:236:            borderRadius: 16,
src/spatial/scene/SpatialScene.tsx:239:            boxShadow: "0 12px 28px rgba(0,0,0,0.28)",
src/spatial/scene/SpatialScene.tsx:240:            backdropFilter: "blur(14px)",
src/spatial/scene/SpatialScene.tsx:243:          <div style={{ fontSize: 12, opacity: 0.72, fontWeight: 700, letterSpacing: "0.12em" }}>URAI TIER 2</div>
src/spatial/scene/SpatialScene.tsx:245:          <div style={{ marginTop: 8, fontSize: 14, opacity: 0.86 }}>
src/spatial/scene/SpatialScene.tsx:254:          <button style={shellButtonStyle} onClick={enterHome}>Home</button>
src/spatial/scene/SpatialScene.tsx:255:          <button style={shellButtonStyle} onClick={enterLifeMap}>LifeMap</button>
src/spatial/scene/SpatialScene.tsx:256:          <button style={shellButtonStyle} onClick={clearFocus}>Clear Focus</button>
src/spatial/scene/SpatialScene.tsx:258:            <button style={shellButtonStyle} onClick={enterReplay}>Replay</button>
src/spatial/scene/SpatialScene.tsx:261:            <button style={shellButtonStyle} onClick={exitReplayToFocus}>Exit Replay</button>
src/spatial/scene/SpatialScene.tsx:274:            borderRadius: 18,
src/spatial/scene/SpatialScene.tsx:277:            boxShadow: "0 18px 36px rgba(0,0,0,0.32)",
src/spatial/scene/SpatialScene.tsx:278:            backdropFilter: "blur(14px)",
src/spatial/scene/SpatialScene.tsx:282:          <div style={{ fontSize: 12, opacity: 0.68, letterSpacing: "0.12em", fontWeight: 700 }}>SELECTED STAR</div>
src/spatial/scene/SpatialScene.tsx:284:          <div style={{ marginTop: 6, fontSize: 15, opacity: 0.9 }}>{selectedStar.label}</div>
src/spatial/scene/SpatialScene.tsx:310:          borderRadius: 999,
src/spatial/scene/SpatialScene.tsx:313:          boxShadow: "0 10px 24px rgba(0,0,0,0.24)",
src/spatial/scene/SpatialScene.tsx:344:      <Canvas
src/spatial/scene/SpatialScene.tsx:350:        <fog attach="fog" args={["#030712", 26, 240]} />
src/spatial/scene/SpatialScene.tsx:355:          <meshBasicMaterial color="#06101f" transparent opacity={0.30} depthWrite={false} />
src/spatial/scene/SpatialScene.tsx:357:        <Atmosphere />
src/spatial/scene/SpatialScene.tsx:358:        <CameraRig />
src/spatial/scene/SpatialScene.tsx:359:        <FloorPlane />
src/spatial/scene/SpatialScene.tsx:360:        <StarField />
src/spatial/scene/SpatialScene.tsx:361:      </Canvas>
src/spatial/scene/Starfield.tsx:2:import { toCanonicalSelectedStar } from "../state/toCanonicalSelectedStar";
src/spatial/scene/Starfield.tsx:12:  const setSelectedStar = useSceneStore((s) => s.setSelectedStar);
src/spatial/scene/Starfield.tsx:32:                <meshBasicMaterial color={star.color} transparent opacity={0.12} />
src/spatial/scene/Starfield.tsx:52:                setSelectedStar({
src/spatial/scene/Starfield.tsx:72:              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
src/spatial/scene/Starfield.tsx:78:            <meshBasicMaterial color={star.color} transparent opacity={0.10} depthWrite={false} />
src/spatial/scene/Starfield.tsx.bak.20260316-155137:2:import { toCanonicalSelectedStar } from "../state/toCanonicalSelectedStar";
src/spatial/scene/Starfield.tsx.bak.20260316-155137:12:  const setSelectedStar = useSceneStore((s) => s.setSelectedStar);
src/spatial/scene/Starfield.tsx.bak.20260316-155137:34:                <meshBasicMaterial color={star.color} transparent opacity={0.12} />
src/spatial/scene/Starfield.tsx.bak.20260316-155137:54:                setSelectedStar({
src/spatial/scene/Starfield.tsx.bak.20260316-155137:74:              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
src/spatial/scene/Starfield.tsx.bak.20260316-155137:80:            <meshBasicMaterial color={star.color} transparent opacity={0.10} depthWrite={false} />
src/spatial/scene/Ground.tsx:14:        opacity: 0.09,
src/spatial/scene/Ground.tsx:23:        opacity: 0.05,
src/spatial/scene/Ground.tsx:31:      opacity: 0.03,
src/spatial/scene/Ground.tsx:42:        opacity={config.opacity}
src/spatial/components/CameraRig.tsx:4:import { useFrame, useThree } from "@react-three/fiber";
src/spatial/components/CameraRig.tsx:18:export default function CameraRig() {
src/spatial/components/CameraRig.tsx:44:  useFrame((state, delta) => {
src/spatial/components/CameraRig.tsx:93:    posRef.current.lerp(desiredPos, smooth(delta, positionSpeed));
src/spatial/components/CameraRig.tsx:94:    lookRef.current.lerp(desiredLook, smooth(delta, lookSpeed));
