uniform float time;
varying vec3 vPosition;

void main() {
  float pulse = sin(time * 2.0 + length(vPosition) * 10.0) * 0.5 + 0.5;
  float glow = 1.0 - smoothstep(0.0, 1.0, length(vPosition));
  vec3 color = vec3(0.1, 0.8, 0.2) * glow * pulse;
  gl_FragColor = vec4(color, 0.5);
}
