"use client"

import * as THREE from "three"
import { useMemo } from "react"

export default function VolumetricStarLight(){

  const mesh = useMemo(()=>{

    const geometry = new THREE.ConeGeometry(
      2,
      40,
      32,
      1,
      true
    )

    /* move origin to beam base */
    geometry.translate(0,-20,0)

    const material = new THREE.ShaderMaterial({

      transparent:true,
      depthWrite:false,
      depthTest:false,
      blending:THREE.AdditiveBlending,
      side:THREE.DoubleSide,

      uniforms:{
        color:{ value:new THREE.Color("#cfe6ff") }
      },

      vertexShader:`

        varying float vY;

        void main(){

          vY = position.y;

          gl_Position =
            projectionMatrix *
            modelViewMatrix *
            vec4(position,1.0);

        }

      `,

      fragmentShader:`

        uniform vec3 color;
        varying float vY;

        void main(){

          float fade =
            smoothstep(-20.0,0.0,vY);

          gl_FragColor =
            vec4(color, fade * 0.06);

        }

      `

    })

    const m = new THREE.Mesh(geometry,material)

    /* orient beam forward */
    m.rotation.x = Math.PI / 2

    return m

  },[])

  return <primitive object={mesh} />

}