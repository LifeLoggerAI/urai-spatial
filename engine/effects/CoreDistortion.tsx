"use client"

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

export default function CoreDistortion(){

  const mesh = useRef<THREE.Mesh>(null!)

  const material = useMemo(()=>{

    return new THREE.ShaderMaterial({

      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,

      uniforms:{
        uTime:{ value:0 }
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

        uniform float uTime;

        void main(){

          vec2 uv = vUv*2.0-1.0;

          float r = length(uv);

          float warp =
            exp(-r*4.0);

          float pulse =
            0.9 + sin(uTime*1.5)*0.1;

          float glow =
            warp * 0.45 * pulse;

          vec3 col =
            vec3(1.0,0.9,0.7) * glow;

          gl_FragColor =
            vec4(col,glow);

        }

      `

    })

  },[])

  useFrame((state)=>{
    material.uniforms.uTime.value =
      state.clock.elapsedTime
  })

  return(
    <mesh ref={mesh} material={material}>
      <sphereGeometry args={[80,64,64]} />
    </mesh>
  )

}