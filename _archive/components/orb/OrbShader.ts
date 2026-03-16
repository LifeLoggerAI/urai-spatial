import * as THREE from 'three'
import { shaderMaterial } from '@react-three/drei'
import { extend } from '@react-three/fiber'

const ConsciousOrbMaterial = shaderMaterial(
  {
    uTime: 0,
    uEnergy: 1.0,
    uColorA: new THREE.Color('#7dd3ff'),
    uColorB: new THREE.Color('#c084fc')
  },

  /* vertex shader */
  `
  uniform float uTime;

  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec3 vLocalPos;

  void main() {
    vec3 pos = position;

    float breathe = sin(uTime * 0.8) * 0.02;
    pos += normal * breathe;

    vLocalPos = pos;
    vNormal = normalize(normalMatrix * normal);

    vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
    vWorldPos = worldPosition.xyz;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
  `,

  /* fragment shader */
  `
  uniform float uTime;
  uniform float uEnergy;
  uniform vec3 uColorA;
  uniform vec3 uColorB;

  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec3 vLocalPos;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.1));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float n = mix(
      mix(
        mix(hash(i + vec3(0.0, 0.0, 0.0)), hash(i + vec3(1.0, 0.0, 0.0)), f.x),
        mix(hash(i + vec3(0.0, 1.0, 0.0)), hash(i + vec3(1.0, 1.0, 0.0)), f.x),
        f.y
      ),
      mix(
        mix(hash(i + vec3(0.0, 0.0, 1.0)), hash(i + vec3(1.0, 0.0, 1.0)), f.x),
        mix(hash(i + vec3(0.0, 1.0, 1.0)), hash(i + vec3(1.0, 1.0, 1.0)), f.x),
        f.y
      ),
      f.z
    );

    return n;
  }

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(cameraPosition - vWorldPos);

    float fresnel = pow(1.0 - max(dot(N, V), 0.0), 2.5);
    float centerGlow = pow(max(dot(N, V), 0.0), 1.5);

    float micro = noise(vLocalPos * 2.0 + vec3(0.0, 0.0, uTime * 0.3));
    micro *= 0.15;

    vec3 baseColor = mix(uColorA, uColorB, fresnel);

    vec3 color = baseColor;
    color += baseColor * centerGlow * 0.6;
    color += baseColor * micro;

    vec3 emissive = baseColor * fresnel * uEnergy * 0.9;

    gl_FragColor = vec4(color + emissive, 1.0);
  }
  `
)

extend({ ConsciousOrbMaterial })

export { ConsciousOrbMaterial }