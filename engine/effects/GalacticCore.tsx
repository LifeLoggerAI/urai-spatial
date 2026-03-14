"use client"

import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

export default function GalacticCore(){

  const mesh = useRef<THREE.Mesh>(null!)

  const material = useMemo(()=>{

    return new THREE.ShaderMaterial({

      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,

      uniforms:{
        uColorA:{ value:new THREE.Color("#6fa8ff") },
        uColorB:{ value:new THREE.Color("#ffffff") }
      },

      vertexShader:`

        varying vec2 vUv;

        void main(){

          vUv = uv;

          gl_Position =
            projectionMatrix *
            modelViewMatrix *
            vec4(position,1.0);

        }

      `,

      fragmentShader:`

        varying vec2 vUv;

        uniform vec3 uColorA;
        uniform vec3 uColorB;

        void main(){

          vec2 p = vUv * 2.0 - 1.0;

          float d = length(p);

          float glow =
            smoothstep(1.0,0.0,d);

          vec3 color =
            mix(uColorA,uColorB,glow);

          gl_FragColor =
            vec4(color,glow*0.6);

        }

      `

    })

  },[])

  useFrame(()=>{
    if(!mesh.current) return
    mesh.current.rotation.y += 0.002
  })

  return(

    <mesh ref={mesh} scale={120} material={material}>
      <planeGeometry args={[1,1]} />
    </mesh>

  )

}