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
float homeMacro = homeDetailNoise(vHomeSurfacePosition.xz * .52 + vec2(7.3, -3.1));
float homeMottle = homeDetailNoise(vHomeSurfacePosition.xz * 7.8 + vec2(-2.4, 5.7));
float homeVariation = mix(.82, 1.14, homeMacro) * mix(.92, 1.07, homeBroad) * mix(.965, 1.025, homeMottle);
diffuseColor.rgb *= homeVariation * mix(.94, 1.05, homeGrain);`).replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor + (homeGrain - .5) * .085 + (homeMacro - .5) * .04, .68, 1.0);').replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = homeDetailNormal(-vViewPosition, normal, homeGrain * .0038 + homeMottle * .0016);')
  }
}

export const HOME_SURFACE_SHADERS = {
  ground: compileOriginalDetail('ground'),
  stone: compileOriginalDetail('stone'),
  timber: compileOriginalDetail('timber'),
}
const PROGRAM_KEYS = {
  ground: () => 'urai-original-home-ground-detail-v2',
  stone: () => 'urai-original-home-stone-detail-v2',
  timber: () => 'urai-original-home-timber-detail-v2',
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

export function HomeSkyGradient({ ascentUniform = { value: 0 } }: { ascentUniform?: THREE.IUniform<number> } = {}) {
  return <mesh name="home-original-living-sky" scale={150} renderOrder={-100}>
    <sphereGeometry args={[1, 64, 32]} />
    <shaderMaterial side={THREE.BackSide} depthWrite={false} fog={false} toneMapped={false} transparent uniforms={{ uHomeAscent: ascentUniform }}
      vertexShader={`varying vec3 vHomeSkyDirection; void main() { vHomeSkyDirection = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`}
      fragmentShader={`
        varying vec3 vHomeSkyDirection;
        uniform float uHomeAscent;
        float skyHash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }
        float skyNoise(vec2 p) {
          vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
          return mix(mix(skyHash(i),skyHash(i+vec2(1.,0.)),f.x),mix(skyHash(i+vec2(0.,1.)),skyHash(i+vec2(1.,1.)),f.x),f.y);
        }
        void main() {
          vec3 dir=normalize(vHomeSkyDirection);
          float height=clamp(dir.y,0.0,1.0);
          float horizonBand=exp(-height*7.2);
          vec3 horizon=vec3(.012,.024,.050);
          vec3 upper=vec3(.003,.007,.022);
          vec3 zenith=vec3(.001,.003,.011);
          vec3 sky=mix(horizon,upper,smoothstep(.0,.48,height));
          sky=mix(sky,zenith,smoothstep(.38,1.0,height));
          vec2 cloudUv=dir.xz/max(.2,abs(dir.y)+.34);
          float broad=skyNoise(cloudUv*1.65+vec2(2.1,-1.4));
          float fine=skyNoise(cloudUv*4.2+vec2(-.8,3.3));
          float cloud=smoothstep(.56,.79,broad*.72+fine*.28)*(1.0-smoothstep(.72,1.0,height));
          vec3 cloudTint=mix(vec3(.032,.048,.085),vec3(.012,.027,.061),height);
          sky=mix(sky,cloudTint,cloud*.12);
          vec3 sunDir=normalize(vec3(-.34,.34,-.88));
          float sunDot=max(dot(dir,sunDir),0.0);
          float sunGlow=pow(sunDot,28.0)*.055+pow(sunDot,240.0)*.12;
          sky+=vec3(.62,.72,1.0)*sunGlow;
          sky+=vec3(.006,.004,.006)*horizonBand;
          // A fixed, original star field stays visible above the horizon even
          // on low-power devices. No image or reconstructed place is implied.
          vec2 skyUv=vec2(atan(dir.z,dir.x)/6.2831853+.5,asin(dir.y)/3.14159265+.5);
          vec2 cells=skyUv*vec2(720.,360.);
          vec2 cell=floor(cells);
          vec2 point=fract(cells)-vec2(.18+.64*skyHash(cell+3.7),.18+.64*skyHash(cell+9.1));
          float seed=skyHash(cell);
          float radius=mix(.025,.085,skyHash(cell+2.4));
          float aa=max(fwidth(cells.x),fwidth(cells.y))*.65;
          float star=(1.-smoothstep(radius,radius+aa,length(point)))*step(.991,seed);
          vec3 starColor=mix(vec3(.54,.72,1.),vec3(1.,.83,.62),skyHash(cell+4.2));
          sky+=starColor*star*smoothstep(.015,.18,dir.y)*(.65+skyHash(cell+1.3)*.8);
          float stellarBand=exp(-pow((dir.y-.28-dir.x*.18)*7.5,2.));
          sky+=vec3(.003,.004,.012)*stellarBand*(.4+.6*broad)*smoothstep(.02,.3,height);
          gl_FragColor=vec4(sky,1.0 - uHomeAscent);
          #include <colorspace_fragment>
        }`.replace('#include <colorspace_fragment>', '\n#include <colorspace_fragment>\n')}
    />
  </mesh>
}
