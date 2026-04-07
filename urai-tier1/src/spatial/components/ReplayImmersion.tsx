'use client'

type ReplayImmersionProps = {
  visible?: boolean
}

type ShellSpec = {
  z: number
  radius: number
  opacity: number
  segments: number
}

const SHELLS: ShellSpec[] = [
  { z: -2.5, radius: 2.6, opacity: 0.10, segments: 28 },
  { z: -7.0, radius: 5.4, opacity: 0.07, segments: 24 },
  { z: -14.0, radius: 9.8, opacity: 0.045, segments: 20 },
  { z: -24.0, radius: 16.0, opacity: 0.028, segments: 18 },
]

const FLOATERS = [
  { x: -2.8, y: 0.4, z: -3.5, r: 0.16, o: 0.11 },
  { x: 2.3, y: -0.3, z: -4.4, r: 0.14, o: 0.10 },
  { x: -4.5, y: 0.8, z: -8.5, r: 0.20, o: 0.08 },
  { x: 4.1, y: -0.9, z: -10.2, r: 0.22, o: 0.07 },
  { x: -6.5, y: 1.2, z: -16.4, r: 0.28, o: 0.05 },
  { x: 6.2, y: -1.1, z: -19.0, r: 0.26, o: 0.05 },
]

export default function ReplayImmersion({
  visible = true,
}: ReplayImmersionProps) {
  if (!visible) return null

  return (
    <group>
      <mesh position={[0, 0, -1.2]}>
        <sphereGeometry args={[1.8, 28, 28]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.08} />
      </mesh>

      {SHELLS.map((shell) => (
        <mesh key={shell.z} position={[0, 0, shell.z]}>
          <sphereGeometry args={[shell.radius, shell.segments, shell.segments]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={shell.opacity} wireframe />
        </mesh>
      ))}

      {FLOATERS.map((f, idx) => (
        <mesh key={idx} position={[f.x, f.y, f.z]}>
          <sphereGeometry args={[f.r, 10, 10]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={f.o} />
        </mesh>
      ))}

      <mesh position={[0, 0, -30]}>
        <sphereGeometry args={[24, 18, 18]} />
        <meshBasicMaterial color="#05070d" transparent opacity={0.22} side={1} />
      </mesh>
    </group>
  )
}
