uniform float time;
varying vec3 vNormal;

void main() {
  // Inner Gradient
  float gradient = 1.0 - length(vNormal);
  vec3 innerColor = vec3(0.05, 0.1, 0.2) + gradient * 0.2;

  // Fresnel Edge Glow
  float fresnel = 1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0));
  fresnel = pow(fresnel, 2.0);
  vec3 glowColor = vec3(0.1, 0.3, 0.6) * fresnel;

  // Final Color
  vec3 finalColor = innerColor + glowColor;

  gl_FragColor = vec4(finalColor, 1.0);
}