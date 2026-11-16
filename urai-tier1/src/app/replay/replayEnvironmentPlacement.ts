// Deterministic layout for the DISCLOSED DEMONSTRATION memory world only.
// These locations are authored dressing, never inferred personal history.
export type ReplayPlacement = { x: number; z: number; scale: number; yaw: number }
export function replayVariation(index: number, salt: number): number {
  const raw = Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43758.5453
  return raw - Math.floor(raw)
}
export function replayGroundPlacement(index: number): ReplayPlacement {
  const side = index % 2 === 0 ? -1 : 1
  return {
    x: side * (2.65 + replayVariation(index, 17) * 9.15),
    z: 3.7 - replayVariation(index, 23) * 33,
    scale: 0.43 + replayVariation(index, 29) * 0.85,
    yaw: replayVariation(index, 31) * Math.PI * 2,
  }
}
export function replayFernPlacement(index: number): ReplayPlacement {
  const side = index % 2 === 0 ? -1 : 1
  return {
    x: side * (2.9 + replayVariation(index, 41) * 8.1),
    z: 1.6 - replayVariation(index, 43) * 29,
    scale: 0.32 + replayVariation(index, 47) * 0.42,
    yaw: replayVariation(index, 53) * Math.PI * 2,
  }
}
