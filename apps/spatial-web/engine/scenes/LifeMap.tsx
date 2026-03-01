'use client'

import * as THREE from 'three'
import { useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { useSceneStore } from '../state/useSceneStore'

type StarNode = {
  id: string
  basePosition: THREE.Vector3
  position: THREE.Vector3
  weight: number
  era: number
}

export default function LifeMap() {
  const { scene } = useThree()

  const groupRef = useRef<THREE.Group>(null)
  const [selected, setSelected] = useState<StarNode | null>(null)

  const setScene = useSceneStore((s) => s.setScene)
  const setActiveMemory = useSceneStore((s) => s.setActiveMemory)

  scene.background = new THREE.Color('#02030a')

  /* =========================
      ERA COLORS
     ========================= */

  const eraColors = [
    new THREE.Color('#6fa8ff'),
    new THREE.Color('#9f7bff'),
    new THREE.Color('#ff7bd4'),
    new THREE.Color('#7bffd4')
  ]

  /* =========================
      FOG
     ========================= */

  const fog = useMemo(
    () => new THREE.FogExp2('#02030a', 0.0012),
    []
  )

  scene.fog = fog

  /* =========================
      NEBULA
     ========================= */

  const nebulaMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      uniforms: { time: { value: 0 } },
      vertexShader: `
        varying vec3 vPos;
        void main(){
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vPos;
        uniform float time;

        float hash(vec3 p){
          return fract(sin(dot(p,vec3(12.9898,78.233,37.719))) * 43758.5453);
        }

        float noise(vec3 p){
          vec3 i = floor(p);
          vec3 f = fract(p);
          float n = mix(
            mix(
              mix(hash(i+vec3(0,0,0)), hash(i+vec3(1,0,0)), f.x),
              mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x),
              f.y
            ),
            mix(
              mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x),
              mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x),
              f.y
            ),
            f.z
          );
          return n;
        }

        void main(){
          vec3 p = normalize(vPos) * 4.0;

          float n = 0.0;
          n += noise(p + time*0.05) * 0.6;
          n += noise(p*2.0 + time*0.08) * 0.3;
          n += noise(p*4.0 + time*0.12) * 0.1;

          n = smoothstep(0.3,0.8,n);

          vec3 colA = vec3(0.04,0.07,0.18);
          vec3 colB = vec3(0.2,0.3,0.6);

          vec3 col = mix(colA,colB,n);

          gl_FragColor = vec4(col,0.45);
        }
      `
    })
  }, [])

  /* =========================
      NODES
     ========================= */

  const nodes: StarNode[] = useMemo(() => {
    const arr: StarNode[] = []

    for (let i = 0; i < 140; i++) {
      const era = Math.floor(Math.random() * 4)
      const clusterOffset = era * 150 - 225

      const base = new THREE.Vector3(
        clusterOffset + (Math.random() - 0.5) * 140,
        (Math.random() - 0.5) * 260,
        (Math.random() - 0.5) * 320
      )

      arr.push({
        id: `node-${i}`,
        basePosition: base.clone(),
        position: base.clone(),
        weight: Math.random(),
        era
      })
    }

    return arr
  }, [])

  /* =========================
      FRAME
     ========================= */

  useFrame(() => {
    nebulaMaterial.uniforms.time.value += 0.01

    if (groupRef.current) {
      groupRef.current.rotation.y += 0.00015
    }

    nodes.forEach(node => {
      if (!selected) {
        node.position.lerp(node.basePosition, 0.05)
      } else {
        const dist =
          node.basePosition.distanceTo(selected.basePosition)

        const gravityRadius = 120

        if (dist < gravityRadius) {
          const strength =
            (1 - dist / gravityRadius) * 0.05

          const dir =
            selected.basePosition.clone()
              .sub(node.position)
              .normalize()

          node.position.add(
            dir.multiplyScalar(strength)
          )
        }
      }
    })
  })

  /* =========================
      JSX
     ========================= */

  return (
    <>
      <mesh>
        <sphereGeometry args={[1600,64,64]} />
        <primitive object={nebulaMaterial} attach="material" />
      </mesh>

      <group
        ref={groupRef}
        onClick={() => setSelected(null)}
      >
        {nodes.map(node => {

          const size =
            0.4 + node.weight * 1.6

          let blended =
            new THREE.Color(0,0,0)

          nodes.forEach(other => {
            const dist =
              node.position.distanceTo(other.position)

            const influence =
              Math.max(0,1 - dist / 220)

            blended.add(
              eraColors[other.era]
                .clone()
                .multiplyScalar(influence * 0.08)
            )
          })

          const finalColor =
            blended.add(eraColors[node.era])

          return (
            <group
              key={node.id}
              position={node.position}
            >
              <mesh
                onClick={(e)=>{
                  e.stopPropagation()
                  setSelected(node)

                  // ROUTE TO MEMORY
                  setTimeout(() => {
                    setActiveMemory(node.id)
                    setScene('moment')
                  }, 500)
                }}
              >
                <sphereGeometry args={[size,32,32]} />
                <meshStandardMaterial
                  color={finalColor}
                  emissive={finalColor}
                  emissiveIntensity={1.4}
                  roughness={0.4}
                />
              </mesh>
            </group>
          )
        })}
      </group>

      <ambientLight intensity={0.4}/>
      <directionalLight
        position={[60,80,40]}
        intensity={1}
        color="#bcdcff"
      />

      <EffectComposer>
        <Bloom
          intensity={0.6}
          luminanceThreshold={0.3}
        />
      </EffectComposer>
    </>
  )
}