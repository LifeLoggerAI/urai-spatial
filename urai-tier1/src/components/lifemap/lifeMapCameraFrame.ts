export type LifeMapCameraFrame = { targetId: string; position: [number, number, number]; target: [number, number, number]; fov: number }

function vector(value: string | null): [number, number, number] | null {
  const components = value?.split(',')
  if (!components || components.length !== 3 || components.some(component => !component.trim())) return null
  const numbers = components.map(Number)
  return numbers.every(number => Number.isFinite(number) && Math.abs(number) <= 160)
    ? [numbers[0], numbers[1], numbers[2]] : null
}

export function parseLifeMapCameraFrame(params: URLSearchParams, targetId: string | null, phase: 'arrival' | 'return'): LifeMapCameraFrame | null {
  if (!targetId || params.get('cameraCheckpoint') !== `life-map-${phase}:${targetId}`) return null
  const position = vector(params.get('entryCamera'))
  const target = vector(params.get('entryTarget'))
  const rawFov = params.get('entryFov')
  const fov = rawFov?.trim() ? Number(rawFov) : NaN
  if (!position || !target || !Number.isFinite(fov) || fov < 36 || fov > 68) return null
  const distanceSquared = position.reduce((sum, component, index) => sum + (component - target[index]) ** 2, 0)
  return distanceSquared >= 2.5 ** 2 && distanceSquared <= 24 ** 2 ? { position, target, fov, targetId } : null
}

export function retainLifeMapCameraFrame(next: URLSearchParams, current: URLSearchParams, targetId: string): boolean {
  const retained = new URLSearchParams({
    cameraCheckpoint: current.get('lifeMapCheckpoint') ?? '',
    entryCamera: current.get('lifeMapCamera') ?? '',
    entryTarget: current.get('lifeMapTarget') ?? '',
    entryFov: current.get('lifeMapFov') ?? '',
  })
  const frame = parseLifeMapCameraFrame(current, targetId, 'arrival') ?? parseLifeMapCameraFrame(retained, targetId, 'arrival')
  if (!frame) return false
  next.set('lifeMapCamera', frame.position.join(','))
  next.set('lifeMapTarget', frame.target.join(','))
  next.set('lifeMapFov', String(frame.fov))
  next.set('lifeMapCheckpoint', `life-map-arrival:${targetId}`)
  next.set('returnNode', targetId)
  return true
}
