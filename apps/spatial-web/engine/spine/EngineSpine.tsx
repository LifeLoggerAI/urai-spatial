'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { EffectComposer, Bloom } from '@react-three/postprocessing'

function SkyDome() {
  return (
    <mesh>
      <sphereGeometry args={[100, 32, 32]} />
      <shaderMaterial
        side={THREE.BackSide}
        uniforms={{
          topColor: { value: new THREE.Color('#05070d') },
          bottomColor: { value: new THREE.Color('#141a2b') }
        }}
        vertexShader={`
          varying vec3 vWorldPosition;
          void main() {
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz;
            gl_Position = projectionMatrix * viewMatrix * worldPosition;
          }
        `}
        fragmentShader={`
          uniform vec3 topColor;
          uniform vec3 bottomColor;
          varying vec3 vWorldPosition;
          void main() {
            float h = normalize(vWorldPosition).y;
            gl_FragColor = vec4(mix(bottomColor, topColor, max(h, 0.0)), 1.0);
          }
        `}
      />
    </mesh>
  )
}

export default function EngineSpine() {
  return (
    <Canvas shadows camera={{ position: [0, 6, 14], fov: 50 }}>
      <fogExp2 attach="fog" args={['#0b0f1a', 0.055]} />
      <SkyDome />

      <ambientLight intensity={0.55} />
      <directionalLight
        position={[5, 8, 5]}
        intensity={1.2}
        castShadow
        color="#ffd8c2"
      />
      <directionalLight
        position={[-5, 6, -5]}
        intensity={0.6}
      />
      <hemisphereLight
        args={['#1a2a55', '#0f1628', 0.5]}
      />

      <mesh castShadow receiveShadow position={[0.15, 1, -0.2]}>
        <boxGeometry />
        <meshStandardMaterial color="hotpink" />
      </mesh>

      <mesh receiveShadow position={[0, -1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial
          color="#232836"
          roughness={1}
          metalness={0}
        >
          <primitive attach="onBeforeCompile" object={(shader) => {
            shader.fragmentShader = shader.fragmentShader.replace(
              '#include <dithering_fragment>',
              `
              float noise = fract(sin(dot(gl_FragCoord.xy ,vec2(12.9898,78.233))) * 43758.5453);
              gl_FragColor.rgb += (noise - 0.5) * 0.015;
              #include <dithering_fragment>
              `
            );
          }} />
        </meshStandardMaterial>
      </mesh>

      <mesh position={[-6, 0.5, -12]}>
        <boxGeometry args={[1.2, 2.5, 1.2]} />
        <meshStandardMaterial
          color="#151a26"
          roughness={1}
          metalness={0}
        />
      </mesh>

      <OrbitControls
        enablePan={false}
        minDistance={4}
        maxDistance={18}
        minPolarAngle={Math.PI * 0.25}
        maxPolarAngle={Math.PI * 0.85}
      />
      <EffectComposer>
        <Bloom
            intensity={0.28}
            luminanceThreshold={0.5}
            luminanceSmoothing={0.8}
        />
      </EffectComposer>
    </Canvas>
  )
}
