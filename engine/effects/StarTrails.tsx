"use client"

import { useMemo, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"

const COUNT = 2000

export default function StarTrails(){

  const matRef = useRef<THREE.ShaderMaterial>(null!)
  const { camera } = useThree()
  const prev = useRef(new THREE.Vector3())

  const { geometry, material } = useMemo(()=>{

    const positions = new Float32Array(COUNT*3)
    const colors = new Float32Array(COUNT*3)

    const color = new THREE.Color()

    for(let i=0;i<COUNT;i++){

      const x = (Math.random()-0.5)*800
      const y = (Math.random()-0.5)*800
      const z = (Math.random()-0.5)*800

      const i3 = i*3

      positions[i3]   = x
      positions[i3+1] = y
      positions[i3+2] = z

      const brightness =
        0.7 + Math.random()*0.3

      color.setRGB(
        brightness,
        brightness,
        brightness
      )

      colors[i3]   = color.r
      colors[i3+1] = color.g
      colors[i3+2] = color.b

    }

    const geometry = new THREE.BufferGeometry()

    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions,3)
    )

    geometry.setAttribute(
      "color",
      new THREE.BufferAttribute(colors,3)
    )

    const material = new THREE.ShaderMaterial({

      transparent:true,
      depthWrite:false,
      blending:THREE.AdditiveBlending,
      vertexColors:true,

      uniforms:{
        velocity:{value:0}
      },

      vertexShader:`

        uniform float velocity;

        varying vec3 vColor;

        void main(){

          vColor = color;

          vec4 mvPosition =
            modelViewMatrix *
            vec4(position,1.0);

          float dist = -mvPosition.z;

          float stretch =
            1.0 + velocity * 6.0;

          gl_PointSize =
            clamp(1.2 * stretch * (280.0/dist), 1.0, 16.0);

          gl_Position =
            projectionMatrix *
            mvPosition;

        }

      `,

      fragmentShader:`

        varying vec3 vColor;

        void main(){

          float d =
            length(gl_PointCoord - vec2(0.5));

          float alpha =
            smoothstep(0.5,0.0,d);

          gl_FragColor =
            vec4(vColor, alpha*0.75);

        }

      `
    })

    return { geometry, material }

  },[])

  useFrame(()=>{

    const velocity =
      camera.position.distanceTo(prev.current)

    prev.current.copy(camera.position)

    if(matRef.current){
      matRef.current.uniforms.velocity.value =
        THREE.MathUtils.clamp(velocity*60,0,5)
    }

  })

  return (

    <points geometry={geometry}>

      <primitive
        object={material}
        ref={matRef}
        attach="material"
      />

    </points>

  )

}