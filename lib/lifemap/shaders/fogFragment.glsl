uniform float time;
varying vec2 vUv;

// 2D Noise
float random (vec2 st) {
    return fract(sin(dot(st.xy,
                         vec2(12.9898,78.233)))*
        43758.5453123);
}

float noise (in vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);

    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    vec2 u = f*f*(3.0-2.0*f);
    return mix(a, b, u.x) +
            (c - a)* u.y * (1.0 - u.x) + 
            (d - b) * u.x * u.y;
}

void main() {
  // Animated Nebula Noise
  float t = time * 0.05;
  float n = noise(vUv * 5.0 + t) * 0.1;

  // Vignette
  float d = length(gl_FragCoord.xy / vec2(1000.0, 1000.0) - 0.5);
  float vignette = smoothstep(0.4, 0.2, d);

  gl_FragColor = vec4(vec3(n), 1.0) * vignette;
}