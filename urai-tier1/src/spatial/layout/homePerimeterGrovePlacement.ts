// Source-authored landscaping only: no captured-world or final-asset admission.
// Irregular grouped perimeter groves soften repetitive rows without entering
// the first-person HOME_BOUNDS (-14..14 x, -18..12 z). Three instanced meshes
// remain the bounded render owner for trunks, boughs, and foliage.
export const HOME_PERIMETER_TREE_COUNT = 24
export const HOME_PERIMETER_BRANCHES_PER_TREE = 5
export const HOME_PERIMETER_LEAF_CLUSTERS_PER_TREE = 18

const GROVE_Z_CLUSTERS = [7.9, -2.7, -12.8, -23.4] as const
const GROVE_POCKET_OFFSETS = [-2.7, .3, 2.7] as const

export function homePerimeterVariation(index: number, salt: number): number {
  const value = Math.sin((index + 1) * 17.631 + salt * 43.771) * 43758.5453
  return value - Math.floor(value)
}

export function homePerimeterTreePlacement(index: number) {
  if (!Number.isInteger(index) || index < 0 || index >= HOME_PERIMETER_TREE_COUNT) {
    throw new Error('Home perimeter tree index outside bounded authored composition')
  }

  // Paired east/west groves retain the authored sanctuary clearing, while
  // different pocket offsets and jitter break identical tree-row silhouettes.
  const side = index % 2 === 0 ? -1 : 1
  const pair = Math.floor(index / 2)
  const cluster = Math.floor(pair / GROVE_POCKET_OFFSETS.length)
  const pocket = pair % GROVE_POCKET_OFFSETS.length
  const z = GROVE_Z_CLUSTERS[cluster] + GROVE_POCKET_OFFSETS[pocket]
    + (homePerimeterVariation(index, 40) - .5) * 2.9
  const behindWalk = z < -18.8
  const x = side * (behindWalk
    ? 11.8 + homePerimeterVariation(index, 41) * 6.8
    : 15.45 + homePerimeterVariation(index, 41) * 4.2)

  // Three silhouette families share the same geometry and instance budgets.
  // Their different height, spread, crown placement and lean are applied by
  // HomeSanctuaryPerimeterGrove, not through extra mesh draw calls.
  const crownProfile = Math.min(2, Math.floor(homePerimeterVariation(index, 44) * 3))
  const scale = .72 + homePerimeterVariation(index, 42) * .58
  const yaw = homePerimeterVariation(index, 43) * Math.PI * 2
  const lean = (homePerimeterVariation(index, 45) - .5) * .14
  return { x, z, scale, yaw, crownProfile, lean }
}
