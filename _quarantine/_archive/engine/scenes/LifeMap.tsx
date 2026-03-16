'use client'

import * as THREE from 'three'
import { useMemo, useRef, useEffect } from 'react'
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

export default function LifeMap(){

  const { scene } = useThree()

  const groupRef = useRef<THREE.Group>(null)

  const setScene = useSceneStore(s=>s.setScene)
  const setActiveMemory = useSceneStore(s=>s.setActiveMemory)

  useEffect(()=>{

    const prevBg = scene.background
    const prevFog = scene.fog

    scene.background = new THREE.Color('#02030a')
    scene.fog = new THREE.FogExp2('#02030a',0.002)

    return ()=>{
      scene.background = prevBg
      scene.fog = prevFog
    }

  },[scene])

  /* ERA COLORS */

  const eraColors = useMemo(()=>[
    new THREE.Color('#6fa8ff'),
    new THREE.Color('#9f7bff'),
    new THREE.Color('#ff7bd4'),
    new THREE.Color('#7bffd4')
  ],[])

  /* NEBULA */

  const nebulaMaterial = useMemo(()=>{

    return new THREE.ShaderMaterial({

      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,

      uniforms:{
        time:{value:0}
      },

      vertexShader:`

        varying vec3 vPos;

        void main(){

          vPos = position;

          gl_Position =
            projectionMatrix *
            modelViewMatrix *
            vec4(position,1.0);

        }

      `,

      fragmentShader:`

        varying vec3 vPos;
        uniform float time;

        float hash(vec3 p){
          return fract(
            sin(dot(p,vec3(12.9898,78.233,37.719)))
            * 43758.5453
          );
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

  },[])

  /* STAR NODES */

  const nodes:StarNode[] = useMemo(()=>{

    const arr:StarNode[] = []

    const count = 900
    const radius = 120

    for(let i=0;i<count;i++){

      const era = i % 4

      const r = radius * Math.pow(Math.random(),0.55)
      const theta = Math.random()*Math.PI*2
      const phi = Math.acos(2*Math.random()-1)

      const x = r * Math.sin(phi)*Math.cos(theta)
      const y = r * Math.sin(phi)*Math.sin(theta)
      const z = r * Math.cos(phi)

      const base = new THREE.Vector3(x,y,z)

      arr.push({
        id:`node-${i}`,
        basePosition:base.clone(),
        position:base.clone(),
        weight:Math.random(),
        era
      })

    }

    return arr

  },[])

  /* FRAME LOOP */

  useFrame(()=>{

    nebulaMaterial.uniforms.time.value += 0.01

    if(groupRef.current){
      groupRef.current.rotation.y += 0.00008
    }

    for(let i=0;i<nodes.length;i++){
      nodes[i].position.lerp(nodes[i].basePosition,0.05)
    }

  })

  /* JSX */

  return (

    <>

      <mesh>
        <sphereGeometry args={[1500,64,64]} />
        <primitive object={nebulaMaterial} attach="material"/>
      </mesh>

      <group ref={groupRef}>

        {nodes.map(node=>{

          const size = 0.3 + node.weight * 1.4
          const baseColor = eraColors[node.era]

          return (

            <mesh
              key={node.id}
              position={node.position}
              onClick={(e)=>{

                e.stopPropagation()

                setTimeout(()=>{
                  setActiveMemory(node.id)
                  setScene('moment')
                },400)

              }}
            >

              <sphereGeometry args={[size,24,24]}/>

              <meshStandardMaterial
                color={baseColor}
                emissive={baseColor}
                emissiveIntensity={2}
                roughness={0.5}
              />

            </mesh>

          )

        })}

      </group>

      <ambientLight intensity={0.45}/>

      <directionalLight
        position={[80,120,60]}
        intensity={1.0}
        color="#cde2ff"
      />

      <EffectComposer>
        <Bloom
          intensity={1}
          luminanceThreshold={0.2}
        />
      </EffectComposer>

    </>

  )

}