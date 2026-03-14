"use client"

import { useMemo } from "react"
import * as THREE from "three"

import { lifeDataset } from "../lifemap/lifeDataset"
import { useSpatialStore } from "../state/spatialStore"

import { STAR_RADIUS } from "../camera/cameraConfig"

export default function LifeMap(){

  const setStar = useSpatialStore(s => s.setStar)
  const selectedStar = useSpatialStore(s => s.selectedStar)

  const stars = useMemo(() => lifeDataset, [])

  return (

    <group>

      {stars.map((s) => {

        const selected = selectedStar?.id === s.id

        return (

          <mesh
            key={s.id}
            position={s.position}
            raycast={THREE.Mesh.prototype.raycast}
            scale={selected ? 1.6 : 1}
            onPointerDown={(e) => {

              e.stopPropagation()

              setStar(s)

            }}
          >

            <sphereGeometry args={[STAR_RADIUS, 12, 12]} />

            <meshStandardMaterial
              color={selected ? "#ffffff" : "#aabfff"}
              emissive={selected ? "#ffffff" : "#111111"}
              emissiveIntensity={selected ? 2.5 : 0.35}
              roughness={0.25}
              metalness={0.1}
            />

          </mesh>

        )

      })}

    </group>

  )

}