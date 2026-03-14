"use client"

import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

export default function GalacticCoreLensing(){

  const mat = useRef<THREE.ShaderMaterial>(null!)

  const material = useMemo(()=>{

    return new THREE.ShaderMaterial({

      transparent:true,
      depthWrite:false,
      blending:THREE.AdditiveBlending,

      uniforms:{
        time:{value:0},
        strength:{value:0.45}
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

        uniform float time;
        uniform float strength;

        varying vec3 vPos;

        float circle(vec2 uv){
          float d = length(uv);
          return smoothstep(1.2,0.0,d);
        }

        void main(){

          vec2 p = vPos.xy * 0.05;

          float r = length(p);

          float swirl =
            sin(r*10.0 - time*0.6)*0.5 + 0.5;

          float lens =
            circle(p);

          vec3 col =
            vec3(0.7,0.9,1.0)
            * lens
            * (0.5 + swirl*0.5);

          gl_FragColor =
            vec4(col, lens * strength);

        }

      `
    })

  },[])

  useFrame((state)=>{
    if(mat.current){
      mat.current.uniforms.time.value = state.clock.elapsedTime
    }
  })

  return(

    <mesh position={[0,0,0]}>

      <sphereGeometry args={[35,64,64]} />

      <primitive
        object={material}
        ref={mat}
        attach="material"
      />

    </mesh>

  )

}