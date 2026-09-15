'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { HomeVisualAuthority } from '../layout/HomeVisualAuthority'
import { HomeLaunchSanctuaryV254 } from './HomeLaunchSanctuaryV254'

function RetireSupersededV249Orb() {
  const { scene } = useThree()

  useEffect(() => {
    const legacy = scene.getObjectByName('home-v249-organic-living-memory-presence')
    if (!legacy) return

    const colorWrite = new Map<THREE.Material, boolean>()
    const castShadow = new Map<THREE.Mesh, boolean>()
    const hidden = new Map<THREE.Object3D, boolean>()

    legacy.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        castShadow.set(object, object.castShadow)
        object.castShadow = false
        const materials = Array.isArray(object.material) ? object.material : [object.material]
        materials.forEach((material) => {
          if (!colorWrite.has(material)) colorWrite.set(material, material.colorWrite)
          material.colorWrite = false
        })
        return
      }

      if (object !== legacy && (object instanceof THREE.Line || object instanceof THREE.Points || object instanceof THREE.Light)) {
        hidden.set(object, object.visible)
        object.visible = false
      }
    })

    return () => {
      colorWrite.forEach((value, material) => { material.colorWrite = value })
      castShadow.forEach((value, object) => { object.castShadow = value })
      hidden.forEach((value, object) => { object.visible = value })
    }
  }, [scene])

  return null
}

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

/** Retire every active localized Home-side Life Map gateway while preserving Ground and Orb. */
function RetireLocalizedLifeMapGateways() {
  const { scene } = useThree()

  useEffect(() => {
    const hidden = new Map<THREE.Object3D, boolean>()
    const raycasts = new Map<THREE.Object3D, THREE.Object3D['raycast']>()
    const timers: number[] = []

    const retire = () => {
      scene.traverse((object) => {
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
    }

    retire()
    timers.push(window.setTimeout(retire, 120), window.setTimeout(retire, 420))
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer))
      hidden.forEach((visible, object) => { object.visible = visible })
      raycasts.forEach((raycast, object) => { object.raycast = raycast })
    }
  }, [scene])

  return null
}

function celestialMemoryGeometry() {
  const count = 420
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const cool = new THREE.Color('#9bc7c1')
  const pearl = new THREE.Color('#e6e1c8')
  const violet = new THREE.Color('#aaa4c5')
  for (let index = 0; index < count; index++) {
    const t = (index + .5) / count
    const azimuth = index * 2.39996323
    const elevation = .10 + Math.pow((index * 37 % count) / (count - 1), .72) * 1.18
    const radius = 52 + (index % 9) * 1.8
    const horizontal = Math.cos(elevation) * radius
    positions.set([
      Math.cos(azimuth) * horizontal,
      Math.sin(elevation) * radius,
      Math.sin(azimuth) * horizontal,
    ], index * 3)
    const color = cool.clone().lerp(pearl, .25 + .55 * t)
    if (index % 11 === 0) color.lerp(violet, .42)
    colors.set([color.r, color.g, color.b], index * 3)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geometry
}

/** Distant authored atmosphere plus the canonical broad-sky Life Map threshold. */
export function HomeAtmosphericSky({ reducedMotion, active = false, onLifeMap }: { reducedMotion: boolean; active?: boolean; onLifeMap: () => void }) {
  const mesh = useRef<THREE.Mesh>(null)
  const stars = useRef<THREE.Points>(null)
  const [focused, setFocused] = useState(false)
  const starGeometry = useMemo(celestialMemoryGeometry, [])
  const material = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    uniforms: {
      uTime: { value: 0 },
      uFocus: { value: 0 },
      uZenith: { value: new THREE.Color('#071922') },
      uMid: { value: new THREE.Color('#244044') },
      uHorizon: { value: new THREE.Color('#696c60') },
      uCloud: { value: new THREE.Color('#68837f') },
      uWarm: { value: new THREE.Color('#bc835b') },
    },
    vertexShader: 'varying vec3 vDirection; void main() { vDirection=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `
      varying vec3 vDirection;
      uniform float uTime, uFocus;
      uniform vec3 uZenith, uMid, uHorizon, uCloud, uWarm;

      float hash(vec3 p) {
        p=fract(p*.3183099+.13);
        p*=17.;
        return fract(p.x*p.y*p.z*(p.x+p.y+p.z));
      }

      float noise(vec3 p) {
        vec3 i=floor(p), f=fract(p);
        f=f*f*(3.-2.*f);
        return mix(
          mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
          mix(mix(hash(i),hash(i+vec3(0,0,1)),f.z),mix(hash(i+vec3(0,1,0)),hash(i+vec3(0,1,1)),f.z),f.y),
          f.z
        );
      }

      void main() {
        vec3 direction=normalize(vDirection);
        float elevation=max(0.,direction.y);
        float lower=smoothstep(-.035,.18,direction.y);
        float upper=smoothstep(.13,.70,direction.y);
        vec3 sky=mix(uHorizon,uMid,lower);
        sky=mix(sky,uZenith,upper);

        vec3 p=direction*vec3(5.4,20.,5.4)+vec3(uTime*.0012,0.,uTime*.00025);
        float cloud=noise(p)+.48*noise(p*2.03+2.1)+.20*noise(p*4.07-3.4);
        float band=smoothstep(.69,1.10,cloud)*smoothstep(.02,.10,elevation)*(1.-smoothstep(.48,.88,elevation));
        float veil=smoothstep(.78,1.18,noise(p*.58+9.3))*smoothstep(.08,.20,elevation)*(1.-smoothstep(.72,.96,elevation));
        sky=mix(sky,uCloud,band*.38+veil*.12);

        vec3 sunDir=normalize(vec3(-.68,.15,-.72));
        float sunDot=max(0.,dot(direction,sunDir));
        float halo=pow(sunDot,10.);
        float core=pow(sunDot,96.);
        sky+=uWarm*(halo*.13+core*.28);
        sky+=mix(uMid,uWarm,.28)*uFocus*(.025+.075*elevation);

        float horizonMist=(1.-smoothstep(.00,.15,elevation))*.12;
        sky=mix(sky,mix(uHorizon,uCloud,.34),horizonMist);

        gl_FragColor=vec4(sky,1.);
        #include <colorspace_fragment>
      }
    `,
  }), [])

  useEffect(() => () => { material.dispose(); starGeometry.dispose() }, [material, starGeometry])
  useEffect(() => {
    document.body.style.cursor = focused && !active ? 'pointer' : 'default'
    return () => { document.body.style.cursor = 'default' }
  }, [active, focused])

  useFrame(({ camera, clock }, delta) => {
    if (mesh.current) mesh.current.position.copy(camera.position)
    if (stars.current) {
      stars.current.position.copy(camera.position)
      if (!reducedMotion) stars.current.rotation.y = clock.elapsedTime * .0018
    }
    material.uniforms.uTime.value = reducedMotion ? 0 : clock.elapsedTime
    material.uniforms.uFocus.value = THREE.MathUtils.damp(material.uniforms.uFocus.value, active ? 1 : focused ? .62 : 0, 5.5, delta)
  })

  const validSkyRay = (event: ThreeEvent<MouseEvent>) => event.ray.direction.y > .015
  const activateSky = (event: ThreeEvent<MouseEvent>) => {
    if (active || !validSkyRay(event)) return
    event.stopPropagation()
    onLifeMap()
  }

  return <>
    <RetireSupersededV249Orb />
    <RetireLocalizedLifeMapGateways />
    <HomeVisualAuthority />
    <HomeLaunchSanctuaryV254 reducedMotion={reducedMotion} />
    <points ref={stars} geometry={starGeometry} raycast={() => null} frustumCulled={false} name="home-sky-memory-star-foreshadowing" renderOrder={-99}>
      <pointsMaterial vertexColors size={active ? .070 : focused ? .052 : .036} transparent opacity={active ? .76 : focused ? .54 : .34} depthWrite={false} sizeAttenuation />
    </points>
    <mesh
      ref={mesh}
      name="home-sky-life-map-threshold"
      renderOrder={-100}
      material={material}
      onPointerMove={(event) => setFocused(!active && validSkyRay(event))}
      onPointerOut={() => setFocused(false)}
      onClick={activateSky}
      userData={{ interactionOwner: true, destination: 'life-map', threshold: 'broad-visible-sky', localGroundPortal: false }}
    >
      <sphereGeometry args={[74, 48, 32]} />
    </mesh>
  </>
}
