varying vec3 vColor;
uniform float time;

void main() {
  float dist = length(gl_PointCoord - vec2(0.5));
  float alpha = 1.0 - smoothstep(0.4, 0.5, dist);

  gl_FragColor = vec4(vColor, alpha);
}