// One authored galaxy transform across overview, selection, approach and arrival.
// The camera approaches a physical star; selecting it must never move the world.
export function lifeMapWorldStageTransform(portrait) {
  return portrait
    ? { scale: [0.54, 0.96, 0.78], position: [0, -0.18, 1.1] }
    : { scale: [1.12, 1.18, 1.08], position: [0, 0.05, 0.9] };
}

// The selected camera goal and the rendered world use the identical transform.
export function lifeMapStagePoint(point, portrait) {
  if (!Array.isArray(point) || point.length !== 3 || !point.every(Number.isFinite)) {
    throw new Error('LIFE_MAP_NONFINITE_STAGE_POINT');
  }
  const { scale, position } = lifeMapWorldStageTransform(portrait);
  return point.map((coordinate, axis) => coordinate * scale[axis] + position[axis]);
}
