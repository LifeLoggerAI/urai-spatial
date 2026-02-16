uniform float time;

varying vec3 vNormal;

// 2D Random
float random (vec2 st) {
    return fract(sin(dot(st.xy,
                         vec2(12.9898,78.233)))*
        43758.5453123);
}

void main() {
  vNormal = normal;
  float pulse = 0.05 * sin(time * 0.5);
  vec3 newPosition = position + normal * pulse;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}