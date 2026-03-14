"use client"

import { useMemo } from "react"
import * as THREE from "three"

export default function LensGlow() {

  const geometry = useMemo(()=>new THREE.PlaneGeometry(18,18),[])

  const material = useMemo(()=>{

    return new THREE.ShaderMaterial({

      transparent:true,
      depthWrite:false,

      /* prevent scene washout */
      blending:THREE.AdditiveBlending,

      uniforms:{
        color:{value:new THREE.Color("#6fa8ff")}
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
        uniform vec3 color;

        void main(){

          float d = distance(vUv,vec2(0.5));

          /* softer falloff */
          float glow = 1.0 - smoothstep(0.0,0.75,d);

          glow = pow(glow,2.2);

          /* reduce brightness */
          float alpha = glow * 0.18;

          gl_FragColor = vec4(color * glow, alpha);

        }

      `
    })

  },[])

  return (
    <mesh
      position={[0,0,-140]}
      geometry={geometry}
      material={material}
    />
  )

}