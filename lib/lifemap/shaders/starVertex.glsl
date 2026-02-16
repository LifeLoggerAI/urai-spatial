attribute float size;
uniform float time;

void main() {
  vec3 newPosition = position;
  newPosition.x += sin(time * 0.05 + position.y) * 0.1;
  newPosition.y += cos(time * 0.05 + position.x) * 0.1;

  vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);

  gl_PointSize = size * (300.0 / -mvPosition.z);

  gl_Position = projectionMatrix * mvPosition;
}
