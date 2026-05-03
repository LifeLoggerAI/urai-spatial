const FORBIDDEN_MODE_TOKEN = ["set", "Mode("].join("")
const FORBIDDEN_CAMERA_TOKEN = ["camera", ".position"].join("")

export function assertNoForbiddenPatterns(source: string): void {
  if (source.includes(FORBIDDEN_MODE_TOKEN)) {
    throw new Error("Runtime guard: direct mode mutation is forbidden")
  }
}

export function assertSingleAuthority(source: string): void {
  if (source.includes(FORBIDDEN_CAMERA_TOKEN) && !source.includes("CinematicCameraRig")) {
    throw new Error("Runtime guard: camera mutation outside rig")
  }
}
