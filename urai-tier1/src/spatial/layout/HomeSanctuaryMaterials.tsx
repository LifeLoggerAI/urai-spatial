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
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\n${DETAIL_FUNCTIONS}`).replace('#include <color_fragment>', `#include <color_fragment>
float homeGrain = homeDetailNoise(${grain});
float homeBroad = homeDetailNoise(vHomeSurfacePosition.xz * 2.4);
diffuseColor.rgb *= mix(.89, 1.08, homeBroad) * mix(.94, 1.05, homeGrain);`).replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor + (homeGrain - .5) * .065, .72, 1.0);').replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = homeDetailNormal(-vViewPosition, normal, homeGrain * .0025);')
  }
}

export const HOME_SURFACE_SHADERS = {
  ground: compileOriginalDetail('ground'),
  stone: compileOriginalDetail('stone'),
  timber: compileOriginalDetail('timber'),
}
const PROGRAM_KEYS = {
  ground: () => 'urai-original-home-ground-detail-v1',
  stone: () => 'urai-original-home-stone-detail-v1',
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
  return <mesh name="home-original-living-sky" scale={150} renderOrder={-100}>
    <sphereGeometry args={[1, 32, 16]} />
    <shaderMaterial side={THREE.BackSide} depthWrite={false} fog={false} toneMapped={false}
      vertexShader={`varying vec3 vHomeSkyDirection; void main() { vHomeSkyDirection = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`}
      fragmentShader={`varying vec3 vHomeSkyDirection; void main() { float height = clamp(normalize(vHomeSkyDirection).y, 0.0, 1.0); vec3 horizon = vec3(.41, .51, .48); vec3 zenith = vec3(.075, .16, .19); vec3 sky = mix(horizon, zenith, pow(height, .42)); gl_FragColor = vec4(sky, 1.0); #include <colorspace_fragment> }`.replace('#include <colorspace_fragment>', '\n#include <colorspace_fragment>\n')}
    />
  </mesh>
}
