// Keep the WebGL coordinate transform separate from user-facing Replay copy.
// This is a graphics operation: the memory remains an immersive environment.
export const REPLAY_HORIZON_VERTEX_SHADER = `
  varying vec2 vGlowUv;
  void main() {
    vGlowUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
