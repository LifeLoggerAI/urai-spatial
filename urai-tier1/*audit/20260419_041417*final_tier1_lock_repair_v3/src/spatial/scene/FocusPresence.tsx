
'use client'

type FocusPresenceProps = {
  visible?: boolean
  selectedStar?: {
    id?: string
    label?: string
    position?: [number, number, number]
  } | null
}

export default function FocusPresence({
  visible = false,
  selectedStar = null,
}: FocusPresenceProps) {
  if (!visible || !selectedStar) return null

  const pos = Array.isArray(selectedStar.position) && selectedStar.position.length === 3
    ? selectedStar.position
    : [0, 0, -3.8]

  return (
    <group visible={visible} position={pos as [number, number, number]}>
      <mesh>
        <sphereGeometry args={[0.18, 24, 24]} />
        <meshBasicMaterial color="#f0f4ff" transparent opacity={0.96} depthWrite={false} />
      </mesh>
      <mesh scale={[2.4, 2.4, 2.4]}>
        <sphereGeometry args={[0.18, 24, 24]} />
        <meshBasicMaterial color="#89a6ff" transparent opacity={0.18} depthWrite={false} />
      </mesh>
      <mesh scale={[4.2, 4.2, 4.2]}>
        <sphereGeometry args={[0.18, 24, 24]} />
        <meshBasicMaterial color="#5578ff" transparent opacity={0.06} depthWrite={false} />
      </mesh>
    </group>
  )
}
