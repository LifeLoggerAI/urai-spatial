"use client"

import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

export default function DustLanes(){

  const mesh = useRef<THREE.Mesh>(null!)

  const material = useMemo(()=>{

    return new THREE.ShaderMaterial({

      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide,

      uniforms:{
        uTime:{ value:0 }
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

        uniform float uTime;

        float spiral(vec2 p){

          float r = length(p);
          float a = atan(p.y,p.x);

          float arm =
            sin(a*4.0 + r*0.04 + uTime*0.05);

          float lane =
            smoothstep(0.45,0.6,arm);

          return lane;
        }

        void main(){

          vec2 p = vPos.xz;

          float r = length(p);

          float lane =
            spiral(p);

          float fade =
            1.0 - smoothstep(200.0,500.0,r);

          float dust =
            lane * fade;

          gl_FragColor =
            vec4(vec3(0.0), dust * 0.35);

        }

      `

    })

  },[])

  useFrame((state)=>{
    material.uniforms.uTime.value =
      state.clock.elapsedTime
  })

  return(
    <mesh
      ref={mesh}
      material={material}
      rotation={[-Math.PI/2,0,0]}
    >
      <circleGeometry args={[500,128]} />
    </mesh>
  )

}