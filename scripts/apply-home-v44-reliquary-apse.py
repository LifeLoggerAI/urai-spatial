#!/usr/bin/env python3
from pathlib import Path

HOME = Path('urai-tier1/src/spatial/layout/HomeWorldProductionFinal.tsx')
source = HOME.read_text()
if 'v44-monolithic-reliquary-apse-production-candidate' in source:
    raise SystemExit('V44 already materialized')
if 'v43-relic-machine-open-vault-production-candidate' not in source:
    raise SystemExit('Expected exact V43 source before V44 rebuild')

def replace_function(text: str, name: str, next_name: str, replacement: str) -> str:
    start = text.index(f'function {name}')
    end = text.index(f'function {next_name}', start)
    return text[:start] + replacement.rstrip() + '\n\n' + text[end:]

source = replace_function(source, 'cloneOrbModel', 'PouredStone', r'''
function cloneOrbModel(source: THREE.Object3D) {
  const root = cloneModel(source)
  root.traverse((object) => {
    const retiredDisplay = object.name === 'orb-aura' || object.name === 'orb-core' || object.name.startsWith('orb-orbit-') || object.name.startsWith('orb-petal-')
    if (retiredDisplay) {
      object.visible = false
      object.userData.uraiRetiredVisualRole = 'v44-retire-glass-shell-orbits-and-crystalline-petal-display'
      return
    }
    if (!(object instanceof THREE.Mesh)) return
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    for (const material of materials) {
      if (!(material instanceof THREE.MeshStandardMaterial)) continue
      material.color.lerp(new THREE.Color('#263c38'), 0.82)
      material.emissive.lerp(new THREE.Color('#79b9ae'), 0.26)
      material.emissiveIntensity = Math.min(Math.max(material.emissiveIntensity, 0.04), 0.22)
      material.roughness = Math.max(material.roughness, 0.56)
      material.metalness = Math.min(Math.max(material.metalness, 0.28), 0.62)
      material.envMapIntensity = Math.min(material.envMapIntensity, 0.7)
      material.needsUpdate = true
    }
  })
  root.userData.uraiTreatment = 'v44-authored-heart-filament-core-no-glass-petals-no-rings'
  return root
}
''')

source = replace_function(source, 'ContinuousVaultSkin', 'CantedWallMass', r'''
function ContinuousVaultSkin({pack}:{pack:SurfacePack}){
  const geometry=useMemo(()=>{
    const shape=new THREE.Shape()
    shape.moveTo(-5.85,-3.1);shape.lineTo(5.65,-3.1);shape.lineTo(5.55,1.45);shape.lineTo(4.72,2.72);shape.lineTo(2.9,3.35);shape.lineTo(.72,3.62);shape.lineTo(-1.42,3.48);shape.lineTo(-3.68,3.02);shape.lineTo(-5.5,1.7);shape.closePath()
    const hole=new THREE.Path();hole.moveTo(-3.05,-2.55);hole.lineTo(3.1,-2.55);hole.lineTo(3.15,.82);hole.bezierCurveTo(2.55,2.02,1.32,2.58,0,2.64);hole.bezierCurveTo(-1.42,2.56,-2.55,1.92,-3.12,.72);hole.closePath();shape.holes.push(hole)
    const g=new THREE.ExtrudeGeometry(shape,{depth:1.45,steps:1,curveSegments:26,bevelEnabled:true,bevelSegments:6,bevelSize:.16,bevelThickness:.16});g.center();g.computeVertexNormals();return g
  },[])
  useEffect(()=>()=>geometry.dispose(),[geometry])
  return <mesh name="home-v44-monolithic-reliquary-apse" geometry={geometry} position={[0,2.72,-6.38]} rotation={[0,.018,0]} castShadow receiveShadow userData={{treatment:'v44-single-monolithic-asymmetric-reliquary-apse-no-detached-ceiling-slabs'}}><meshPhysicalMaterial color="#29312e" map={pack.color} normalMap={pack.normal} normalScale={new THREE.Vector2(.48,.48)} roughnessMap={pack.arm} displacementMap={pack.displacement} displacementScale={.009} displacementBias={-.0045} roughness={.82} metalness={.025} clearcoat={.018} clearcoatRoughness={.9} envMapIntensity={.6}/></mesh>
}
''')

source = replace_function(source, 'CantedWallMass', 'MachineCavityLiner', r'''
function CantedWallMass({pack,side}:{pack:SurfacePack;side:-1|1}){return <group name={side<0?'home-v44-left-integrated-buttress':'home-v44-right-integrated-buttress'} userData={{treatment:'v44-side-buttress-absorbed-into-monolithic-apse-no-floating-quarter-slab'}} />}
''')

source = replace_function(source, 'MachineCavityLiner', 'SanctuaryArchitecture', r'''
function MachineCavityLiner(){return <group name="home-v44-reliquary-cavity" userData={{treatment:'v44-layered-recessed-machine-cavity-no-empty-black-void'}}>
  <mesh position={[0,2.18,-7.0]} castShadow receiveShadow><boxGeometry args={[6.35,4.25,.28]}/><meshPhysicalMaterial color="#171e1c" roughness={.66} metalness={.22} clearcoat={.03} clearcoatRoughness={.72} envMapIntensity={.68}/></mesh>
  <mesh position={[-2.65,2.12,-6.78]} rotation={[0,.08,.04]} castShadow receiveShadow><boxGeometry args={[.44,3.95,.5]}/><meshPhysicalMaterial color="#303b37" roughness={.62} metalness={.18} envMapIntensity={.7}/></mesh>
  <mesh position={[2.58,2.2,-6.76]} rotation={[0,-.06,-.035]} castShadow receiveShadow><boxGeometry args={[.5,4.08,.5]}/><meshPhysicalMaterial color="#3b3830" roughness={.64} metalness={.16} envMapIntensity={.68}/></mesh>
  <pointLight position={[-2.1,2.4,-6.35]} color="#6faaa0" intensity={.48} distance={6.4} decay={2}/>
  <pointLight position={[2.05,2.45,-6.32]} color="#bd9b6b" intensity={.44} distance={6.2} decay={2}/>
</group>}
''')

source = replace_function(source, 'SanctuaryArchitecture', 'SanctuaryGlazing', r'''
function SanctuaryArchitecture(){const pack=useStonePack(.34,.5);return <group name="home-sanctuary-pavilion" userData={{visualOwner:'cinematic-monolithic-reliquary-sanctuary-v44',construction:'single-asymmetric-apse-with-integrated-reliquary',visualTreatment:'v44-monolithic-reliquary-apse-production-candidate'}}>
  <MachineCavityLiner/>
  <ContinuousVaultSkin pack={pack}/>
  <group name="home-v44-depth-practicals" userData={{treatment:'v44-restrained-recessed-foundation-lighting'}}><RecessedPractical position={[-4.9,.46,.8]}/><RecessedPractical position={[4.76,.46,.2]} warm={false}/></group>
</group>}
''')

source = replace_function(source, 'TaperedLoadBeam', 'ServiceConduit', r'''
function TaperedLoadBeam({from,to,width=.42,color='#53655f'}:{from:Vec3;to:Vec3;width?:number;color?:string}){
  const {mid,quat,length}=useMemo(()=>{const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to),dir=b.clone().sub(a),length=dir.length(),mid=a.clone().add(b).multiplyScalar(.5),quat=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),dir.clone().normalize());return{mid,quat,length}},[from,to])
  return <mesh position={mid} quaternion={quat} castShadow receiveShadow userData={{treatment:'v44-broad-dark-load-member-no-spike-cone-grammar'}}><boxGeometry args={[width,length,width*.72]}/><meshPhysicalMaterial color={color} roughness={.66} metalness={.26} clearcoat={.018} clearcoatRoughness={.76} envMapIntensity={.66}/></mesh>
}
''')

source = replace_function(source, 'ReliquaryWing', 'CrownBridge', r'''
function ReliquaryWing({side}:{side:-1|1}){
  const geometry=useMemo(()=>{const s=side,shape=new THREE.Shape();shape.moveTo(s*.72,-2.28);shape.lineTo(s*2.52,-2.75);shape.lineTo(s*2.92,-1.72);shape.lineTo(s*2.48,.1);shape.lineTo(s*1.62,1.62);shape.lineTo(s*.9,1.02);shape.lineTo(s*1.22,-.18);shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth:.62,steps:1,curveSegments:10,bevelEnabled:true,bevelSegments:4,bevelSize:.1,bevelThickness:.1});g.center();g.computeVertexNormals();return g},[side]);useEffect(()=>()=>geometry.dispose(),[geometry]);return <mesh name={side<0?'home-v44-left-foundation-yoke':'home-v44-right-foundation-yoke'} geometry={geometry} position={[0,2.2,-3.82]} rotation={[0,side*.035,side*.018]} castShadow receiveShadow userData={{treatment:'v44-broad-floor-rooted-armor-yoke-no-spikes-no-feet'}}><meshPhysicalMaterial color={side<0?'#283b37':'#443d31'} roughness={.64} metalness={.28} clearcoat={.02} clearcoatRoughness={.74} envMapIntensity={.7}/></mesh>
}
''')

source = replace_function(source, 'CrownBridge', 'FloorReliquaryBed', r'''
function CrownBridge(){return <group name="home-v44-reliquary-upper-seat" userData={{treatment:'v44-yokes-terminate-into-apse-without-floating-crown'}} />}
''')

source = replace_function(source, 'FloorReliquaryBed', 'OrbPlatform', r'''
function FloorReliquaryBed(){return <group name="home-v44-foundation-integration" userData={{treatment:'v44-no-black-platform-floor-remains-continuous'}} />}
''')

source = replace_function(source, 'OrbCradle', 'SacredOrb', r'''
function OrbCradle(){return <group name="home-orb-engineered-cradle" userData={{treatment:'v44-monolithic-apse-and-broad-yokes-physically-capture-core-no-display-stand'}}><ReliquaryWing side={-1}/><ReliquaryWing side={1}/></group>}
''')

source = source.replace("treatment:'v43-governed-authored-heart-petal-machine-core'", "treatment:'v44-governed-authored-heart-filament-machine-core'")
source = source.replace("scale={1.32}", "scale={1.58}")
source = source.replace("treatment:'v43-authored-core-no-aura-no-orbit-rings'", "treatment:'v44-authored-heart-filament-core-no-glass-petals-no-rings'")
source = source.replace("v43-engineered-body-is-yoke-capture-system-no-display-ring-no-pedestal", "v44-engineered-body-is-monolithic-architectural-capture-no-display-object")
source = source.replace('data-home-visual-grade="cinematic-pbr-v43-open-vault-integrated-relic-machine"','data-home-visual-grade="cinematic-pbr-v44-monolithic-reliquary-apse"')
source = source.replace('data-home-final-art-revision="v43-relic-machine-open-vault-production-candidate"','data-home-final-art-revision="v44-monolithic-reliquary-apse-production-candidate"')
source = source.replace('data-home-art-certification="v43-retained-pixel-candidate"','data-home-art-certification="v44-retained-pixel-candidate"')
source = source.replace('desiredFov=portrait?60:53','desiredFov=portrait?66:55')
source = source.replace('lookHeight=portrait?2.12:1.98','lookHeight=portrait?2.04:1.94')
source = source.replace('gl.toneMappingExposure=1.62','gl.toneMappingExposure=1.72')
source = source.replace('ambientLight intensity={0.62}','ambientLight intensity={0.72}')
source = source.replace("hemisphereLight args={['#c8ddd7','#25312b',0.86]}","hemisphereLight args={['#c8ddd7','#25312b',0.96]}")

required=['v44-monolithic-reliquary-apse-production-candidate','v44-single-monolithic-asymmetric-reliquary-apse-no-detached-ceiling-slabs','v44-layered-recessed-machine-cavity-no-empty-black-void','v44-broad-floor-rooted-armor-yoke-no-spikes-no-feet','v44-no-black-platform-floor-remains-continuous','v44-authored-heart-filament-core-no-glass-petals-no-rings','scale={1.58}','desiredFov=portrait?66:55']
for marker in required:
    if marker not in source: raise SystemExit(f'Missing V44 marker: {marker}')
if "object.name.startsWith('orb-petal-')" not in source: raise SystemExit('V44 must retire crystalline petal display family')
HOME.write_text(source)
print('Materialized V44 monolithic reliquary apse rebuild')
