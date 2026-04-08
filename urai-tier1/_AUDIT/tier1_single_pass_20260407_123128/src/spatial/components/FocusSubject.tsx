'use client'

import { useMemo } from 'react'

type FocusSubjectProps = {
  visible?: boolean
  starId?: string | null
  onEnterReplay?: (() => void) | null
}

type EchoStar = {
  id: string
  position: [number, number, number]
  scale: number
  opacity: number
}

type Palette = {
  core: string
  halo: string
  ring: string
  echo: string
  veil: string
}

function seedFromString(input: string | null | undefined) {
  const text = input || 'focus'
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function makeRand(seed: number) {
  let value = seed >>> 0
  return function next() {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0
    return value / 4294967295
  }
}

function resolvePalette(seed: number): Palette {
  const palettes: Palette[] = [
    { core: '#dcecff', halo: '#7fb2ff', ring: '#bad4ff', echo: '#91bbff', veil: '#0a1325' },
    { core: '#ffe0d1', halo: '#ffb48f', ring: '#ffd0b8', echo: '#ffc39e', veil: '#1a100d' },
    { core: '#e3ffd8', halo: '#a8ef83', ring: '#d8ffc6', echo: '#bff79e', veil: '#0d1610' },
    { core: '#fff3c9', halo: '#f3d36b', ring: '#ffe8a2', echo: '#f4dc8f', veil: '#171309' },
  ]
  return palettes[seed % palettes.length]
}

function makeEchoStars(starId: string | null): EchoStar[] {
  const seed = seedFromString(starId)
  const rand = makeRand(seed)
  const out: EchoStar[] = []

  for (let i = 0; i < 28; i++) {
    const angle = rand() * Math.PI * 2
    const radius = 3.2 + rand() * 5.8
    const x = Math.cos(angle) * radius
    const y = (rand() - 0.5) * 4.6
    const z = -2.5 - rand() * 11.5
    out.push({
      id: `echo-${i}`,
      position: [x, y, z],
      scale: 0.04 + rand() * 0.14,
      opacity: 0.05 + rand() * 0.11,
    })
  }

  for (let i = 0; i < 26; i++) {
    const angle = rand() * Math.PI * 2
    const radius = 7.5 + rand() * 5.5
    const x = Math.cos(angle) * radius
    const y = (rand() - 0.5) * 6.2
    const z = -6 - rand() * 16
    out.push({
      id: `field-${i}`,
      position: [x, y, z],
      scale: 0.03 + rand() * 0.1,
      opacity: 0.03 + rand() * 0.08,
    })
  }

  return out
}

export default function FocusSubject({
  visible = true,
  starId = null,
  onEnterReplay = null,
}: FocusSubjectProps) {
  const seed = useMemo(() => seedFromString(starId), [starId])
  const palette = useMemo(() => resolvePalette(seed), [seed])
  const echoStars = useMemo(() => makeEchoStars(starId), [starId])

  if (!visible) return null

  return (
    <group position={[0, 0.1, -10.8]}>
      <mesh>
        <sphereGeometry args={[10.5, 32, 32]} />
        <meshBasicMaterial color={palette.veil} transparent opacity={0.18} depthWrite={false} />
      </mesh>

      <mesh position={[0, 0, -1.2]}>
        <sphereGeometry args={[6.6, 28, 28]} />
        <meshBasicMaterial color={palette.halo} transparent opacity={0.05} depthWrite={false} />
      </mesh>

      <mesh position={[0, 0, -2.4]}>
        <sphereGeometry args={[4.2, 28, 28]} />
        <meshBasicMaterial color={palette.halo} transparent opacity={0.08} depthWrite={false} />
      </mesh>

      <mesh rotation={[1.2, 0.2, 0.1]}>
        <torusGeometry args={[2.15, 0.055, 16, 120]} />
        <meshBasicMaterial color={palette.ring} transparent opacity={0.3} depthWrite={false} />
      </mesh>

      <mesh rotation={[0.1, 0.55, 0.6]}>
        <torusGeometry args={[2.9, 0.045, 16, 120]} />
        <meshBasicMaterial color={palette.ring} transparent opacity={0.14} depthWrite={false} />
      </mesh>

      <group
        onPointerDown={(e) => {
          e.stopPropagation()
          if (typeof onEnterReplay === 'function') onEnterReplay()
        }}
      >
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[1.08, 36, 36]} />
          <meshBasicMaterial color={palette.core} transparent opacity={1} depthWrite={false} />
        </mesh>

        <mesh position={[0, 0, -0.4]}>
          <sphereGeometry args={[1.78, 32, 32]} />
          <meshBasicMaterial color={palette.halo} transparent opacity={0.16} depthWrite={false} />
        </mesh>

        <mesh position={[0, 0, -0.95]}>
          <sphereGeometry args={[2.7, 28, 28]} />
          <meshBasicMaterial color={palette.halo} transparent opacity={0.07} depthWrite={false} />
        </mesh>

        <mesh position={[0.58, 0.18, 0.22]}>
          <sphereGeometry args={[0.11, 12, 12]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.92} depthWrite={false} />
        </mesh>

        <mesh position={[-0.72, -0.2, -0.1]}>
          <sphereGeometry args={[0.08, 12, 12]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.55} depthWrite={false} />
        </mesh>

        <mesh>
          <sphereGeometry args={[3.15, 16, 16]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>

      {echoStars.map((star) => (
        <mesh key={star.id} position={star.position}>
          <sphereGeometry args={[star.scale, 10, 10]} />
          <meshBasicMaterial
            color={palette.echo}
            transparent
            opacity={star.opacity}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  )
}
