'use client'

import { useEffect, useMemo, useRef } from 'react'
import { Html, useTexture } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { T } from '@/spatial/layout/HomeWorldProductionV223Geometry'
import { DESTINATIONS, type GroundDestination } from './GroundWorldModel'

// The vault is a continuous surface, not a backdrop or a row of freestanding pipes.
function vaultSurface(width: number, rise: number, length: number) {
  const positions: number[] = [], uv: number[] = [], indices: number[] = []
  const columns = 80, bays = 40
  for (let j = 0; j <= bays; j++) for (let i = 0; i <= columns; i++) {
    const a = i / columns * Math.PI, z = j / bays * length
    const ripple = .055 * Math.sin(a * 11 + z * .16) * Math.sin(a)
    positions.push(Math.cos(a) * (width + ripple), Math.sin(a) * rise - .09, -z)
    uv.push(a * width / 4, z / 4)
  }
  for (let j = 0; j < bays; j++) for (let i = 0; i < columns; i++) {
    const a = j * (columns + 1) + i, b = a + columns + 1
    indices.push(a, b, a + 1, b, b + 1, a + 1)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function chamberArch(index: number) {
  const width = 1.7 + (index % 3) * .12, rise = 2.5 + (index % 4) * .17
  const shape = new THREE.Shape()
  shape.moveTo(-width - .28, 0)
  for (let i = 0; i <= 64; i++) {
    const a = Math.PI - i / 64 * Math.PI
    shape.lineTo(Math.cos(a) * (width + .28), .72 + Math.sin(a) * (rise + .22))
  }
  shape.lineTo(width + .28, 0); shape.lineTo(width, 0)
  for (let i = 0; i <= 64; i++) {
    const a = i / 64 * Math.PI
    shape.lineTo(Math.cos(a) * width, .72 + Math.sin(a) * rise)
  }
  shape.lineTo(-width, 0); shape.closePath()
  return new THREE.ExtrudeGeometry(shape, { depth: 2.6 + (index % 3) * .3, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: .08, bevelThickness: .08, curveSegments: 32 })
}

export default function GroundVaultArchitecture({ activeId, onSelect, onReady }: {
  activeId: string | null
  onReady: () => void
  onSelect: (destination: GroundDestination) => void
}) {
  const renderedFrames = useRef(0)
  useFrame(({ gl }) => {
    if (renderedFrames.current < 2 && gl.info.render.calls > 0) {
      renderedFrames.current++
      if (renderedFrames.current === 2) onReady()
    }
  })
  const originals = useTexture(T as unknown as string[]) as THREE.Texture[]
  const maps = useMemo(() => originals.map((source, index) => {
    const texture = source.clone()
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.colorSpace = index === 0 ? THREE.SRGBColorSpace : THREE.NoColorSpace
    texture.anisotropy = 4; texture.needsUpdate = true
    return texture
  }), [originals])
  const shell = useMemo(() => vaultSurface(16, 10, 54), [])
  const endWall = useMemo(() => {
    const outline = new THREE.Shape()
    outline.moveTo(-16, 0)
    for (let i = 0; i <= 80; i++) {
      const angle = Math.PI - i / 80 * Math.PI
      outline.lineTo(Math.cos(angle) * 16, Math.sin(angle) * 10 - .09)
    }
    outline.closePath()
    return new THREE.ShapeGeometry(outline, 80)
  }, [])
  const arches = useMemo(() => DESTINATIONS.map((_, index) => chamberArch(index)), [])
  const floor = useMemo(() => {
    const g = new THREE.PlaneGeometry(32, 54, 1, 1)
    const uv = g.getAttribute('uv')
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 8, uv.getY(i) * 13.5)
    return g
  }, [])
  useEffect(() => () => { shell.dispose(); endWall.dispose(); floor.dispose(); arches.forEach(g => g.dispose()); maps.forEach(t => t.dispose()) }, [shell, endWall, floor, arches, maps])
  return <group name="ground-authored-walkable-vault-and-chambers">
    <mesh geometry={shell} position={[0, 0, 13]} receiveShadow>
      <meshStandardMaterial map={maps[0]} normalMap={maps[1]} roughnessMap={maps[2]} normalScale={new THREE.Vector2(.35, .35)} color="#79867b" roughness={.88} side={THREE.DoubleSide} />
    </mesh>
    <mesh geometry={endWall} position={[0, 0, -41]} receiveShadow>
      <meshStandardMaterial color="#4f655e" roughness={.96} side={THREE.DoubleSide} />
    </mesh>
    <mesh geometry={floor} position={[0, -.09, -14]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <meshStandardMaterial map={maps[0]} normalMap={maps[1]} roughnessMap={maps[2]} color="#727369" normalScale={new THREE.Vector2(.22, .22)} roughness={.72} metalness={.08} />
    </mesh>
    {DESTINATIONS.map((destination, index) => {
      const [x, , z] = destination.position
      const facing = x < -4 ? .4 : x > 4 ? -.4 : 0
      const active = activeId === destination.id
      return <group key={destination.id} position={[x, 0, z]} rotation={[0, facing, 0]} name={`ground-enterable-threshold-${destination.id}`} userData={{ destinationHref: destination.href }} onClick={event => { event.stopPropagation(); onSelect(destination) }}>
        {(index < 6 || active) && <Html center position={[0, 3.7 + (index % 4) * .17, -1.3]} distanceFactor={20} style={{ pointerEvents: 'none' }}>
          <div style={{ whiteSpace: 'nowrap', color: '#edf6ed', font: '600 15px/1.3 system-ui', letterSpacing: '.035em', textShadow: '0 2px 6px #071210', padding: '5px 9px', background: 'rgba(8,23,23,.82)', borderRadius: 4 }}>{destination.label}</div>
        </Html>}
        <mesh geometry={arches[index]} position={[0, 0, -2.9]} receiveShadow castShadow>
          <meshStandardMaterial map={maps[0]} normalMap={maps[1]} color={index % 3 === 0 ? '#a3997d' : '#839991'} roughness={.8} normalScale={new THREE.Vector2(.25, .25)} />
        </mesh>
        <mesh position={[0, .015, -1.1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[1.5, 64]} /><meshStandardMaterial color="#435751" metalness={.18} roughness={.5} />
        </mesh>
        <mesh position={[0, .03, -1.1]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.34, 1.36, 80]} /><meshBasicMaterial color={destination.color} transparent opacity={active ? .7 : .3} />
        </mesh>
        <pointLight position={[0, 2.2, -1]} color={index % 3 ? '#c5e1d5' : '#efd5a3'} intensity={active ? 14 : 8} distance={7} decay={2} />
      </group>
    })}
    <hemisphereLight args={['#e0e8d6', '#465c51', .8]} />
    <pointLight position={[0, 7.5, 1]} intensity={70} distance={32} decay={2} color="#f1dabb" />
    <pointLight position={[0, 7.5, -17]} intensity={55} distance={28} decay={2} color="#accbd0" />
  </group>
}
