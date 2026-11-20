'use client'

import type { ThreeElements } from '@react-three/fiber'
import * as THREE from 'three'

type SurfaceKind = 'ground' | 'stone' | 'timber'
type MaterialProps = ThreeElements['meshStandardMaterial'] & { kind?: SurfaceKind }

const DETAIL_FUNCTIONS = `
varying vec3 vHomeSurfacePosition;
float homeDetailHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float homeDetailNoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(homeDetailHash(i), homeDetailHash(i + vec2(1.0, 0.0)), f.x), mix(homeDetailHash(i + vec2(0.0, 1.0)), homeDetailHash(i + vec2(1.0)), f.x), f.y);
}
vec3 homeDetailNormal(vec3 surface, vec3 normalIn, float height) {
  vec3 dx = dFdx(surface); vec3 dy = dFdy(surface);
  vec3 r1 = cross(dy, normalIn); vec3 r2 = cross(normalIn, dx);
  float determinant = dot(dx, r1);
  vec3 gradient = sign(determinant) * (dFdx(height) * r1 + dFdy(height) * r2);
  return normalize(max(abs(determinant), 0.00000001) * normalIn - gradient);
}
`

function compileOriginalDetail(kind: SurfaceKind): THREE.Material['onBeforeCompile'] {
  return (shader) => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vHomeSurfacePosition;').replace('#include <begin_vertex>', `#include <begin_vertex>
vec4 homeSurfacePoint = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
homeSurfacePoint = instanceMatrix * homeSurfacePoint;
#endif
vHomeSurfacePosition = (modelMatrix * homeSurfacePoint).xyz;`)
    const grain = kind === 'timber'
      ? 'vec2(vHomeSurfacePosition.x * 48.0 + vHomeSurfacePosition.z * 5.0, vHomeSurfacePosition.y * 17.0 + vHomeSurfacePosition.z * 1.8)'
      : 'vec2(vHomeSurfacePosition.x + vHomeSurfacePosition.z * .73, vHomeSurfacePosition.y + vHomeSurfacePosition.z * .43) * 32.0'
    // Original offline mineral/soil variation; no added texture or remote asset.
    const surfaceColor = kind === 'ground' ? `
float homeSoil = homeDetailNoise(vHomeSurfacePosition.xz * 1.35);
float homeGreen = homeDetailNoise(vHomeSurfacePosition.xz * 4.8 + vec2(1.7, 8.4));
float homeFine = homeDetailNoise(vHomeSurfacePosition.xz * 28.0);
vec3 homeEarthTint = mix(vec3(.76, .72, .59), vec3(.96, 1.055, .88), smoothstep(.19, .83, homeSoil));
homeEarthTint *= mix(.91, 1.07, homeGreen) * mix(.964, 1.035, homeFine);
diffuseColor.rgb *= homeEarthTint;`
      : kind === 'stone' ? `
float homeVein = homeDetailNoise(vHomeSurfacePosition.xz * 7.1 + vHomeSurfacePosition.y * 2.8);
float homeMottle = homeDetailNoise(vHomeSurfacePosition.xz * 19.0 + vHomeSurfacePosition.y * 4.2);
vec3 homeMineralTint = mix(vec3(.82, .85, .78), vec3(1.1, 1.045, .98), smoothstep(.22, .86, homeVein));
homeMineralTint *= mix(.88, 1.105, homeMottle);
diffuseColor.rgb *= homeMineralTint;`
      : ''
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\n${DETAIL_FUNCTIONS}`).replace('#include <color_fragment>', `#include <color_fragment>
float homeGrain = homeDetailNoise(${grain});
float homeBroad = homeDetailNoise(vHomeSurfacePosition.xz * 2.4);
diffuseColor.rgb *= mix(.89, 1.08, homeBroad) * mix(.94, 1.05, homeGrain);
${surfaceColor}`).replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor + (homeGrain - .5) * .065, .72, 1.0);').replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = homeDetailNormal(-vViewPosition, normal, homeGrain * .0025);')
  }
}

export const HOME_SURFACE_SHADERS = {
  ground: compileOriginalDetail('ground'),
  stone: compileOriginalDetail('stone'),
  timber: compileOriginalDetail('timber'),
}
const PROGRAM_KEYS = {
  ground: () => 'urai-original-home-ground-detail-v2-earth',
  stone: () => 'urai-original-home-stone-detail-v2-mineral',
  timber: () => 'urai-original-home-timber-detail-v1',
}

export function applyOriginalHomeSurfaceDetail(material: THREE.MeshStandardMaterial, kind: SurfaceKind) {
  material.onBeforeCompile = HOME_SURFACE_SHADERS[kind]
  material.customProgramCacheKey = PROGRAM_KEYS[kind]
  return material
}

// Bounded original procedural grain improves material response while photographic
// PBR textures are absent. It does not admit these surfaces as scanned production art.
export function HomeSurfaceMaterial({ kind = 'stone', ...props }: MaterialProps) {
  return <meshStandardMaterial {...props} onBeforeCompile={HOME_SURFACE_SHADERS[kind]} customProgramCacheKey={PROGRAM_KEYS[kind]} />
}

export function HomeSkyGradient() {
  // Original, procedural living sky: continuous horizon without a pale hard
  // band, no remote/recorded imagery and no extra GPU texture allocations.
  // The shader keeps the same outside-facing celestial shell and pure markup.
  return <mesh name="home-original-living-sky" scale={150} renderOrder={-100}>
    <sphereGeometry args={[1, 48, 24]} />
    <shaderMaterial side={THREE.BackSide} depthWrite={false} fog={false} toneMapped={false}
      vertexShader={`varying vec3 vHomeSkyDirection; void main() { vHomeSkyDirection = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`}
      fragmentShader={`
        varying vec3 vHomeSkyDirection;
        void main() {
          vec3 dir = normalize(vHomeSkyDirection);
          float altitude = clamp(dir.y * .5 + .5, 0.0, 1.0);
          float upper = smoothstep(.45, .99, altitude);
          vec3 horizon = vec3(.115, .225, .297);
          vec3 zenith = vec3(.019, .056, .102);
          vec3 sky = mix(horizon, zenith, pow(upper, .76));
          // Wide, low contrast luminous atmospheric layer. It never replaces
          // or flattens the real scene models, ground geometry or sky controls.
          float glow = exp(-pow((altitude - .51) / .16, 2.0));
          float drift = .57 + .43 * sin(dir.x * 7.0 + dir.z * 4.2);
          sky += vec3(.025, .063, .084) * glow * drift;
          float twilight = exp(-pow((altitude - .51) / .085, 2.0));
          sky += vec3(.035, .018, .019) * twilight * max(0.0, dir.x);
          gl_FragColor = vec4(sky, 1.0);
          #include <colorspace_fragment>
        }`.replace('#include <colorspace_fragment>', '\n#include <colorspace_fragment>\n')}
    />
  </mesh>
}
