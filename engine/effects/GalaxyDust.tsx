"use client"

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

const COUNT = 12000
const RADIUS = 450

export default function GalaxyDust(){

  const matRef = useRef<THREE.ShaderMaterial>(null!)

  useFrame((state)=>{
    if(matRef.current){
      matRef.current.uniforms.time.value =
        state.clock.elapsedTime
    }
  })

  const {geometry,material} = useMemo(()=>{

    const positions = new Float32Array(COUNT*3)

    for(let i=0;i<COUNT;i++){

      const r = Math.random()*RADIUS
      const theta = Math.random()*Math.PI*2
      const y = (Math.random()-0.5)*80

      const x = Math.cos(theta)*r
      const z = Math.sin(theta)*r

      const i3 = i*3

      positions[i3]   = x
      positions[i3+1] = y
      positions[i3+2] = z
    }

    const geo = new THREE.BufferGeometry()

    geo.setAttribute(
      "position",
      new THREE.BufferAttribute(positions,3)
    )

    const mat = new THREE.ShaderMaterial({

      transparent:true,
      depthWrite:false,
      blending:THREE.AdditiveBlending,

      uniforms:{
        time:{value:0}
      },

      vertexShader:`

        uniform float time;
        varying float vRadius;

        void main(){

          vec3 p = position;

          float swirl =
            sin(time*0.4 + p.x*0.02) * 4.0;

          float drift =
            cos(time*0.3 + p.z*0.02) * 4.0;

          p.x += swirl;
          p.z += drift;

          vRadius = length(p.xz);

          vec4 mvPosition =
            modelViewMatrix *
            vec4(p,1.0);

          gl_PointSize =
            1.4 * (300.0 / -mvPosition.z);

          gl_Position =
            projectionMatrix *
            mvPosition;
        }
      `,

      fragmentShader:`

        varying float vRadius;

        void main(){

          float d =
            length(gl_PointCoord - vec2(0.5));

          float particle =
            smoothstep(0.5,0.0,d);

          float radialFalloff =
            smoothstep(520.0,0.0,vRadius);

          vec3 color =
            vec3(0.6,0.7,1.0);

          gl_FragColor =
            vec4(color, particle * radialFalloff * 0.25);
        }

      `
    })

    return { geometry: geo, material: mat }

  },[])

  return (
    <points
      geometry={geometry}
      frustumCulled={false}
    >
      <primitive object={material} ref={matRef} attach="material" />
    </points>
  )
}