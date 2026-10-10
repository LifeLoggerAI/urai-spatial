export type FocusCameraVector = [number, number, number]
export type FocusCameraPose = { position: FocusCameraVector; target: FocusCameraVector; fov: number }
export type EntryCameraFrame = FocusCameraPose & { source: 'life-map' | 'focus-return'; targetId: string }

export const FOCUS_MEMORY_ORIGIN: FocusCameraVector = [0, 0.35, -1.55]

function parseVector(value: string | null, limit: number): FocusCameraVector | null {
  if (!value) return null
  const components = value.split(',')
  if (components.length !== 3 || components.some(component => !component.trim())) return null
  const vector = components.map(Number)
  if (vector.some(component => !Number.isFinite(component) || Math.abs(component) > limit)) return null
  return [vector[0], vector[1], vector[2]]
}

function distanceSquared(a: FocusCameraVector, b: FocusCameraVector) {
  return a.reduce((sum, component, index) => sum + (component - b[index]) ** 2, 0)
}

export function isFocusCameraPose(pose: FocusCameraPose): boolean {
  const { position, target, fov } = pose
  return [...position, ...target, fov].every(Number.isFinite)
    && position.every(component => Math.abs(component) <= 32)
    && Math.abs(target[0]) <= 5.5 && target[1] >= -1 && target[1] <= 4 && target[2] >= -5.5 && target[2] <= 1
    && fov >= 36 && fov <= 68
    && distanceSquared(position, target) >= 2.5 ** 2 && distanceSquared(position, target) <= 24 ** 2
}

export function parseFocusCameraFrame(params: URLSearchParams, starId: string, checkpointPrefix: 'focus' | 'focus-return'): FocusCameraPose | null {
  if (params.get('cameraCheckpoint') !== `${checkpointPrefix}:${starId}`) return null
  const position = parseVector(params.get('entryCamera'), 32)
  const target = parseVector(params.get('entryTarget'), 32)
  const rawFov = params.get('entryFov')
  const fov = rawFov?.trim() ? Number(rawFov) : NaN
  return position && target && isFocusCameraPose({ position, target, fov }) ? { position, target, fov } : null
}

export function parseEntryCameraFrame(params: URLSearchParams, expectedStarId: string | null): EntryCameraFrame | null {
  if (!expectedStarId) return null
  const checkpoint = params.get('cameraCheckpoint')
  const source = checkpoint === `life-map-arrival:${expectedStarId}` ? 'life-map'
    : checkpoint === `focus-return:${expectedStarId}` ? 'focus-return' : null
  if (!source) return null
  const position = parseVector(params.get('entryCamera'), source === 'life-map' ? 160 : 32)
  const target = parseVector(params.get('entryTarget'), source === 'life-map' ? 160 : 32)
  const rawFov = params.get('entryFov')
  const fov = rawFov?.trim() ? Number(rawFov) : NaN
  if (!position || !target || !Number.isFinite(fov) || fov < 36 || fov > 68) return null

  // Life Map owns its incoming world coordinates. Rebase only the local Focus
  // view around the same stellar subject, preserving direction, distance and FOV.
  // A Replay return already carries a Focus-local pose and must not be rebased.
  const pose: FocusCameraPose = source === 'life-map' ? {
    position: position.map((component, index) => component - target[index] + FOCUS_MEMORY_ORIGIN[index]) as FocusCameraVector,
    target: [...FOCUS_MEMORY_ORIGIN],
    fov,
  } : { position, target, fov }
  return isFocusCameraPose(pose) ? { ...pose, source, targetId: expectedStarId } : null
}

export function entryCameraFrameMatchesMemory(frame: EntryCameraFrame | null, memory: { id: string; star: { id: string } } | null): boolean {
  if (!frame || !memory) return false
  return frame.targetId === memory.star.id || (frame.source === 'life-map' && frame.targetId === memory.id)
}

export function focusCameraPoseSettled(current: FocusCameraPose, goal: FocusCameraPose): boolean {
  return [...current.position, ...current.target, current.fov].every(Number.isFinite)
    && distanceSquared(current.position, goal.position) < 0.01 ** 2
    && distanceSquared(current.target, goal.target) < 0.01 ** 2
    && Math.abs(current.fov - goal.fov) < 0.015
}

export function appendFocusCameraFrame(params: URLSearchParams, values: DOMStringMap | undefined, starId: string): boolean {
  if (!values) return false
  const position = parseVector([values.focusCameraX, values.focusCameraY, values.focusCameraZ].join(','), 32)
  const target = parseVector([values.focusTargetX, values.focusTargetY, values.focusTargetZ].join(','), 32)
  const fov = Number(values.focusFov)
  if (!position || !target || !isFocusCameraPose({ position, target, fov })) return false
  params.set('entryCamera', position.join(','))
  params.set('entryTarget', target.join(','))
  params.set('entryFov', String(fov))
  params.set('cameraCheckpoint', `focus:${starId}`)
  return true
}
