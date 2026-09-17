'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import {
  HOME_EMOTIONAL_WEATHER_PRESETS,
  URAI_HOME_EMOTIONAL_WEATHER_EVENT,
  resolveAdaptiveBlueHour,
  resolveHomeEmotionalWeather,
  type HomeAtmosphereParameters,
} from '../environment/HomeEmotionalWeatherState'
import {
  HOME_SKY_CONTINUITY_SEED,
  HOME_SKY_PRECURSOR_COUNT,
  homeSkyContinuityIds,
  homeSkyContinuitySample,
} from '../visual/homeSkyContinuity'
import { height } from '../layout/HomeWorldProductionV223Geometry'
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

const CLOUD_LAYERS = [
  { name: 'home-sky-lower-distant-vapor', radius: 61, start: .015, end: .30, opacity: .14, scale: 3.2, windX: .0030, windZ: .0005, warm: .42 },
  { name: 'home-sky-primary-stratiform-clouds', radius: 67, start: .09, end: .72, opacity: .34, scale: 4.8, windX: .0075, windZ: .0018, warm: .22 },
  { name: 'home-sky-high-memory-filaments', radius: 72, start: .40, end: .93, opacity: .10, scale: 7.0, windX: .0110, windZ: -.0012, warm: .06 },
] as const

const ORB_X = 1.02
const ORB_Z = .72

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

const fract = (value: number) => value - Math.floor(value)
function seeded(index: number, salt: number) {
  return fract(Math.sin((index + 1) * 73.197 + salt * 19.117 + 12.73) * 43758.5453123)
}

function celestialMemoryGeometry() {
  const count = 260
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const phases = new Float32Array(count)
  const classes = new Float32Array(count)
  const scintillation = new Float32Array(count)
  const cool = new THREE.Color('#d4e1dd')
  const pearl = new THREE.Color('#e9e3cf')
  const paleTeal = new THREE.Color('#a9c8c2')
  const warmPearl = new THREE.Color('#e6d7bd')

  for (let index = 0; index < count; index += 1) {
    const starClass = index < HOME_SKY_PRECURSOR_COUNT ? 2 : index < HOME_SKY_PRECURSOR_COUNT + 8 ? 3 : index < HOME_SKY_PRECURSOR_COUNT + 60 ? 1 : 0
    let azimuth: number
    let elevation: number
    let radius: number
    let phase: number
    let temperature: number

    if (starClass === 2) {
      const sample = homeSkyContinuitySample(index)
      azimuth = sample.azimuth
      elevation = sample.elevation
      radius = 91 + sample.depth * 14
      phase = sample.phase
      temperature = sample.temperature
    } else {
      azimuth = (index * 2.399963229728653 + (seeded(index, 1) - .5) * .34) % (Math.PI * 2)
      elevation = .18 + Math.pow(seeded(index, 2), .72) * 1.12
      radius = starClass === 3 ? 108 + seeded(index, 3) * 8 : starClass === 1 ? 96 + seeded(index, 3) * 14 : 88 + seeded(index, 3) * 24
      phase = seeded(index, 4) * Math.PI * 2
      temperature = seeded(index, 5)
    }

    const horizontal = Math.cos(elevation) * radius
    positions.set([Math.cos(azimuth) * horizontal, Math.sin(elevation) * radius, Math.sin(azimuth) * horizontal], index * 3)

    const spectralBase = starClass === 2
      ? paleTeal.clone().lerp(pearl, .40 + temperature * .42)
      : starClass === 3
        ? pearl.clone().lerp(warmPearl, temperature * .20)
        : temperature > .76
          ? warmPearl.clone().lerp(pearl, .72)
          : cool.clone().lerp(pearl, .30 + temperature * .52)
    colors.set([spectralBase.r, spectralBase.g, spectralBase.b], index * 3)
    sizes[index] = starClass === 3 ? 1.55 + seeded(index, 6) * .34 : starClass === 2 ? 1.28 + seeded(index, 6) * .30 : starClass === 1 ? 1.08 + seeded(index, 6) * .28 : .82 + seeded(index, 6) * .24
    phases[index] = phase
    classes[index] = starClass
    scintillation[index] = starClass < 2 && seeded(index, 7) < .15 ? .35 + seeded(index, 8) * .65 : 0
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))
  geometry.setAttribute('aClass', new THREE.BufferAttribute(classes, 1))
  geometry.setAttribute('aScintillation', new THREE.BufferAttribute(scintillation, 1))
  geometry.userData = {
    continuitySeed: HOME_SKY_CONTINUITY_SEED,
    continuityIds: homeSkyContinuityIds(),
    classBudget: { physical: 169, anchor: 52, precursor: HOME_SKY_PRECURSOR_COUNT, deepAnchor: 8 },
  }
  return geometry
}

function makeStarMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    toneMapped: false,
    vertexColors: true,
    uniforms: {
      uTime: { value: 0 },
      uFocus: { value: 0 },
      uActive: { value: 0 },
      uMotion: { value: 1 },
      uCelestial: { value: .54 },
      uTimeStars: { value: 1 },
      uPixelRatio: { value: 1 },
    },
    vertexShader: `
      attribute float aSize;
      attribute float aPhase;
      attribute float aClass;
      attribute float aScintillation;
      varying vec3 vColor;
      varying float vPhase;
      varying float vClass;
      varying float vScintillation;
      varying float vElevation;
      uniform float uPixelRatio;
      void main(){
        vec4 mvPosition=modelViewMatrix*vec4(position,1.0);
        gl_Position=projectionMatrix*mvPosition;
        float perspective=clamp(96.0/max(1.0,-mvPosition.z),.72,2.1);
        gl_PointSize=max(1.0,aSize*perspective*uPixelRatio);
        vColor=color;
        vPhase=aPhase;
        vClass=aClass;
        vScintillation=aScintillation;
        vElevation=normalize(position).y;
      }`,
    fragmentShader: `
      varying vec3 vColor;
      varying float vPhase;
      varying float vClass;
      varying float vScintillation;
      varying float vElevation;
      uniform float uTime,uFocus,uActive,uMotion,uCelestial,uTimeStars;
      void main(){
        vec2 p=gl_PointCoord-vec2(.5);
        float r=length(p);
        if(r>.5) discard;
        float core=1.0-smoothstep(.10,.43,r);
        float halo=(1.0-smoothstep(.25,.5,r))*.20;
        float horizonExtinction=smoothstep(.08,.34,vElevation);
        float period=.48+fract(vPhase*.173)*.95;
        float scint=1.0+sin(uTime*period+vPhase)*(.055*vScintillation*uMotion);
        float classGain=vClass<.5?.64:vClass<1.5?.80:vClass<2.5?.94:1.0;
        float intent=1.0+uFocus*(vClass>1.5?.16:.04)+uActive*(vClass>1.5?.38:.20);
        float alpha=(core+halo)*horizonExtinction*classGain*uCelestial*uTimeStars*scint*intent;
        if(alpha<.008) discard;
        gl_FragColor=vec4(vColor*scint,alpha);
        #include <colorspace_fragment>
      }`,
  })
}

function makeAtmosphereMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    uniforms: {
      uTime: { value: 0 },
      uFocus: { value: 0 },
      uActive: { value: 0 },
      uClarity: { value: .78 },
      uAerosol: { value: .31 },
      uHorizonTransmission: { value: .68 },
      uTimeLuminance: { value: 1 },
      uTemperatureBias: { value: 0 },
      uZenith: { value: new THREE.Color('#071319') },
      uHigh: { value: new THREE.Color('#173746') },
      uMid: { value: new THREE.Color('#3f6669') },
      uHorizon: { value: new THREE.Color('#7f897d') },
      uWarm: { value: new THREE.Color('#c98f68') },
      uCool: { value: new THREE.Color('#789b9a') },
    },
    vertexShader: `
      varying vec3 vDirection;
      void main(){
        vDirection=normalize(position);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
      }`,
    fragmentShader: `
      varying vec3 vDirection;
      uniform float uTime,uFocus,uActive,uClarity,uAerosol,uHorizonTransmission,uTimeLuminance,uTemperatureBias;
      uniform vec3 uZenith,uHigh,uMid,uHorizon,uWarm,uCool;
      float hash12(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
      void main(){
        vec3 d=normalize(vDirection);
        float e=clamp(d.y,0.0,1.0);
        float lower=smoothstep(-.02,.17,d.y);
        float canopy=smoothstep(.20,.56,e);
        float zen=smoothstep(.60,.96,e);
        vec3 sky=mix(uHorizon,uMid,lower);
        sky=mix(sky,uHigh,canopy);
        sky=mix(sky,uZenith,zen);

        float horizonPath=exp(-e*(5.6+uClarity*2.0));
        float aerosol=horizonPath*(.36+uAerosol*.70);
        sky=mix(sky,uHorizon,clamp(aerosol*.18,0.0,.30));
        sky+=uCool*(.016+.026*(1.0-e))*uClarity;

        vec3 sourceDir=normalize(vec3(-.68,.16,-.72));
        float mu=max(0.0,dot(d,sourceDir));
        float mie=pow(mu,9.0)*.040+pow(mu,68.0)*.080;
        float warmEnvelope=(1.0-smoothstep(.16,.38,e))*uHorizonTransmission;
        sky+=uWarm*(mie+warmEnvelope*.015);
        sky+=uWarm*uTemperatureBias*warmEnvelope*.11;

        float focusEnvelope=smoothstep(.24,.90,e);
        sky+=mix(uMid,uWarm,.12)*uFocus*(.009+.018*focusEnvelope);

        vec3 cosmicDepth=mix(vec3(.022,.055,.067),vec3(.006,.018,.024),zen);
        float ascentReveal=uActive*smoothstep(.26,.96,e)*.72;
        sky=mix(sky,cosmicDepth,ascentReveal);
        sky*=uTimeLuminance;

        float dither=(hash12(gl_FragCoord.xy+vec2(uTime*.07,0.0))-.5)/255.0;
        sky+=dither;
        gl_FragColor=vec4(max(sky,vec3(.002)),1.0);
        #include <colorspace_fragment>
      }`,
  })
}

function makeCloudMaterial(layer: typeof CLOUD_LAYERS[number]) {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    uniforms: {
      uTime: { value: 0 },
      uMotion: { value: 1 },
      uActive: { value: 0 },
      uCloudCover: { value: .26 },
      uClarity: { value: .78 },
      uWindCoherence: { value: .84 },
      uBandStart: { value: layer.start },
      uBandEnd: { value: layer.end },
      uOpacity: { value: layer.opacity },
      uScale: { value: layer.scale },
      uWind: { value: new THREE.Vector2(layer.windX, layer.windZ) },
      uWarmWeight: { value: layer.warm },
      uPearl: { value: new THREE.Color('#c4cbc3') },
      uCool: { value: new THREE.Color('#647f80') },
      uWarm: { value: new THREE.Color('#b98d6d') },
    },
    vertexShader: `
      varying vec3 vDirection;
      void main(){
        vDirection=normalize(position);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
      }`,
    fragmentShader: `
      varying vec3 vDirection;
      uniform float uTime,uMotion,uActive,uCloudCover,uClarity,uWindCoherence,uBandStart,uBandEnd,uOpacity,uScale,uWarmWeight;
      uniform vec2 uWind;
      uniform vec3 uPearl,uCool,uWarm;
      float hash(vec3 p){p=fract(p*.3183099+.13);p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
      float noise(vec3 p){
        vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
        return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
      }
      float fbm(vec3 p){
        float a=.58;
        float value=a*noise(p);
        p=p*2.03+vec3(1.7,-2.1,3.4);a*=.48;value+=a*noise(p);
        p=p*1.97+vec3(-3.2,1.4,.8);a*=.46;value+=a*noise(p);
        return value/1.0;
      }
      void main(){
        vec3 d=normalize(vDirection);
        float e=clamp(d.y,0.0,1.0);
        float lower=smoothstep(uBandStart,uBandStart+.065,e);
        float upper=1.0-smoothstep(max(uBandStart+.09,uBandEnd-.09),uBandEnd,e);
        float band=lower*upper;
        if(band<.002) discard;

        float motionTime=uTime*uMotion;
        vec3 travel=vec3(uWind.x*motionTime,0.0,uWind.y*motionTime);
        vec3 p=d*uScale+travel;
        float macro=fbm(p);
        float erosion=noise(p*2.27+vec3(5.2,-1.7,2.6));
        float coherence=mix(noise(p*.47+8.0),macro,uWindCoherence);
        float field=macro*.70+erosion*.17+coherence*.13;
        float threshold=mix(.62,.44,uCloudCover);
        float density=smoothstep(threshold,threshold+.115,field);
        density*=band;

        vec3 sourceDir=normalize(vec3(-.68,.16,-.72));
        float light=max(0.0,dot(d,sourceDir));
        vec3 cloud=mix(uCool,uPearl,.50+.24*uClarity);
        cloud=mix(cloud,uWarm,pow(light,7.0)*uWarmWeight*.36);
        float edge=smoothstep(.02,.42,density);
        float alpha=edge*uOpacity*(1.0-uActive*.58);
        if(alpha<.004) discard;
        gl_FragColor=vec4(cloud,alpha);
        #include <colorspace_fragment>
      }`,
  })
}

function orbAirGeometry() {
  const count = 24
  const positions = new Float32Array(count * 3)
  const opacity = new Float32Array(count)
  const size = new Float32Array(count)
  const phase = new Float32Array(count)
  for (let index = 0; index < count; index += 1) {
    const angle = seeded(index, 31) * Math.PI * 2
    const radius = .24 + seeded(index, 32) * .86
    positions.set([
      Math.cos(angle) * radius,
      -.10 + seeded(index, 33) * 1.15,
      Math.sin(angle) * radius * .72,
    ], index * 3)
    opacity[index] = index % 6 === 0 ? .18 : .020 + seeded(index, 34) * .035
    size[index] = index % 6 === 0 ? 2.0 : 1.1 + seeded(index, 35) * .5
    phase[index] = seeded(index, 36) * Math.PI * 2
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('aOpacity', new THREE.BufferAttribute(opacity, 1))
  geometry.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1))
  return geometry
}

function makeOrbAirMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    toneMapped: false,
    uniforms: {
      uTime: { value: 0 },
      uMotion: { value: 1 },
      uIntensity: { value: .45 },
      uPixelRatio: { value: 1 },
    },
    vertexShader: `
      attribute float aOpacity;
      attribute float aSize;
      attribute float aPhase;
      varying float vOpacity;
      uniform float uTime,uMotion,uPixelRatio;
      void main(){
        vec3 p=position;
        p.y+=sin(uTime*.13+aPhase)*.018*uMotion;
        p.x+=cos(uTime*.09+aPhase)*.010*uMotion;
        vec4 mvPosition=modelViewMatrix*vec4(p,1.0);
        gl_Position=projectionMatrix*mvPosition;
        gl_PointSize=max(1.0,aSize*uPixelRatio*clamp(9.0/max(1.0,-mvPosition.z),.7,1.5));
        vOpacity=aOpacity;
      }`,
    fragmentShader: `
      varying float vOpacity;
      uniform float uIntensity;
      void main(){
        vec2 p=gl_PointCoord-vec2(.5);
        float r=length(p);
        if(r>.5) discard;
        float falloff=1.0-smoothstep(.05,.5,r);
        gl_FragColor=vec4(vec3(.72,.83,.78),falloff*vOpacity*uIntensity);
        #include <colorspace_fragment>
      }`,
  })
}

function OrbLocalAir({ reducedMotion }: { reducedMotion: boolean }) {
  const { gl } = useThree()
  const geometry = useMemo(orbAirGeometry, [])
  const material = useMemo(makeOrbAirMaterial, [])
  const targetIntensity = useRef(.45)
  const currentIntensity = useRef(.45)
  const groundY = useMemo(() => height(ORB_X, ORB_Z), [])

  useEffect(() => {
    const onOrbState = (event: Event) => {
      const state = (event as CustomEvent<{ state?: string }>).detail?.state
      targetIntensity.current = state === 'speaking' ? .82
        : state === 'listening' || state === 'attention' ? .68
          : state === 'transition' ? .60
            : state === 'warning' ? .56
              : state === 'dormant' ? .24
                : .45
    }
    window.addEventListener('urai:orb-state', onOrbState)
    return () => window.removeEventListener('urai:orb-state', onOrbState)
  }, [])

  useEffect(() => () => { geometry.dispose(); material.dispose() }, [geometry, material])

  useFrame(({ clock }, delta) => {
    currentIntensity.current = THREE.MathUtils.damp(currentIntensity.current, targetIntensity.current, 1.4, delta)
    material.uniforms.uIntensity.value = currentIntensity.current
    material.uniforms.uTime.value = reducedMotion ? 0 : clock.elapsedTime
    material.uniforms.uMotion.value = reducedMotion ? 0 : 1
    material.uniforms.uPixelRatio.value = Math.min(2, gl.getPixelRatio())
  })

  return <points
    position={[ORB_X, groundY + .10, ORB_Z]}
    geometry={geometry}
    material={material}
    name="home-orb-local-atmospheric-moisture"
    frustumCulled={false}
    raycast={() => null}
    renderOrder={8}
    userData={{ visualOnly: true, localAtmosphericCoupling: true, particleCount: 24, consciouslyVisibleTarget: 4 }}
  />
}

/**
 * Physical atmosphere and the canonical broad visible-sky Life Map threshold.
 * The sky owns upward visible rays directly; lower-world rays never enter this
 * interaction owner. This is broad environmental selection, not a hidden
 * portal plane, ring, hotspot, or localized gateway.
 */
export function HomeAtmosphericSky({ reducedMotion, active = false, onLifeMap }: { reducedMotion: boolean; active?: boolean; onLifeMap: () => void }) {
  const atmosphere = useRef<THREE.Mesh>(null)
  const [focused, setFocused] = useState(false)
  const { gl, scene } = useThree()
  const starGeometry = useMemo(celestialMemoryGeometry, [])
  const starMaterial = useMemo(makeStarMaterial, [])
  const atmosphereMaterial = useMemo(makeAtmosphereMaterial, [])
  const cloudMaterials = useMemo(() => CLOUD_LAYERS.map(makeCloudMaterial), [])
  const weatherTarget = useRef<HomeAtmosphereParameters>(HOME_EMOTIONAL_WEATHER_PRESETS.calm)
  const weatherCurrent = useRef({ ...HOME_EMOTIONAL_WEATHER_PRESETS.calm })
  const blueHourTarget = useRef(resolveAdaptiveBlueHour())
  const blueHourCurrent = useRef({ ...blueHourTarget.current })
  const fogTargetColor = useMemo(() => new THREE.Color('#36524f'), [])

  useEffect(() => {
    const updateTime = () => { blueHourTarget.current = resolveAdaptiveBlueHour() }
    updateTime()
    const timer = window.setInterval(updateTime, 5 * 60 * 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const initial = resolveHomeEmotionalWeather(new URLSearchParams(window.location.search).get('homeWeather'))
    weatherTarget.current = HOME_EMOTIONAL_WEATHER_PRESETS[initial]
    const onWeather = (event: Event) => {
      const state = resolveHomeEmotionalWeather((event as CustomEvent<{ state?: unknown }>).detail?.state)
      weatherTarget.current = HOME_EMOTIONAL_WEATHER_PRESETS[state]
    }
    window.addEventListener(URAI_HOME_EMOTIONAL_WEATHER_EVENT, onWeather)
    return () => window.removeEventListener(URAI_HOME_EMOTIONAL_WEATHER_EVENT, onWeather)
  }, [])

  useEffect(() => () => {
    atmosphereMaterial.dispose()
    starMaterial.dispose()
    starGeometry.dispose()
    cloudMaterials.forEach((material) => material.dispose())
  }, [atmosphereMaterial, cloudMaterials, starGeometry, starMaterial])

  useEffect(() => {
    document.body.style.cursor = focused && !active ? 'pointer' : 'default'
    return () => { document.body.style.cursor = 'default' }
  }, [active, focused])

  useFrame(({ camera, clock }, delta) => {
    atmosphere.current?.position.copy(camera.position)
    const t = reducedMotion ? 0 : clock.elapsedTime
    const target = weatherTarget.current
    const current = weatherCurrent.current
    const weatherSpeed = reducedMotion ? .70 : .42
    current.clarity = THREE.MathUtils.damp(current.clarity, target.clarity, weatherSpeed, delta)
    current.cloudCover = THREE.MathUtils.damp(current.cloudCover, target.cloudCover, weatherSpeed, delta)
    current.aerosolDensity = THREE.MathUtils.damp(current.aerosolDensity, target.aerosolDensity, weatherSpeed, delta)
    current.windCoherence = THREE.MathUtils.damp(current.windCoherence, target.windCoherence, weatherSpeed, delta)
    current.horizonTransmission = THREE.MathUtils.damp(current.horizonTransmission, target.horizonTransmission, weatherSpeed, delta)
    current.celestialVisibility = THREE.MathUtils.damp(current.celestialVisibility, target.celestialVisibility, weatherSpeed, delta)

    const timeTarget = blueHourTarget.current
    const timeCurrent = blueHourCurrent.current
    timeCurrent.luminance = THREE.MathUtils.damp(timeCurrent.luminance, timeTarget.luminance, .08, delta)
    timeCurrent.temperatureBias = THREE.MathUtils.damp(timeCurrent.temperatureBias, timeTarget.temperatureBias, .08, delta)
    timeCurrent.celestialMultiplier = THREE.MathUtils.damp(timeCurrent.celestialMultiplier, timeTarget.celestialMultiplier, .08, delta)

    const focusValue = THREE.MathUtils.damp(atmosphereMaterial.uniforms.uFocus.value, active ? 1 : focused ? .55 : 0, 5.5, delta)
    const activeValue = THREE.MathUtils.damp(atmosphereMaterial.uniforms.uActive.value, active ? 1 : 0, 4.4, delta)
    atmosphereMaterial.uniforms.uTime.value = t
    atmosphereMaterial.uniforms.uFocus.value = focusValue
    atmosphereMaterial.uniforms.uActive.value = activeValue
    atmosphereMaterial.uniforms.uClarity.value = current.clarity
    atmosphereMaterial.uniforms.uAerosol.value = current.aerosolDensity
    atmosphereMaterial.uniforms.uHorizonTransmission.value = current.horizonTransmission
    atmosphereMaterial.uniforms.uTimeLuminance.value = timeCurrent.luminance
    atmosphereMaterial.uniforms.uTemperatureBias.value = timeCurrent.temperatureBias

    starMaterial.uniforms.uTime.value = t
    starMaterial.uniforms.uFocus.value = focusValue
    starMaterial.uniforms.uActive.value = activeValue
    starMaterial.uniforms.uMotion.value = reducedMotion ? 0 : 1
    starMaterial.uniforms.uCelestial.value = current.celestialVisibility
    starMaterial.uniforms.uTimeStars.value = timeCurrent.celestialMultiplier
    starMaterial.uniforms.uPixelRatio.value = Math.min(2, gl.getPixelRatio())

    cloudMaterials.forEach((material) => {
      material.uniforms.uTime.value = t
      material.uniforms.uMotion.value = reducedMotion ? .08 : 1
      material.uniforms.uActive.value = activeValue
      material.uniforms.uCloudCover.value = current.cloudCover
      material.uniforms.uClarity.value = current.clarity
      material.uniforms.uWindCoherence.value = current.windCoherence
    })

    if (scene.fog instanceof THREE.FogExp2) {
      const densityTarget = active ? .0045 : .0100 + current.aerosolDensity * .009 - current.clarity * .0025
      scene.fog.density = THREE.MathUtils.damp(scene.fog.density, densityTarget, 1.3, delta)
      fogTargetColor.setRGB(
        .13 + current.horizonTransmission * .08,
        .25 + current.clarity * .075,
        .25 + current.clarity * .075,
      )
      scene.fog.color.lerp(fogTargetColor, 1 - Math.pow(.05, delta))
    }
  })

  const validSkyRay = (event: ThreeEvent<MouseEvent>) => event.ray.direction.y > .015
  const skyRaycast = useCallback((raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) => {
    const object = atmosphere.current
    if (!object || raycaster.ray.direction.y <= .015) return
    // Upward visible-sky rays must beat distant terrain intersections on
    // desktop. A tiny synthetic distance gives the visible sky mesh event
    // priority only for rays that already satisfy the broad-sky direction law.
    const distance = .001
    intersects.push({ distance, point: raycaster.ray.at(72, new THREE.Vector3()), object })
  }, [])
  const activateSky = (event: ThreeEvent<MouseEvent>) => {
    if (active || !validSkyRay(event)) return
    event.stopPropagation()
    onLifeMap()
  }

  return <>
    <RetireLocalizedLifeMapGateways />
    <HomeVisualAuthority />
    <points
      geometry={starGeometry}
      material={starMaterial}
      raycast={() => null}
      frustumCulled={false}
      name="home-sky-memory-star-foreshadowing"
      renderOrder={-99}
      userData={{
        visualOnly: true,
        starClasses: 'physical-anchor-memory-precursor-deep-anchor',
        continuitySeed: HOME_SKY_CONTINUITY_SEED,
        precursorCount: HOME_SKY_PRECURSOR_COUNT,
        persistsIntoLifeMap: true,
      }}
    />
    {CLOUD_LAYERS.map((layer, index) => <mesh
      key={layer.name}
      name={layer.name}
      material={cloudMaterials[index]}
      raycast={() => null}
      renderOrder={-98 + index}
      userData={{ visualOnly: true, advection: 'world-space-independent', layer: index + 1 }}
    >
      <sphereGeometry args={[layer.radius, 56, 28]} />
    </mesh>)}
    <mesh
      ref={atmosphere}
      name="home-sky-life-map-threshold"
      renderOrder={-100}
      material={atmosphereMaterial}
      raycast={skyRaycast}
      onPointerMove={(event) => setFocused(!active && validSkyRay(event))}
      onPointerOut={() => setFocused(false)}
      onClick={activateSky}
      userData={{
        interactionOwner: true,
        destination: 'life-map',
        threshold: 'broad-visible-sky',
        localGroundPortal: false,
        atmosphereModel: 'adaptive-perpetual-blue-hour-rayleigh-mie-approximation',
        transitionLaw: 'ground-to-atmosphere-to-depth-to-memory',
      }}
    >
      <sphereGeometry args={[74, 64, 36]} />
    </mesh>
    <OrbLocalAir reducedMotion={reducedMotion} />
  </>
}
