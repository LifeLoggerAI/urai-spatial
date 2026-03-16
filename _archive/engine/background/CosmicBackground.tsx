"use client"

import * as THREE from "three"
import { useMemo } from "react"

export default function CosmicBackground(){

  const material = useMemo(()=>{

    return new THREE.ShaderMaterial({

      side:THREE.BackSide,
      depthWrite:false,
      depthTest:false,

      uniforms:{
        top:{value:new THREE.Color("#0b1030")},
        mid:{value:new THREE.Color("#050510")},
        bottom:{value:new THREE.Color("#000000")}
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

        uniform vec3 top;
        uniform vec3 mid;
        uniform vec3 bottom;

        varying vec3 vPos;

        void main(){

          float h = normalize(vPos).y;

          vec3 col =
            mix(bottom,mid,smoothstep(-0.4,0.2,h));

          col =
            mix(col,top,smoothstep(0.2,0.9,h));

          gl_FragColor = vec4(col,1.0);

        }

      `
    })

  },[])

  return (

    <mesh>

      <sphereGeometry args={[9000,32,32]} />

      <primitive object={material} attach="material"/>

    </mesh>

  )

}