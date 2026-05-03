"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

type URAISpatialContinuityIdentityLockProps = {
  phase?: unknown;
};

type StoredObjectState = {
  scale: THREE.Vector3;
  visible: boolean;
  opacities: number[];
  transparent: boolean[];
  depthWrite: boolean[];
};

function normalizePhase(value: unknown): string {
  if (typeof value === "string") return value.toUpperCase();

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["phase", "current", "value", "state", "name", "id"]) {
      const candidate = record[key];
      if (typeof candidate === "string") return candidate.toUpperCase();
    }
  }

  return String(value ?? "").toUpperCase();
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function smoothstep(value: number) {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function getSignature(object: THREE.Object3D) {
  const parts: string[] = [];
  let current: THREE.Object3D | null = object;

  while (current) {
    if (current.name) parts.push(current.name);
    const data = current.userData as Record<string, unknown>;
    for (const key of ["phase", "kind", "type", "role", "id"]) {
      const value = data[key];
      if (typeof value === "string") parts.push(value);
    }
    current = current.parent;
  }

  return parts.join(" ").toLowerCase();
}

function isProtectedHomeOrSystemObject(signature: string) {
  return /home|origin|ground|surface|terrain|sky|cloud|atmos|horizon|camera|light|narrator|agent|ui|debug|proof/.test(signature);
}

function isMemoryObjectCandidate(object: THREE.Object3D, worldPosition: THREE.Vector3) {
  if ((object as THREE.Points).isPoints) return false;
  if (!(object as THREE.Mesh).isMesh) return false;

  const signature = getSignature(object);
  if (isProtectedHomeOrSystemObject(signature)) return false;

  if (/lifemap|life-map|memory|focus|replay|node|target|glyph|constellation|chapter|selection|selected|orb/.test(signature)) {
    return worldPosition.z < -18;
  }

  const mesh = object as THREE.Mesh;
  const geometryType = mesh.geometry?.type?.toLowerCase?.() ?? "";

  if (/sphere|circle|ring|plane|torus/.test(geometryType) && worldPosition.z < -28) {
    return true;
  }

  return worldPosition.z < -52;
}

function toMaterials(material: THREE.Material | THREE.Material[] | undefined) {
  if (!material) return [];
  return Array.isArray(material) ? material : [material];
}

function storeState(object: THREE.Object3D, store: WeakMap<THREE.Object3D, StoredObjectState>) {
  const existing = store.get(object);
  if (existing) return existing;

  const mesh = object as THREE.Mesh;
  const materials = toMaterials(mesh.material as THREE.Material | THREE.Material[] | undefined);

  const state: StoredObjectState = {
    scale: object.scale.clone(),
    visible: object.visible,
    opacities: materials.map((material) => typeof material.opacity === "number" ? material.opacity : 1),
    transparent: materials.map((material) => Boolean(material.transparent)),
    depthWrite: materials.map((material) => typeof material.depthWrite === "boolean" ? material.depthWrite : true),
  };

  store.set(object, state);
  return state;
}

function applyGate(object: THREE.Object3D, state: StoredObjectState, opacityMultiplier: number, scaleMultiplier: number) {
  object.visible = true;
  object.scale.set(
    state.scale.x * scaleMultiplier,
    state.scale.y * scaleMultiplier,
    state.scale.z * scaleMultiplier
  );

  const mesh = object as THREE.Mesh;
  const materials = toMaterials(mesh.material as THREE.Material | THREE.Material[] | undefined);

  materials.forEach((material, index) => {
    material.transparent = true;
    material.depthWrite = false;
    material.opacity = (state.opacities[index] ?? 1) * opacityMultiplier;
    material.needsUpdate = true;
  });
}

function restore(object: THREE.Object3D, state: StoredObjectState) {
  object.visible = state.visible;
  object.scale.copy(state.scale);

  const mesh = object as THREE.Mesh;
  const materials = toMaterials(mesh.material as THREE.Material | THREE.Material[] | undefined);

  materials.forEach((material, index) => {
    material.opacity = state.opacities[index] ?? 1;
    material.transparent = state.transparent[index] ?? material.transparent;
    material.depthWrite = state.depthWrite[index] ?? material.depthWrite;
    material.needsUpdate = true;
  });
}

const NON_HOME_PHASES = new Set(["ASCENT", "LIFEMAP", "FOCUS", "REPLAY"]);
const HOME_RETURN_LAST_MILE_SECONDS = 3.45;

export function URAISpatialContinuityIdentityLock({ phase }: URAISpatialContinuityIdentityLockProps) {
  const phaseName = normalizePhase(phase);

  const previousPhaseRef = useRef("");
  const phaseElapsedRef = useRef(0);
  const homeReturnElapsedRef = useRef(HOME_RETURN_LAST_MILE_SECONDS + 1);

  const worldPositionRef = useRef(new THREE.Vector3());
  const storedStatesRef = useRef(new WeakMap<THREE.Object3D, StoredObjectState>());
  const gatedObjectsRef = useRef(new Set<THREE.Object3D>());

  const homeGroupRef = useRef<THREE.Group | null>(null);
  const homeShellRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const homeGroundRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const homeHorizonRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const homeFogRef = useRef<THREE.MeshBasicMaterial | null>(null);

  const focusGroupRef = useRef<THREE.Group | null>(null);
  const focusShellRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const focusAnchorRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const focusHaloRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const focusMaskRef = useRef<THREE.MeshBasicMaterial | null>(null);

  const replayGroupRef = useRef<THREE.Group | null>(null);
  const replayShellRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const replayBackRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const replayFloorRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const replayVeilRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const replayMaskRef = useRef<THREE.MeshBasicMaterial | null>(null);

  const focusGlyph = useMemo(() => new THREE.IcosahedronGeometry(2.4, 1), []);
  const focusHalo = useMemo(() => new THREE.TorusGeometry(8.8, 0.055, 16, 160), []);
  const replayArch = useMemo(() => new THREE.SphereGeometry(39, 96, 48), []);

  useFrame(({ scene }, delta) => {
    const dt = Math.min(Math.max(delta, 0), 1 / 20);
    const previousPhase = previousPhaseRef.current;

    if (previousPhase !== phaseName) {
      previousPhaseRef.current = phaseName;
      phaseElapsedRef.current = 0;

      if (phaseName === "HOME" && NON_HOME_PHASES.has(previousPhase)) {
        homeReturnElapsedRef.current = 0;
      } else if (phaseName !== "HOME") {
        homeReturnElapsedRef.current = HOME_RETURN_LAST_MILE_SECONDS + 1;
      }
    } else {
      phaseElapsedRef.current += dt;
    }

    if (phaseName === "HOME") {
      homeReturnElapsedRef.current += dt;
    }

    const isHomeReturn = phaseName === "HOME" && homeReturnElapsedRef.current <= HOME_RETURN_LAST_MILE_SECONDS;
    const returnT = smoothstep(homeReturnElapsedRef.current / HOME_RETURN_LAST_MILE_SECONDS);
    const returnOpacity = isHomeReturn ? 1 - returnT : 0;
    const returnResolve = isHomeReturn ? smoothstep(homeReturnElapsedRef.current / 1.45) : 0;

    if (homeGroupRef.current) {
      homeGroupRef.current.visible = isHomeReturn;
      homeGroupRef.current.scale.setScalar(0.78 + 0.24 * returnResolve);
    }

    if (homeShellRef.current) homeShellRef.current.opacity = 0.42 * returnOpacity;
    if (homeGroundRef.current) homeGroundRef.current.opacity = 0.34 * returnOpacity;
    if (homeHorizonRef.current) homeHorizonRef.current.opacity = 0.3 * returnOpacity;
    if (homeFogRef.current) homeFogRef.current.opacity = 0.22 * returnOpacity;

    const ascentReveal = phaseName === "ASCENT"
      ? smoothstep((phaseElapsedRef.current - 2.85) / 3.1)
      : 1;

    const shouldGateMemory = phaseName === "ASCENT" && ascentReveal < 0.995;

    if (shouldGateMemory) {
      const opacityMultiplier = 0.012 + 0.988 * ascentReveal;
      const scaleMultiplier = 0.1 + 0.9 * ascentReveal;

      scene.traverse((object) => {
        object.getWorldPosition(worldPositionRef.current);
        if (!isMemoryObjectCandidate(object, worldPositionRef.current)) return;

        const state = storeState(object, storedStatesRef.current);
        gatedObjectsRef.current.add(object);
        applyGate(object, state, opacityMultiplier, scaleMultiplier);
      });
    } else if (gatedObjectsRef.current.size > 0) {
      for (const object of gatedObjectsRef.current) {
        const state = storedStatesRef.current.get(object);
        if (state) restore(object, state);
      }
      gatedObjectsRef.current.clear();
    }

    const focusActive = phaseName === "FOCUS";
    const replayActive = phaseName === "REPLAY";

    if (focusGroupRef.current) focusGroupRef.current.visible = focusActive;
    if (replayGroupRef.current) replayGroupRef.current.visible = replayActive;

    const focusIn = focusActive ? smoothstep(phaseElapsedRef.current / 0.55) : 0;
    const replayIn = replayActive ? smoothstep(phaseElapsedRef.current / 0.65) : 0;

    if (focusShellRef.current) focusShellRef.current.opacity = 0.36 * focusIn;
    if (focusAnchorRef.current) focusAnchorRef.current.opacity = 0.94 * focusIn;
    if (focusHaloRef.current) focusHaloRef.current.opacity = 0.58 * focusIn;
    if (focusMaskRef.current) focusMaskRef.current.opacity = 0.2 * focusIn;

    if (replayShellRef.current) replayShellRef.current.opacity = 0.42 * replayIn;
    if (replayBackRef.current) replayBackRef.current.opacity = 0.38 * replayIn;
    if (replayFloorRef.current) replayFloorRef.current.opacity = 0.44 * replayIn;
    if (replayVeilRef.current) replayVeilRef.current.opacity = 0.24 * replayIn;
    if (replayMaskRef.current) replayMaskRef.current.opacity = 0.24 * replayIn;
  });

  return (
    <>
      <group
        ref={homeGroupRef}
        name="URAI_HOME_RETURN_LAST_MILE_CONTINUITY_V58"
        renderOrder={62}
        visible={false}
      >
        <mesh position={[0, 20, -126]} scale={[1.65, 1.0, 1.65]}>
          <sphereGeometry args={[88, 80, 40]} />
          <meshBasicMaterial
            ref={homeShellRef}
            color="#29164e"
            transparent
            opacity={0}
            depthWrite={false}
            depthTest={false}
            fog={false}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        <mesh position={[0, 10.5, -96]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[18, 140, 192]} />
          <meshBasicMaterial
            ref={homeGroundRef}
            color="#553199"
            transparent
            opacity={0}
            depthWrite={false}
            depthTest={false}
            fog={false}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        <mesh position={[0, 13.5, -128]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[74, 210, 224]} />
          <meshBasicMaterial
            ref={homeHorizonRef}
            color="#7a56f0"
            transparent
            opacity={0}
            depthWrite={false}
            depthTest={false}
            fog={false}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        <mesh position={[0, 19, -112]} scale={[1.6, 0.55, 1.6]}>
          <sphereGeometry args={[96, 64, 32]} />
          <meshBasicMaterial
            ref={homeFogRef}
            color="#120b25"
            transparent
            opacity={0}
            depthWrite={false}
            depthTest={false}
            fog={false}
            side={THREE.BackSide}
          />
        </mesh>
      </group>

      <group
        ref={focusGroupRef}
        name="URAI_FOCUS_PHASE_IDENTITY_V58"
        renderOrder={72}
        visible={false}
      >
        <mesh position={[0, 18.4, -148]} scale={[1.05, 1.05, 1.05]}>
          <sphereGeometry args={[18, 80, 40]} />
          <meshBasicMaterial
            ref={focusShellRef}
            color="#160924"
            transparent
            opacity={0}
            depthWrite={false}
            depthTest={false}
            fog={false}
            side={THREE.BackSide}
          />
        </mesh>

        <mesh geometry={focusGlyph} position={[0, 18.4, -134]}>
          <meshBasicMaterial
            ref={focusAnchorRef}
            color="#e5d6ff"
            transparent
            opacity={0}
            depthWrite={false}
            depthTest={false}
            fog={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        <mesh geometry={focusHalo} position={[0, 18.4, -136]} rotation={[Math.PI / 2, 0, 0]}>
          <meshBasicMaterial
            ref={focusHaloRef}
            color="#a889ff"
            transparent
            opacity={0}
            depthWrite={false}
            depthTest={false}
            fog={false}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        <mesh position={[0, 18.4, -154]} scale={[1.2, 0.72, 1.2]}>
          <sphereGeometry args={[30, 64, 32]} />
          <meshBasicMaterial
            ref={focusMaskRef}
            color="#090512"
            transparent
            opacity={0}
            depthWrite={false}
            depthTest={false}
            fog={false}
            side={THREE.BackSide}
          />
        </mesh>
      </group>

      <group
        ref={replayGroupRef}
        name="URAI_REPLAY_CHAMBER_IDENTITY_SEAM_MASK_V58"
        renderOrder={74}
        visible={false}
      >
        <mesh geometry={replayArch} position={[0, 16.7, -178]} scale={[1.32, 0.98, 1.32]}>
          <meshBasicMaterial
            ref={replayShellRef}
            color="#160724"
            transparent
            opacity={0}
            depthWrite={false}
            depthTest={false}
            fog={false}
            side={THREE.BackSide}
          />
        </mesh>

        <mesh position={[0, 16.8, -220]}>
          <circleGeometry args={[64, 160]} />
          <meshBasicMaterial
            ref={replayBackRef}
            color="#08020e"
            transparent
            opacity={0}
            depthWrite={false}
            depthTest={false}
            fog={false}
            side={THREE.DoubleSide}
          />
        </mesh>

        <mesh position={[0, 9.7, -174]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[10, 72, 192]} />
          <meshBasicMaterial
            ref={replayFloorRef}
            color="#6c45c7"
            transparent
            opacity={0}
            depthWrite={false}
            depthTest={false}
            fog={false}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        <mesh position={[0, 16.8, -154]} scale={[1.12, 0.78, 1.12]}>
          <sphereGeometry args={[32, 64, 32]} />
          <meshBasicMaterial
            ref={replayVeilRef}
            color="#6f46d9"
            transparent
            opacity={0}
            depthWrite={false}
            depthTest={false}
            fog={false}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        <mesh position={[0, 16.8, -166]} scale={[1.55, 1.0, 1.55]}>
          <sphereGeometry args={[42, 64, 32]} />
          <meshBasicMaterial
            ref={replayMaskRef}
            color="#05020a"
            transparent
            opacity={0}
            depthWrite={false}
            depthTest={false}
            fog={false}
            side={THREE.BackSide}
          />
        </mesh>
      </group>
    </>
  );
}

export default URAISpatialContinuityIdentityLock;
