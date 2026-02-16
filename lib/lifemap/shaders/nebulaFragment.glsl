uniform float time;
varying vec2 vUv;

// 2D Noise function
float noise(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main() {
    vec2 st = vUv * 5.0; // Scale the noise
    st.x += time * 0.01; // Animate the noise

    float n = noise(st);

    gl_FragColor = vec4(vec3(n * 0.1), 1.0);
}