"use client"

import { useMemo, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"

const COUNT = 18000
const ARMS = 4
const RADIUS = 420
const INNER_RADIUS = 40

export default function InstancedStars(){

  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const { camera } = useThree()

  const { mesh, material } = useMemo(()=>{

    const geometry = new THREE.PlaneGeometry(1,1)

    const material = new THREE.ShaderMaterial({

      transparent:true,
      depthWrite:false,
      blending:THREE.AdditiveBlending,
      side:THREE.DoubleSide,

      uniforms:{
        uTime:{ value:0 }
      },

      vertexShader:`

        attribute float temp;

        varying float vTemp;
        varying vec2 vUv;

        void main(){

          vTemp = temp;
          vUv = uv;

          vec4 mvPosition =
            modelViewMatrix *
            instanceMatrix *
            vec4(position,1.0);

          gl_Position =
            projectionMatrix *
            mvPosition;

        }

      `,

      fragmentShader:`

        varying float vTemp;
        varying vec2 vUv;

        void main(){

          vec2 coord = vUv - 0.5;
          float d = length(coord);

          float glow =
            smoothstep(0.5,0.0,d);

          vec3 warm = vec3(1.0,0.9,0.7);
          vec3 cool = vec3(0.7,0.85,1.0);

          vec3 color =
            mix(cool,warm,vTemp);

          gl_FragColor =
            vec4(color,glow);

        }

      `
    })

    const mesh =
      new THREE.InstancedMesh(geometry,material,COUNT)

    const dummy = new THREE.Object3D()

    const temps = new Float32Array(COUNT)

    for(let i=0;i<COUNT;i++){

      const arm = i % ARMS

      const r =
        INNER_RADIUS +
        Math.pow(Math.random(),0.7) *
        (RADIUS-INNER_RADIUS)

      const armAngle =
        (arm/ARMS)*Math.PI*2

      const spiral = r*0.018

      const angle = armAngle+spiral

      const x =
        Math.cos(angle)*r +
        (Math.random()-0.5)*4

      const z =
        Math.sin(angle)*r +
        (Math.random()-0.5)*4

      const y =
        (Math.random()-0.5)*18

      dummy.position.set(x,y,z)

      const s = 2+Math.random()*3
      dummy.scale.set(s,s,s)

      dummy.updateMatrix()

      mesh.setMatrixAt(i,dummy.matrix)

      temps[i]=Math.random()

    }

    geometry.setAttribute(
      "temp",
      new THREE.InstancedBufferAttribute(temps,1)
    )

    mesh.instanceMatrix.needsUpdate=true

    return { mesh, material }

  },[])

  useFrame((state)=>{

    if(!meshRef.current) return

    meshRef.current.rotation.y += 0.00018

    material.uniforms.uTime.value =
      state.clock.elapsedTime

    /* billboard quads toward camera */

    meshRef.current.quaternion.copy(
      camera.quaternion
    )

  })

  return(
    <primitive
      ref={meshRef}
      object={mesh}
      frustumCulled={false}
    />
  )
}