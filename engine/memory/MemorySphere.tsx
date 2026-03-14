"use client"

import { useRef, useMemo, useEffect } from "react"
import { useFrame, useThree, useLoader } from "@react-three/fiber"
import * as THREE from "three"
import { useSpatialStore } from "../state/spatialStore"
import { STAR_DATA } from "../data/starData"

export default function MemorySphere(){

  const sphere = useRef<THREE.Mesh>(null!)
  const lens = useRef<THREE.Mesh>(null!)

  const { camera } = useThree()

  const selectedStarId = useSpatialStore(s => s.selectedStarId)
  const clearSelection = useSpatialStore(s => s.clearSelection)

  const scale = useRef(0)

  /* find selected star */

  const star = useMemo(() => {

    if(selectedStarId == null) return null

    return STAR_DATA.find(s => s.id === selectedStarId) || null

  }, [selectedStarId])

  const position = useMemo(() => {

    if(!star) return null

    return new THREE.Vector3(...star.position)

  }, [star])

  /* texture loading (safe) */

  const texturePath = star?.image ?? null

  const texture = useLoader(
    THREE.TextureLoader,
    texturePath || "/star-placeholder.png"
  )

  useFrame((state)=>{

    const m = sphere.current
    if(!m || !position) return

    const dist = camera.position.distanceTo(position)

    /* scale animation */

    if(dist < 14){

      scale.current = THREE.MathUtils.lerp(
        scale.current,
        1,
        0.08
      )

    } else {

      scale.current = THREE.MathUtils.lerp(
        scale.current,
        0,
        0.1
      )

    }

    const t = state.clock.getElapsedTime()

    const pulse =
      1 + Math.sin(t * 1.2) * 0.025

    const finalScale = scale.current * pulse

    m.scale.set(finalScale, finalScale, finalScale)

    /* glass lens shell */

    if(lens.current){

      lens.current.rotation.y += 0.002

      lens.current.scale.set(
        finalScale * 1.02,
        finalScale * 1.02,
        finalScale * 1.02
      )

    }

    /* billboard toward camera */

    const targetQuat =
      new THREE.Quaternion()
        .setFromRotationMatrix(
          new THREE.Matrix4().lookAt(
            m.position,
            camera.position,
            new THREE.Vector3(0,1,0)
          )
        )

    m.quaternion.slerp(targetQuat,0.08)

  })

  /* escape key clears selection */

  useEffect(()=>{

    const esc = (e:KeyboardEvent)=>{

      if(e.key === "Escape"){
        clearSelection()
      }

    }

    window.addEventListener("keydown",esc)

    return ()=>window.removeEventListener("keydown",esc)

  },[clearSelection])

  if(!star || !position) return null

  return (

    <group position={position}>

      {/* memory core */}

      <mesh ref={sphere}>

        <sphereGeometry args={[1.3,32,32]} />

        <meshStandardMaterial
          color="#cfe9ff"
          emissive="#7fb8ff"
          emissiveIntensity={0.2}
          roughness={0.35}
          metalness={0}
          map={texture || undefined}
        />

      </mesh>

      {/* glass lens */}

      <mesh ref={lens}>

        <sphereGeometry args={[1.6,32,32]} />

        <meshPhysicalMaterial
          transparent
          opacity={0.06}
          roughness={0}
          metalness={0}
          transmission={1}
          thickness={2}
          ior={1.15}
          depthWrite={false}
        />

      </mesh>

      {/* glow aura */}

      <mesh>

        <sphereGeometry args={[1.45,24,24]} />

        <meshBasicMaterial
          color="#ffcc88"
          transparent
          opacity={0.07}
          side={THREE.BackSide}
          depthWrite={false}
        />

      </mesh>

    </group>

  )

}