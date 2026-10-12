import * as THREE from 'three'

// Authored deterministic demo-only path, not an autobiographical reconstruction.
export const REPLAY_TRAIL_ROWS = 96
export const REPLAY_TRAIL_LANES = 8
export const REPLAY_TRAIL_START_Z = 4
export const REPLAY_TRAIL_END_Z = -32.5 // keep the entire path on the physical 52m terrain translated -7m

export function replayTrailCenter(z: number): number {
  return Math.sin((z + 4) * .25) * .35 + Math.sin(z * .074) * .23
}

export function buildReplayWornTrailGeometry(groundHeight: (x: number, z: number) => number): THREE.BufferGeometry {
  const positions: number[] = []
  const uv: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const worn = new THREE.Color('#d7c6ab')
  const fringe = new THREE.Color('#56715b')
  const scattered = new THREE.Color('#a5a38a')
  const color = new THREE.Color()
  for (let row = 0; row <= REPLAY_TRAIL_ROWS; row++) {
    const v = row / REPLAY_TRAIL_ROWS
    const z = REPLAY_TRAIL_START_Z + (REPLAY_TRAIL_END_Z - REPLAY_TRAIL_START_Z) * v
    const center = replayTrailCenter(z)
    const width = 1.08 + .15 * Math.sin(z * .37) + .08 * Math.sin(z * .71 + 1.7)
    for (let lane = 0; lane <= REPLAY_TRAIL_LANES; lane++) {
      const u = lane / REPLAY_TRAIL_LANES
      const t = u * 2 - 1
      const edgeBreak = Math.abs(t) * (.048 * Math.sin(z * 2.6 + t * 7.3) + .024 * Math.sin(z * 6.8 - t * 5.2))
      const x = center + t * width + edgeBreak
      const terrainY = groundHeight(x, z)
      if (!Number.isFinite(terrainY)) throw new Error('Replay demo trail requires finite terrain height')
      const lift = .028 + .009 * (1 - Math.abs(t))
      positions.push(x, terrainY + lift, z)
      uv.push(u, v)
      const edge = THREE.MathUtils.smoothstep(Math.abs(t), .57, 1)
      const mottling = Math.sin(z * 1.19 + t * 9.8) * Math.sin(z * 3.3 - t * 5.4) * .09
      color.copy(worn).lerp(fringe, edge * .87)
      color.lerp(scattered, THREE.MathUtils.clamp(.15 + mottling, 0, .32))
      colors.push(color.r, color.g, color.b)
    }
  }
  for (let row = 0; row < REPLAY_TRAIL_ROWS; row++) {
    for (let lane = 0; lane < REPLAY_TRAIL_LANES; lane++) {
      const a = row * (REPLAY_TRAIL_LANES + 1) + lane
      const b = a + REPLAY_TRAIL_LANES + 1
      indices.push(a, a + 1, b, a + 1, b + 1, b)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  geometry.userData = { truthClass: 'disclosed-demonstration', autobiographical: false, finalArtAdmitted: false, authoredAs: 'terrain-conforming-worn-trail' }
  return geometry
}
