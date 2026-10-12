// Non-admitted, deterministic authored sanctuary landscaping. Roots are outside
// HOME_BOUNDS: additional visual depth never creates invisible walking obstacles.
export const HOME_PERIMETER_TREE_COUNT = 18
export const HOME_PERIMETER_BRANCHES_PER_TREE = 5
export const HOME_PERIMETER_LEAF_CLUSTERS_PER_TREE = 18

export function homePerimeterVariation(index: number, salt: number): number {
  const value = Math.sin((index + 1) * 17.631 + salt * 43.771) * 43758.5453
  return value - Math.floor(value)
}

export function homePerimeterTreePlacement(index: number) {
  if (!Number.isInteger(index) || index < 0 || index >= HOME_PERIMETER_TREE_COUNT) {
    throw new Error('Home perimeter tree index outside bounded authored composition')
  }
  const side = index % 2 === 0 ? -1 : 1
  const lane = Math.floor(index / 2)
  const z = 6.8 - lane * 3.85 + (homePerimeterVariation(index, 40) - .5) * 1.1
  const behindWalk = z < -18.8
  const x = side * (behindWalk
    ? 11.6 + homePerimeterVariation(index, 41) * 6.5
    : 15.2 + homePerimeterVariation(index, 41) * 3.4)
  const scale = .78 + homePerimeterVariation(index, 42) * .43
  return { x, z, scale, yaw: homePerimeterVariation(index, 43) * Math.PI * 2 }
}
