import { useMemo } from "react"
import * as THREE from "three"
import { useLifeMapData, StarType } from "@/lib/lifemap/useLifeMapData"

export default function TraumaCloud() {
  const { nodes } = useLifeMapData()

  const traumaNodes = useMemo(() => {
    return nodes.filter((node) => node.type === StarType.TraumaPeriod)
  }, [nodes])

  return (
    <>
      {traumaNodes.map((node) => (
        <points key={node.id}>
          <sphereGeometry args={[10, 16, 16]} />
          <pointsMaterial color="#0000ff" size={0.1} transparent opacity={0.1} />
        </points>
      ))}
    </>
  )
}
