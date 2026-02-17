import { Line } from "@react-three/drei"
import { useMemo } from "react"
import * as THREE from "three"

type MemoryNode = {
  id: string
  position: { x: number; y: number; z: number }
  chapterIndex: number
  createdAt?: number
}

interface GlowTrailsProps {
  memories: MemoryNode[]
}

export default function GlowTrails({ memories }: GlowTrailsProps) {
  const chapterGroups = useMemo(() => {
    const groups: Record<number, MemoryNode[]> = {}

    memories.forEach(mem => {
      if (!groups[mem.chapterIndex]) {
        groups[mem.chapterIndex] = []
      }
      groups[mem.chapterIndex].push(mem)
    })

    // Sort within chapter (if timestamp exists)
    Object.keys(groups).forEach(key => {
      groups[Number(key)].sort((a, b) => 
        (a.createdAt || 0) - (b.createdAt || 0)
      )
    })

    return groups
  }, [memories])

  return (
    <>
      {Object.entries(chapterGroups).map(([chapter, nodes]) => {
        if (nodes.length < 2) return null

        const points = nodes.map(node =>
          new THREE.Vector3(
            node.position.x,
            node.position.y,
            node.position.z
          )
        )

        return (
          <Line
            key={chapter}
            points={points}
            color="#88ccff"
            lineWidth={2}
            transparent
            opacity={0.4}
            blending={THREE.AdditiveBlending}
          />
        )
      })}
    </>
  )
}
