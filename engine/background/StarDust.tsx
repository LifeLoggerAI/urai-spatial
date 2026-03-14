"use client"

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

export default function StarDust(){

  const pointsRef = useRef<THREE.Points>(null!)

  const COUNT = 4000
  const RADIUS = 1100

  const { geometry, material } = useMemo(()=>{

    const positions = new Float32Array(COUNT*3)

    for(let i=0;i<COUNT;i++){

      const r = 350 + Math.random()*RADIUS

      const theta = Math.random()*Math.PI*2
      const phi = Math.acos((Math.random()*2)-1)

      const x = r*Math.sin(phi)*Math.cos(theta)
      const y = r*Math.sin(phi)*Math.sin(theta)
      const z = r*Math.cos(phi)

      const i3 = i*3

      positions[i3] = x
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

      /* keep depth testing so particles don't stack infinitely */
      depthTest:true,

      blending:THREE.AdditiveBlending,

      uniforms:{
        uSize:{ value:1.4 }
      },

      vertexShader:`

        uniform float uSize;

        void main(){

          vec4 mvPosition =
            modelViewMatrix *
            vec4(position,1.0);

          float size =
            uSize *
            (70.0 / -mvPosition.z);

          size = clamp(size,0.35,1.4);

          gl_PointSize = size;

          gl_Position =
            projectionMatrix *
            mvPosition;

        }

      `,

      fragmentShader:`

        void main(){

          vec2 uv =
            gl_PointCoord -
            vec2(0.5);

          float d = length(uv);

          if(d > 0.5) discard;

          float glow =
            smoothstep(0.5,0.0,d);

          /* reduced brightness */
          float alpha =
            glow * 0.22;

          gl_FragColor =
            vec4(vec3(0.85,0.9,1.0),alpha);

        }

      `
    })

    return { geometry:geo, material:mat }

  },[])

  useFrame((state)=>{

    if(!pointsRef.current) return

    const t = state.clock.elapsedTime

    pointsRef.current.rotation.y = t * 0.006
    pointsRef.current.rotation.x = t * 0.002

  })

  return(
    <points
      ref={pointsRef}
      geometry={geometry}
      material={material}
      frustumCulled={false}
    />
  )

}