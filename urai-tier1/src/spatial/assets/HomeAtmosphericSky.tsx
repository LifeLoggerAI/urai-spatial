'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { HomeVisualAuthority } from '../layout/HomeVisualAuthority'

const retiredLifeMapNames = [
  /life-map-rooted-celestial-ascent/,
  /life-map-rooted-ascent/,
  /life-map-rooted-branching-threshold/,
  /life-map-lineage-observatory/,
  /life-map-rooted-memory-observatory/,
  /life-map-geology/,
  /rooted-ascent-structure/,
  /rooted-ascent-ribbons/,
  /life-map-asymmetric-root-threshold/,
]

/** Retire localized portal-era Life Map geometry; the visible sky owns ascent. */
function RetireLocalizedLifeMapGateways() {
  const { scene } = useThree()
  useEffect(() => {
    const hidden = new Map<THREE.Object3D, boolean>()
    const raycasts = new Map<THREE.Object3D, THREE.Object3D['raycast']>()
    const retire = () => scene.traverse((object) => {
      const localizedLifeMap = retiredLifeMapNames.some((pattern) => pattern.test(object.name))
      const localizedV282Light = object instanceof THREE.PointLight
        && object.parent?.name === 'home-v282-scanned-destination-geology'
        && object.position.x > 1
      if (!localizedLifeMap && !localizedV282Light) return
      if (!hidden.has(object)) hidden.set(object, object.visible)
      object.visible = false
      if (!raycasts.has(object)) raycasts.set(object, object.raycast)
      object.raycast = () => undefined
      object.traverse((child) => {
        if (!raycasts.has(child)) raycasts.set(child, child.raycast)
        child.raycast = () => undefined
      })
    })
    retire()
    const timers = [window.setTimeout(retire, 80), window.setTimeout(retire, 260), window.setTimeout(retire, 700)]
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer))
      hidden.forEach((visible, object) => { object.visible = visible })
      raycasts.forEach((raycast, object) => { object.raycast = raycast })
    }
  }, [scene])
  return null
}

function celestialMemoryGeometry() {
  const count = 260
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const cool = new THREE.Color('#9bc7c1')
  const pearl = new THREE.Color('#e6e1c8')
  for (let index = 0; index < count; index++) {
    const t = (index + .5) / count
    const azimuth = index * 2.39996323
    const elevation = .16 + Math.pow((index * 37 % count) / (count - 1), .72) * 1.08
    const radius = 58 + (index % 7) * 1.4
    const horizontal = Math.cos(elevation) * radius
    positions.set([Math.cos(azimuth) * horizontal, Math.sin(elevation) * radius, Math.sin(azimuth) * horizontal], index * 3)
    const color = cool.clone().lerp(pearl, .30 + .50 * t)
    colors.set([color.r, color.g, color.b], index * 3)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geometry
}

/**
 * Physical atmosphere and the canonical broad visible-sky Life Map threshold.
 * The custom raycast belongs to this visible sky mesh itself; it is not a
 * hidden portal plane. Nearer visible physical geometry still wins raycasts.
 */
export function HomeAtmosphericSky({ reducedMotion, active = false, onLifeMap }: { reducedMotion: boolean; active?: boolean; onLifeMap: () => void }) {
  const mesh = useRef<THREE.Mesh>(null)
  const stars = useRef<THREE.Points>(null)
  const [focused, setFocused] = useState(false)
  const starGeometry = useMemo(celestialMemoryGeometry, [])
  const material = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    depthWrite: false,
    depthTest: false,
    uniforms: {
      uTime: { value: 0 },
      uFocus: { value: 0 },
      uZenith: { value: new THREE.Color('#173746') },
      uMid: { value: new THREE.Color('#4c7074') },
      uHorizon: { value: new THREE.Color('#b2a88f') },
      uCloud: { value: new THREE.Color('#d1d5ca') },
      uWarm: { value: new THREE.Color('#e0aa7d') },
    },
    vertexShader: 'varying vec3 vDirection; void main(){vDirection=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `
      varying vec3 vDirection;
      uniform float uTime,uFocus;
      uniform vec3 uZenith,uMid,uHorizon,uCloud,uWarm;
      float hash(vec3 p){p=fract(p*.3183099+.13);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
      float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
      void main(){
        vec3 d=normalize(vDirection);float e=max(0.,d.y);float lower=smoothstep(-.04,.22,d.y);float upper=smoothstep(.18,.78,d.y);
        vec3 sky=mix(uHorizon,uMid,lower);sky=mix(sky,uZenith,upper);
        vec3 p=d*vec3(4.6,16.,4.6)+vec3(uTime*.0007,0.,uTime*.00018);
        float cloud=noise(p)+.42*noise(p*2.03+2.1)+.16*noise(p*4.07-3.4);
        float band=smoothstep(.82,1.18,cloud)*smoothstep(.02,.12,e)*(1.-smoothstep(.55,.92,e));
        sky=mix(sky,uCloud,band*.28);
        vec3 sunDir=normalize(vec3(-.68,.16,-.72));float sunDot=max(0.,dot(d,sunDir));sky+=uWarm*(pow(sunDot,10.)*.12+pow(sunDot,96.)*.34);
        sky+=mix(uMid,uWarm,.18)*uFocus*(.018+.045*e);
        gl_FragColor=vec4(sky,1.);
        #include <colorspace_fragment>
      }`,
  }), [])

  useEffect(() => () => { material.dispose(); starGeometry.dispose() }, [material, starGeometry])
  useEffect(() => {
    document.body.style.cursor = focused && !active ? 'pointer' : 'default'
    return () => { document.body.style.cursor = 'default' }
  }, [active, focused])

  useFrame(({ camera, clock }, delta) => {
    mesh.current?.position.copy(camera.position)
    if (stars.current) {
      stars.current.position.copy(camera.position)
      if (!reducedMotion) stars.current.rotation.y = clock.elapsedTime * .0011
    }
    material.uniforms.uTime.value = reducedMotion ? 0 : clock.elapsedTime
    material.uniforms.uFocus.value = THREE.MathUtils.damp(material.uniforms.uFocus.value, active ? 1 : focused ? .55 : 0, 5.5, delta)
  })

  const validSkyRay = (event: ThreeEvent<MouseEvent>) => event.ray.direction.y > .015
  const skyRaycast = useCallback((raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) => {
    const object = mesh.current
    if (!object || raycaster.ray.direction.y <= .015) return
    const distance = 72
    intersects.push({ distance, point: raycaster.ray.at(distance, new THREE.Vector3()), object })
  }, [])
  const activateSky = (event: ThreeEvent<MouseEvent>) => {
    if (active || !validSkyRay(event)) return
    event.stopPropagation()
    onLifeMap()
  }

  return <>
    <RetireLocalizedLifeMapGateways />
    <HomeVisualAuthority />
    <points ref={stars} geometry={starGeometry} raycast={() => null} frustumCulled={false} name="home-sky-memory-star-foreshadowing" renderOrder={-99}>
      <pointsMaterial vertexColors size={active ? .060 : focused ? .044 : .030} transparent opacity={active ? .66 : focused ? .40 : .20} depthWrite={false} sizeAttenuation />
    </points>
    <mesh
      ref={mesh}
      name="home-sky-life-map-threshold"
      renderOrder={-100}
      material={material}
      raycast={skyRaycast}
      onPointerMove={(event) => setFocused(!active && validSkyRay(event))}
      onPointerOut={() => setFocused(false)}
      onClick={activateSky}
      userData={{ interactionOwner: true, destination: 'life-map', threshold: 'broad-visible-sky', localGroundPortal: false }}
    >
      <sphereGeometry args={[74, 48, 32]} />
    </mesh>
  </>
}
