'use client'

import { useMemo, useRef, useEffect } from 'react'
import { Group, Fog } from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useSceneStore } from '../../engine/state/useSceneStore'
import { getNodesForZoomLevel } from '../../lib/lifemap/getNodesForZoomLevel'
import MomentContainer from '../components/lifemap/MomentContainer'

const ZoomBands = {
  decade: { min: 40, max: 100 },
  year: { min: 25, max: 40 },
  month: { min: 15, max: 25 },
  day: { min: 8, max: 15 },
  moment: { min: 0, max: 8 },
}

export default function LifeMapScene() {
  const groupRef = useRef<Group>(null)
  const { scene } = useThree()

  const {
    zoomLevel,
    setZoomLevel,
    setCameraZ,
    selectedMoment,
    setSelectedMoment,
    selectedMomentPosition,
    setSelectedMomentPosition,
  } = useSceneStore((s) => ({
    zoomLevel: s.zoomLevel,
    setZoomLevel: s.setZoomLevel,
    setCameraZ: s.setCameraZ,
    selectedMoment: s.selectedMoment,
    setSelectedMoment: s.setSelectedMoment,
    selectedMomentPosition: s.selectedMomentPosition,
    setSelectedMomentPosition: s.setSelectedMomentPosition,
  }))

  const isMoment = zoomLevel === 'moment'

  useEffect(() => {
    if (!scene.fog) {
      scene.fog = new Fog(0x000000, 10, 100)
    }
    scene.fog.density = isMoment ? 0.08 : 0.025
  }, [isMoment, scene])

  useFrame(({ camera }) => {
    if (!groupRef.current) return
    const z = camera.position.z
    setCameraZ(z)

    if (z >= ZoomBands.decade.min) setZoomLevel('decade')
    else if (z >= ZoomBands.year.min) setZoomLevel('year')
    else if (z >= ZoomBands.month.min) setZoomLevel('month')
    else if (z >= ZoomBands.day.min) setZoomLevel('day')
    else setZoomLevel('moment')
  })

  const nodes = useMemo(() => {
    return getNodesForZoomLevel(zoomLevel)
  }, [zoomLevel])

  return (
    <group ref={groupRef}>
      {nodes.map((node) => (
        <mesh
          key={node.id}
          position={node.position}
          onClick={() => {
            if (zoomLevel === 'day') {
              setSelectedMoment(node.id)
              setSelectedMomentPosition(node.position)
            }
          }}
        >
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={isMoment ? 0.4 : 2}
            toneMapped={false}
          />
        </mesh>
      ))}

      {isMoment && selectedMomentPosition && <MomentContainer position={selectedMomentPosition} />}
    </group>
  )
}
