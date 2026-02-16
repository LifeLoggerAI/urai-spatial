import { useMemo } from "react"
import * as THREE from "three"
import { useLifeMapData } from "@/lib/lifemap/useLifeMapData"

export default function Constellations() {
  const { nodes } = useLifeMapData()

  const lines = useMemo(() => {
    const clusters: { [key: string]: [number, number, number][] } = {}
    nodes.forEach((node) => {
      if (node.clusterId) {
        if (!clusters[node.clusterId]) {
          clusters[node.clusterId] = []
        }
        clusters[node.clusterId].push(node.position)
      }
    })

    const lineGeometries: THREE.BufferGeometry[] = []
    Object.values(clusters).forEach((clusterNodes) => {
      if (clusterNodes.length > 1) {
        const points = clusterNodes.map((p) => new THREE.Vector3(...p))
        const geometry = new THREE.BufferGeometry().setFromPoints(points)
        lineGeometries.push(geometry)
      }
    })

    return lineGeometries
  }, [nodes])

  return (
    <>
      {lines.map((geometry, i) => (
        <line key={i} geometry={geometry}>
          <lineBasicMaterial color="#ffffff" transparent opacity={0.2} />
        </line>
      ))}
    </>
  )
}
