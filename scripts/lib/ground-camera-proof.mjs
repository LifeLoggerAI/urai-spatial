// Evidence is derived from the rendered camera, never from requested gestures.
export function parseGroundCamera(raw) {
  if (typeof raw !== 'string' || !raw.trim()) throw new Error('Ground rendered camera telemetry is missing')
  const fields = raw.split(',')
  const values = fields.map(Number)
  if (fields.length !== 5 || fields.some((field) => !field.trim()) || values.some((value) => !Number.isFinite(value))) {
    throw new Error('Ground rendered camera telemetry is invalid')
  }
  const [x, y, z, yaw, pitch] = values
  return { x, y, z, yaw, pitch }
}

export function assertGroundCameraChange(state, camera, idle) {
  if (state === 'idle') return
  if (!idle) throw new Error(`${state}: idle camera evidence is missing`)
  if (state === 'after-move' && Math.hypot(camera.x - idle.x, camera.z - idle.z) < 0.05) {
    throw new Error('after-move: rendered camera did not move at least 5 cm')
  }
  if (state === 'look-down-material-gate' && camera.pitch > -0.6) {
    throw new Error('look-down-material-gate: rendered camera is not looking down')
  }
  if (state === 'look-up-sky-gate' && camera.pitch < 0.6) {
    throw new Error('look-up-sky-gate: rendered camera is not looking up')
  }
  if (state === 'look-back-world-continuity') {
    const turn = Math.abs(Math.atan2(Math.sin(camera.yaw - idle.yaw), Math.cos(camera.yaw - idle.yaw)))
    if (turn < Math.PI - 0.15 || Math.abs(camera.pitch - idle.pitch) > 0.15) {
      throw new Error('look-back-world-continuity: rendered camera is not facing back at eye level')
    }
  }
}
