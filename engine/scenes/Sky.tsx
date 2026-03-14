'use client'

import * as THREE from 'three'
import { useMemo } from 'react'

export default function Sky(){

  const geometry = useMemo(()=>{
    return new THREE.SphereGeometry(500,64,64)
  },[])

  const material = useMemo(()=>{

    return new THREE.ShaderMaterial({

      side: THREE.BackSide,

      uniforms:{
        topColor:{ value:new THREE.Color('#0b1c2d') },
        bottomColor:{ value:new THREE.Color('#1b2c44') },
        offset:{ value:33 },
        exponent:{ value:0.6 }
      },

      vertexShader:`
        varying vec3 vWorldPosition;

        void main(){
          vec4 worldPosition = modelMatrix * vec4(position,1.0);
          vWorldPosition = worldPosition.xyz;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }
      `,

      fragmentShader:`
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;

        varying vec3 vWorldPosition;

        void main(){

          float h = normalize(vWorldPosition + offset).y;

          float mixFactor = pow(max(h,0.0), exponent);

          gl_FragColor = vec4(
            mix(bottomColor, topColor, mixFactor),
            1.0
          );

        }
      `

    })

  },[])

  return(
    <mesh geometry={geometry} material={material} />
  )

}