'''use client''';
import { Canvas, useFrame } from "@react-three/fiber";
import { VRButton, XR } from "@react-three/xr";
import { Environment } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette, GodRays, SMAA, Noise } from "@react-three/postprocessing";
import { useRef, useMemo } from "react";
import * as THREE from "three";
import { Mesh } from "three";

// --- Re-usable components ---

function PerlinNebula() {
  const ref = useRef<THREE.Mesh>(null!);
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      side: THREE.BackSide, transparent: true, uniforms: { time: { value: 0 } },
      vertexShader: `varying vec3 vPos; void main() { vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform float time; varying vec3 vPos; float hash(vec3 p){ return fract(sin(dot(p,vec3(12.9898,78.233,45.164))) * 43758.5453); } float noise(vec3 p){ vec3 i = floor(p); vec3 f = fract(p); float n = mix(mix(hash(i), hash(i+vec3(1,0,0)), f.x), mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y); return n; } void main() { vec3 p = normalize(vPos) * 4.0; float n = noise(p + time * 0.05); vec3 col = vec3(0.1,0.0,0.3) + n * 0.2; gl_FragColor = vec4(col, 0.35); }`,
    })
  }, []);
  useFrame((state) => { if(material.uniforms.time) material.uniforms.time.value = state.clock.elapsedTime });
  return <mesh ref={ref}><sphereGeometry args={[500, 64, 64]} /><primitive object={material} attach="material" /></mesh>
}

function DustField({ count = 4000 }) {
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const dummy = new THREE.Object3D();
  useMemo(() => {
    if (!mesh.current) return;
    for (let i = 0; i < count; i++) {
      dummy.position.set((Math.random() - 0.5) * 300, (Math.random() - 0.5) * 300, (Math.random() - 0.5) * 300);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  }, [count]);
  useFrame(() => { if (mesh.current) { mesh.current.rotation.y += 0.0002 } });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.15, 6, 6]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.2} />
    </instancedMesh>
  )
}

function OrbScattering() {
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true, uniforms: { color: { value: new THREE.Color("#8a5cff") } },
      vertexShader: `varying vec3 vNormal; void main() { vNormal = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 color; varying vec3 vNormal; void main() { float intensity = pow(0.6 - dot(vNormal, vec3(0,0,1)), 3.0); gl_FragColor = vec4(color, intensity); }`,
    })
  }, []);
  return <mesh scale={[1.05, 1.05, 1.05]}><sphereGeometry args={[3, 64, 64]} /><primitive object={material} attach="material" /></mesh>
}

// --- Main Scene Engine ---

export default function SceneEngine() {
  const lightEmitter = useRef<Mesh>(null!);

  return (
    <div style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh' }}>
      <VRButton />
      <Canvas
        gl={{
          antialias: false,
          toneMapping: THREE.ACESFilmicToneMapping,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        camera={{ position: [0, 0, 40], fov: 75 }}
      >
        <XR>
          <ambientLight intensity={0.1} />
          
          <mesh ref={lightEmitter} position={[0, 0, 0]}>
            <sphereGeometry args={[3, 64, 64]} />
            <meshStandardMaterial emissive="#8a5cff" emissiveIntensity={5} toneMapped={false} />
          </mesh>
          <OrbScattering />
          
          <PerlinNebula />
          <DustField />

          <Environment files="/assets/environment.hdr" background blur={0.5} />
          
          <EffectComposer>
            <GodRays sun={lightEmitter.current!} kernelSize={2} density={0.96} decay={0.94} weight={0.6} exposure={0.4} samples={60} blur={true} />
            <Bloom intensity={0.8} luminanceThreshold={0.2} mipmapBlur />
            <Vignette eskil={false} offset={0.1} darkness={0.6} />
            <SMAA />
            <Noise opacity={0.025} />
          </EffectComposer>
        </XR>
      </Canvas>
    </div>
  );
}
