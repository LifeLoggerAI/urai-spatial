#!/usr/bin/env python3
from pathlib import Path

HOME = Path('urai-tier1/src/spatial/layout/HomeWorldProductionFinal.tsx')
source = HOME.read_text()

if 'v43-authored-core-no-aura-no-orbit-rings' in source:
    raise SystemExit('V43 already materialized')
if 'v42-sanctuary-integrated-relic-machine-production-candidate' not in source:
    raise SystemExit('Expected exact V42 source before V43 rebuild')


def replace_function(text: str, name: str, next_name: str, replacement: str) -> str:
    start = text.index(f'function {name}')
    end = text.index(f'function {next_name}', start)
    return text[:start] + replacement.rstrip() + '\n\n' + text[end:]

source = replace_function(source, 'cloneOrbModel', 'PouredStone', r'''
function cloneOrbModel(source: THREE.Object3D) {
  const root = cloneModel(source)
  root.traverse((object) => {
    const retiredDisplayShell = object.name === 'orb-aura' || object.name === 'orb-core' || object.name.startsWith('orb-orbit-')
    if (retiredDisplayShell) {
      object.visible = false
      object.userData.uraiRetiredVisualRole = 'v43-remove-glass-sphere-and-orbit-ring-display-grammar'
      return
    }
    if (!(object instanceof THREE.Mesh)) return
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    for (const material of materials) {
      if (!(material instanceof THREE.MeshStandardMaterial)) continue
      material.color.lerp(new THREE.Color('#435a55'), 0.7)
      material.emissive.lerp(new THREE.Color('#86c9bd'), 0.34)
      material.emissiveIntensity = Math.min(Math.max(material.emissiveIntensity, 0.06), 0.3)
      material.roughness = Math.max(material.roughness, 0.44)
      material.metalness = Math.min(Math.max(material.metalness, 0.22), 0.58)
      material.envMapIntensity = Math.min(material.envMapIntensity, 0.78)
      material.needsUpdate = true
    }
  })
  root.userData.uraiTreatment = 'v43-authored-core-no-aura-no-orbit-rings'
  return root
}
''')

source = replace_function(source, 'ContinuousVaultSkin', 'CantedWallMass', r'''
function ContinuousVaultSkin({pack}:{pack:SurfacePack}){
  const geometry=useMemo(()=>[-1,1].map((side)=>{
    const shape=new THREE.Shape()
    shape.moveTo(-1.15,-1.05);shape.lineTo(1.05,-.86);shape.lineTo(.92,.2);shape.bezierCurveTo(.7,.9,.18,1.45,-.62,1.68);shape.lineTo(-1.08,.78);shape.closePath()
    const g=new THREE.ExtrudeGeometry(shape,{depth:1.5,steps:1,curveSegments:20,bevelEnabled:true,bevelSegments:5,bevelSize:.11,bevelThickness:.11});g.center();g.computeVertexNormals();return {side,g}
  }),[])
  useEffect(()=>()=>geometry.forEach(({g})=>g.dispose()),[geometry])
  return <group name="home-v43-open-vault-crown" userData={{treatment:'v43-open-center-asymmetric-vault-shoulders-no-ceiling-sheet'}}>
    {geometry.map(({side,g})=><mesh key={side} geometry={g} position={[side*4.42,4.95,-5.86]} rotation={[side<0?-.08:.04,side*-.16,side*.18]} castShadow receiveShadow><meshPhysicalMaterial color={side<0?'#394743':'#49443a'} map={pack.color} normalMap={pack.normal} normalScale={new THREE.Vector2(.4,.4)} roughnessMap={pack.arm} displacementMap={pack.displacement} displacementScale={.007} displacementBias={-.0035} roughness={.76} metalness={.035} clearcoat={.025} clearcoatRoughness={.82} envMapIntensity={.74}/></mesh>)}
  </group>
}
''')

source = replace_function(source, 'TaperedLoadBeam', 'ServiceConduit', r'''
function TaperedLoadBeam({from,to,width=.42,color='#53655f'}:{from:Vec3;to:Vec3;width?:number;color?:string}){
  const {mid,quat,length}=useMemo(()=>{const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to),dir=b.clone().sub(a),length=dir.length(),mid=a.clone().add(b).multiplyScalar(.5),quat=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),dir.clone().normalize());return{mid,quat,length}},[from,to])
  return <mesh position={mid} quaternion={quat} castShadow receiveShadow userData={{treatment:'v43-faceted-structural-member-no-tube-grammar'}}><coneGeometry args={[width*.72,width,length,5,1,false]}/><meshPhysicalMaterial color={color} roughness={.58} metalness={.3} clearcoat={.025} clearcoatRoughness={.7} envMapIntensity={.72}/></mesh>
}
''')

source = replace_function(source, 'MachineCavityLiner', 'SanctuaryArchitecture', r'''
function MachineCavityLiner(){return <group name="home-v43-rear-load-field" userData={{treatment:'v43-grounded-rear-buttress-fingers-no-backplate-no-square-footings'}}>
  <TaperedLoadBeam from={[-5.3,-.28,-7.3]} to={[-4.54,2.72,-7.08]} width={.48} color="#354945"/>
  <TaperedLoadBeam from={[-4.54,2.72,-7.08]} to={[-3.55,4.54,-6.62]} width={.38} color="#44645c"/>
  <TaperedLoadBeam from={[5.18,-.28,-7.42]} to={[4.48,2.84,-7.16]} width={.5} color="#514b3e"/>
  <TaperedLoadBeam from={[4.48,2.84,-7.16]} to={[3.46,4.64,-6.7]} width={.39} color="#6b604c"/>
  <pointLight position={[-4.25,2.7,-6.45]} color="#79bcb1" intensity={.72} distance={7.2} decay={2}/>
  <pointLight position={[4.18,2.85,-6.56]} color="#d2ad78" intensity={.7} distance={7.2} decay={2}/>
</group>}
''')

source = replace_function(source, 'SanctuaryArchitecture', 'SanctuaryGlazing', r'''
function SanctuaryArchitecture(){const pack=useStonePack(.34,.5);return <group name="home-sanctuary-pavilion" userData={{visualOwner:'cinematic-integrated-relic-machine-sanctuary-v43',construction:'grounded-machinery-open-vault-crown',visualTreatment:'v43-relic-machine-open-vault-production-candidate'}}>
  <group name="home-v30-rear-apse" userData={{treatment:'v43-open-depth-with-grounded-buttress-fingers'}}><MachineCavityLiner/></group>
  <group name="home-v30-side-enclosure" userData={{treatment:'v43-recessed-side-masses-outside-machine-silhouette'}}><CantedWallMass pack={pack} side={-1}/><CantedWallMass pack={pack} side={1}/></group>
  <group name="home-v30-load-bearing-vault" userData={{treatment:'v43-open-center-asymmetric-vault-crown'}}><ContinuousVaultSkin pack={pack}/></group>
  <group name="home-v30-orb-apse-architecture" userData={{treatment:'v43-orb-machine-is-primary-architecture-not-display-object'}} />
  <group name="home-v32-depth-envelope" userData={{treatment:'v43-restrained-asymmetric-practicals'}}><RecessedPractical position={[-5.1,.5,1.4]}/><RecessedPractical position={[5.05,.5,.65]} warm={false}/><RecessedPractical position={[-4.75,.5,-6.55]} warm={false}/><RecessedPractical position={[4.68,.5,-6.66]}/></group>
</group>}
''')

source = replace_function(source, 'ReliquaryWing', 'CrownBridge', r'''
function ReliquaryWing({side}:{side:-1|1}){
  const s=side,cool=side<0?'#3f5c55':'#665b48',accent=side<0?'#628d83':'#947d59'
  return <group name={side<0?'home-v43-left-capture-yoke':'home-v43-right-capture-yoke'} userData={{treatment:'v43-floor-embedded-faceted-capture-yoke-no-visible-footing'}}>
    <TaperedLoadBeam from={[s*3.28,-.34,-3.78]} to={[s*2.62,1.74,-3.5]} width={.58} color={cool}/>
    <TaperedLoadBeam from={[s*2.62,1.74,-3.5]} to={[s*1.44,1.84,-3.16]} width={.34} color={accent}/>
    <TaperedLoadBeam from={[s*2.62,1.74,-3.5]} to={[s*1.48,2.64,-3.16]} width={.32} color={accent}/>
    <TaperedLoadBeam from={[s*2.62,1.74,-3.5]} to={[s*2.34,3.72,-3.9]} width={.4} color={cool}/>
    <TaperedLoadBeam from={[s*2.34,3.72,-3.9]} to={[s*3.48,4.72,-5.45]} width={.34} color={cool}/>
    <pointLight position={[s*1.72,2.2,-3.0]} color={side<0?'#7fc7bb':'#d5b076'} intensity={.52} distance={4.5} decay={2}/>
  </group>
}
''')

source = replace_function(source, 'CrownBridge', 'FloorReliquaryBed', r'''
function CrownBridge(){return <group name="home-orb-load-crown" userData={{treatment:'v43-separated-capture-yokes-seat-into-open-vault-shoulders'}}>
  <TaperedLoadBeam from={[-2.34,3.72,-3.9]} to={[-3.48,4.72,-5.45]} width={.34} color="#4e6a63"/>
  <TaperedLoadBeam from={[2.34,3.72,-3.9]} to={[3.48,4.72,-5.45]} width={.35} color="#73654f"/>
</group>}
''')

source = replace_function(source, 'FloorReliquaryBed', 'OrbPlatform', r'''
function FloorReliquaryBed(){return <group name="home-orb-machine-floor-integration" userData={{treatment:'v43-flush-foundation-service-inlays-no-platform-no-pedestal',visualTreatment:'v43-capture-yokes-disappear-into-foundation'}}>
  <mesh position={[-2.75,-.155,-3.78]} rotation={[-Math.PI/2,0,.08]} receiveShadow><planeGeometry args={[1.06,3.45]}/><meshPhysicalMaterial color="#26332f" roughness={.64} metalness={.18} clearcoat={.025} clearcoatRoughness={.72} envMapIntensity={.72}/></mesh>
  <mesh position={[2.75,-.153,-3.78]} rotation={[-Math.PI/2,0,-.06]} receiveShadow><planeGeometry args={[1.06,3.45]}/><meshPhysicalMaterial color="#332f27" roughness={.62} metalness={.2} clearcoat={.025} clearcoatRoughness={.7} envMapIntensity={.72}/></mesh>
</group>}
''')

source = replace_function(source, 'OrbCradle', 'SacredOrb', r'''
function OrbCradle(){return <group name="home-orb-engineered-cradle" position={[0,0,0]} userData={{treatment:'v43-floor-embedded-yokes-open-vault-integrated-relic-machine',visualTreatment:'v43-authored-heart-captured-by-architectural-yokes-no-display-ring-no-pedestal'}}>
  <ReliquaryWing side={-1}/><ReliquaryWing side={1}/><CrownBridge/><ServiceConduit side={-1}/><ServiceConduit side={1}/>
</group>}
''')

source = source.replace("treatment:'v42-governed-authored-orb-massive-relic-machine-hero'", "treatment:'v43-governed-authored-heart-petal-machine-core'")
source = source.replace("<group scale={1.05} position={[0,.04,0]} rotation={[0,.18,0]} name=\"home-orb-authored-core\" userData={{treatment:'v42-authored-orb-large-visible-integrated-desktop-mobile'}}>", "<group scale={1.32} position={[0,.04,0]} rotation={[0,.18,0]} name=\"home-orb-authored-core\" userData={{treatment:'v43-authored-core-no-aura-no-orbit-rings'}}>")
source = source.replace("v42-engineered-body-is-architectural-capture-system-no-display-ring-no-pedestal", "v43-engineered-body-is-yoke-capture-system-no-display-ring-no-pedestal")
source = source.replace("data-home-visual-grade=\"cinematic-pbr-v42-integrated-relic-machine-sanctuary\"", "data-home-visual-grade=\"cinematic-pbr-v43-open-vault-integrated-relic-machine\"")
source = source.replace("data-home-final-art-revision=\"v42-sanctuary-integrated-relic-machine-production-candidate\"", "data-home-final-art-revision=\"v43-relic-machine-open-vault-production-candidate\"")
source = source.replace("data-home-art-certification=\"v42-retained-pixel-candidate\"", "data-home-art-certification=\"v43-retained-pixel-candidate\"")
source = source.replace("camera.fov=size.height>size.width?56:50", "camera.fov=size.height>size.width?60:53")
source = source.replace("const desiredFov=portrait?56:50", "const desiredFov=portrait?60:53")
source = source.replace("const lookHeight=portrait?2.18:2.04", "const lookHeight=portrait?2.12:1.98")
source = source.replace("gl.toneMappingExposure=1.7", "gl.toneMappingExposure=1.62")
source = source.replace("<ambientLight intensity={0.7} color=\"#e6efea\" />", "<ambientLight intensity={0.62} color=\"#e6efea\" />")
source = source.replace("<hemisphereLight args={['#c9ded7','#26322b',0.98]} />", "<hemisphereLight args={['#c8ddd7','#25312b',0.86]} />")

required = [
    'v43-relic-machine-open-vault-production-candidate',
    'v43-open-center-asymmetric-vault-shoulders-no-ceiling-sheet',
    'v43-faceted-structural-member-no-tube-grammar',
    'v43-floor-embedded-faceted-capture-yoke-no-visible-footing',
    'v43-authored-heart-captured-by-architectural-yokes-no-display-ring-no-pedestal',
    'v43-governed-authored-heart-petal-machine-core',
    'v43-authored-core-no-aura-no-orbit-rings',
    'scale={1.32}',
    'desiredFov=portrait?60:53',
]
for marker in required:
    if marker not in source:
        raise SystemExit(f'Missing V43 marker after transform: {marker}')

if "object.name === 'orb-aura'" not in source or "object.name.startsWith('orb-orbit-')" not in source:
    raise SystemExit('V43 must explicitly retire authored display shell/ring node families')

orb_start = source.index('function SacredOrb(')
orb_end = source.index('function HumanPresence', orb_start)
orb_source = source[orb_start:orb_end]
for forbidden in ['torusGeometry', 'dodecahedronGeometry', 'icosahedronGeometry', 'octahedronGeometry', 'sphereGeometry', 'RoundedBox']:
    if forbidden in orb_source:
        raise SystemExit(f'Forbidden V43 Orb display/placeholder geometry remains: {forbidden}')

HOME.write_text(source)
print('Materialized V43 open-vault authored-heart relic-machine rebuild')
