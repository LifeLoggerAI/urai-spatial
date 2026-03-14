"use client"

import * as THREE from "three"
import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"

export default function DustTurbulenceField(){

  const pointsRef = useRef<THREE.Points>(null!)

  const { geo, mat } = useMemo(()=>{

    const count = 12000

    const pos = new Float32Array(count*3)
    const size = new Float32Array(count)

    for(let i=0;i<count;i++){

      const x = (Math.random()-0.5)*900
      const y = (Math.random()-0.5)*160
      const z = (Math.random()-0.5)*900

      pos[i*3]   = x
      pos[i*3+1] = y
      pos[i*3+2] = z

      size[i] = Math.random()*2.2 + 0.5
    }

    const geo = new THREE.BufferGeometry()

    geo.setAttribute(
      "position",
      new THREE.BufferAttribute(pos,3)
    )

    geo.setAttribute(
      "size",
      new THREE.BufferAttribute(size,1)
    )

    const mat = new THREE.ShaderMaterial({

      transparent:true,
      depthWrite:false,
      blending:THREE.AdditiveBlending,

      uniforms:{
        uTime:{value:0}
      },

      vertexShader:`

        attribute float size;

        varying float vHeight;

        void main(){

          vHeight = abs(position.y);

          vec4 mvPosition =
            modelViewMatrix *
            vec4(position,1.0);

          float dist = -mvPosition.z;

          gl_PointSize =
            size * (300.0 / dist);

          gl_Position =
            projectionMatrix *
            mvPosition;

        }

      `,

      fragmentShader:`

        varying float vHeight;

        float circle(vec2 uv){

          float d = length(uv - 0.5);
          return smoothstep(0.5,0.0,d);

        }

        void main(){

          vec2 uv = gl_PointCoord;

          float dust = circle(uv);

          float planeDensity =
            smoothstep(180.0,0.0,vHeight);

          float alpha =
            dust * planeDensity * 0.6;

          gl_FragColor =
            vec4(0.8,0.78,0.75,alpha);

        }

      `
    })

    return { geo, mat }

  },[])

  useFrame(({clock})=>{
    if(mat) mat.uniforms.uTime.value = clock.elapsedTime
  })

  return (
    <points
      ref={pointsRef}
      geometry={geo}
      material={mat}
    />
  )
}