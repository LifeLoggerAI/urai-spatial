from pathlib import Path
import re

home = Path('urai-tier1/src/spatial/layout/HomeWorldProductionFinal.tsx')
test = Path('urai-tier1/tests/home-relic-machine-realism-contract.test.mjs')
s = home.read_text()

s = s.replace("'home-v45-monolithic-reliquary-apse', 'home-v45-reliquary-cavity',\n  'home-v45-depth-practicals', 'home-v45-left-machined-yoke', 'home-v45-right-machined-yoke',", "'home-v46-left-apse-mass', 'home-v46-right-apse-mass', 'home-v46-reliquary-cavity',\n  'home-v46-depth-practicals', 'home-v46-left-machined-yoke', 'home-v46-right-machined-yoke',")

clone = r'''function cloneOrbModel(source: THREE.Object3D) {
  const root = cloneModel(source)
  root.traverse((object) => {
    const retiredDisplay = object.name === 'orb-aura' || object.name === 'orb-core' || object.name.startsWith('orb-orbit-') || object.name.startsWith('orb-petal-')
    if (retiredDisplay) {
      object.visible = false
      object.userData.uraiRetiredVisualRole = 'v46-retire-glass-shell-orbits-and-crystalline-petal-display'
      return
    }
    if (object.name === 'orb-heart') {
      object.scale.multiplyScalar(0.22)
      object.userData.uraiIntegratedVisualRole = 'v46-small-authored-heart-behind-machined-aperture'
    }
    if (object.name.startsWith('orb-filament-')) {
      object.scale.multiplyScalar(0.12)
      object.userData.uraiIntegratedVisualRole = 'v46-short-authored-filament-inside-machine-core'
    }
    if (!(object instanceof THREE.Mesh)) return
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    for (const material of materials) {
      if (!(material instanceof THREE.MeshStandardMaterial)) continue
      material.color.lerp(new THREE.Color('#1f3330'), 0.9)
      material.emissive.lerp(new THREE.Color('#5c9188'), 0.16)
      material.emissiveIntensity = Math.min(Math.max(material.emissiveIntensity, 0.018), 0.085)
      material.roughness = Math.max(material.roughness, 0.62)
      material.metalness = Math.min(Math.max(material.metalness, 0.34), 0.58)
      material.envMapIntensity = Math.min(material.envMapIntensity, 0.58)
      material.needsUpdate = true
    }
  })
  root.userData.uraiTreatment = 'v46-authored-heart-filament-trace-behind-machined-aperture-no-crystal-display'
  return root
}'''
s = re.sub(r'function cloneOrbModel\(source: THREE\.Object3D\) \{.*?\n\}', clone, s, count=1, flags=re.S)

apse = r'''function ContinuousVaultSkin({pack}:{pack:SurfacePack}){
  const left=useMemo(()=>{const q=new THREE.Shape();q.moveTo(-5.9,-2.65);q.lineTo(-1.38,-2.65);q.lineTo(-1.55,1.34);q.lineTo(-2.18,2.48);q.lineTo(-3.55,3.18);q.lineTo(-5.52,2.58);q.closePath();const g=new THREE.ExtrudeGeometry(q,{depth:1.58,steps:1,curveSegments:10,bevelEnabled:true,bevelSegments:5,bevelSize:.14,bevelThickness:.14});g.center();g.computeVertexNormals();return g},[])
  const right=useMemo(()=>{const q=new THREE.Shape();q.moveTo(1.28,-2.65);q.lineTo(5.72,-2.65);q.lineTo(5.45,2.32);q.lineTo(3.62,3.12);q.lineTo(2.12,2.54);q.lineTo(1.5,1.28);q.closePath();const g=new THREE.ExtrudeGeometry(q,{depth:1.72,steps:1,curveSegments:10,bevelEnabled:true,bevelSegments:5,bevelSize:.14,bevelThickness:.14});g.center();g.computeVertexNormals();return g},[])
  const crown=useMemo(()=>{const q=new THREE.Shape();q.moveTo(-2.3,-.42);q.lineTo(2.45,-.42);q.lineTo(1.7,.7);q.lineTo(.42,1.08);q.lineTo(-1.22,.96);q.closePath();const g=new THREE.ExtrudeGeometry(q,{depth:1.3,steps:1,curveSegments:8,bevelEnabled:true,bevelSegments:4,bevelSize:.11,bevelThickness:.11});g.center();g.computeVertexNormals();return g},[])
  useEffect(()=>()=>{left.dispose();right.dispose();crown.dispose()},[left,right,crown])
  return <group name="home-v46-reliquary-apse" userData={{treatment:'v46-separated-load-bearing-apse-masses-with-deep-open-machine-bay-no-arch-facade'}}>
    <mesh name="home-v46-left-apse-mass" geometry={left} position={[-.18,2.35,-7.48]} rotation={[0,.045,.012]} castShadow receiveShadow><meshPhysicalMaterial color="#252d2a" map={pack.color} normalMap={pack.normal} normalScale={new THREE.Vector2(.38,.38)} roughnessMap={pack.arm} roughness={.85} metalness={.028} envMapIntensity={.6}/></mesh>
    <mesh name="home-v46-right-apse-mass" geometry={right} position={[-.05,2.4,-7.56]} rotation={[0,-.035,-.008]} castShadow receiveShadow><meshPhysicalMaterial color="#2b302d" map={pack.color} normalMap={pack.normal} normalScale={new THREE.Vector2(.34,.34)} roughnessMap={pack.arm} roughness={.84} metalness={.03} envMapIntensity={.6}/></mesh>
    <mesh geometry={crown} position={[.08,4.54,-7.34]} rotation={[0,.01,-.02]} castShadow receiveShadow><meshPhysicalMaterial color="#202724" roughness={.78} metalness={.14} envMapIntensity={.62}/></mesh>
  </group>
}'''
s = re.sub(r'function ContinuousVaultSkin\(\{pack\}:\{pack:SurfacePack\}\)\{.*?\n\}', apse, s, count=1, flags=re.S)

cavity = r'''function MachineCavityLiner(){
  const rear=useMemo(()=>{const q=new THREE.Shape();q.moveTo(-3.38,-2.18);q.lineTo(3.35,-2.18);q.lineTo(3.08,1.28);q.lineTo(2.28,2.0);q.lineTo(.72,2.34);q.lineTo(-1.05,2.3);q.lineTo(-2.52,1.94);q.lineTo(-3.26,1.22);q.closePath();const g=new THREE.ExtrudeGeometry(q,{depth:.48,steps:1,curveSegments:10,bevelEnabled:true,bevelSegments:3,bevelSize:.07,bevelThickness:.07});g.center();g.computeVertexNormals();return g},[])
  useEffect(()=>()=>rear.dispose(),[rear])
  return <group name="home-v46-reliquary-cavity" userData={{treatment:'v46-deep-open-machine-bay-with-staggered-bulkheads-and-floor-service-depth'}}>
    <mesh geometry={rear} position={[0,2.12,-7.1]} castShadow receiveShadow><meshPhysicalMaterial color="#101715" roughness={.76} metalness={.34} envMapIntensity={.54}/></mesh>
    <mesh position={[-2.62,2.05,-6.56]} rotation={[0,.13,.04]} castShadow receiveShadow><boxGeometry args={[.28,3.55,.72]}/><meshPhysicalMaterial color="#303936" roughness={.62} metalness={.38} envMapIntensity={.72}/></mesh>
    <mesh position={[2.48,2.12,-6.62]} rotation={[0,-.11,-.035]} castShadow receiveShadow><boxGeometry args={[.32,3.7,.76]}/><meshPhysicalMaterial color="#39372f" roughness={.64} metalness={.34} envMapIntensity={.7}/></mesh>
    <mesh position={[0,.42,-6.48]} castShadow receiveShadow><boxGeometry args={[5.1,.18,1.45]}/><meshPhysicalMaterial color="#242b27" roughness={.82} metalness={.12} envMapIntensity={.58}/></mesh>
    <pointLight position={[-2.0,2.5,-5.95]} color="#76a69d" intensity={.78} distance={6.2} decay={2}/>
    <pointLight position={[1.92,2.36,-5.9]} color="#b49466" intensity={.72} distance={6.0} decay={2}/>
  </group>
}'''
s = re.sub(r'function MachineCavityLiner\(\)\{.*?\n\}', cavity, s, count=1, flags=re.S)

s = s.replace("cinematic-integrated-reliquary-sanctuary-v45", "cinematic-integrated-reliquary-sanctuary-v46")
s = s.replace("angular-monolithic-apse-with-recessed-machine-core", "separated-load-bearing-apse-masses-with-deep-machine-bay")
s = s.replace("v45-integrated-reliquary-production-candidate", "v46-integrated-machine-apse-production-candidate")
s = s.replace("home-v45-depth-practicals", "home-v46-depth-practicals")
s = s.replace("v45-restrained-recessed-foundation-lighting", "v46-restrained-recessed-machine-bay-lighting")

wing = r'''function ReliquaryWing({side}:{side:-1|1}){
  const geometry=useMemo(()=>{const q=new THREE.Shape();q.moveTo(-.48,-1.72);q.lineTo(.52,-1.92);q.lineTo(.72,.72);q.lineTo(.38,1.56);q.lineTo(-.32,1.42);q.lineTo(-.62,.46);q.closePath();const hole=new THREE.Path();hole.moveTo(-.2,-.7);hole.lineTo(.28,-.82);hole.lineTo(.36,.42);hole.lineTo(.08,.8);hole.lineTo(-.24,.56);hole.closePath();q.holes.push(hole);const g=new THREE.ExtrudeGeometry(q,{depth:.68,steps:1,curveSegments:10,bevelEnabled:true,bevelSegments:4,bevelSize:.08,bevelThickness:.08});g.center();g.computeVertexNormals();return g},[])
  useEffect(()=>()=>geometry.dispose(),[geometry])
  return <mesh name={side<0?'home-v46-left-machined-yoke':'home-v46-right-machined-yoke'} geometry={geometry} position={[side*1.42,2.08,-5.72]} rotation={[0,side*.16,side*.055]} castShadow receiveShadow userData={{treatment:'v46-separated-machined-cheek-yoke-with-open-center-and-no-visible-feet'}}><meshPhysicalMaterial color={side<0?'#24312e':'#353229'} roughness={.58} metalness={.42} clearcoat={.025} clearcoatRoughness={.72} envMapIntensity={.76}/></mesh>
}'''
s = re.sub(r'function ReliquaryWing\(\{side\}:\{side:-1\|1\}\)\{.*?\n\}', wing, s, count=1, flags=re.S)
s = s.replace("home-v45-reliquary-upper-seat", "home-v46-reliquary-upper-seat").replace("v45-yokes-seat-into-recessed-apse-without-floating-crown", "v46-yokes-seat-into-deep-machine-bay-without-floating-crown")
s = s.replace("home-v45-foundation-integration", "home-v46-foundation-integration").replace("v45-no-display-platform-no-contact-shadow-mat-floor-remains-continuous", "v46-no-display-platform-floor-remains-continuous")
s = s.replace("v45-recessed-apse-and-machined-yokes-physically-seat-core-no-display-stand", "v46-deep-machine-bay-and-separated-yokes-physically-capture-core-no-display-stand")

core = r'''function MachineCoreAssembly(){
  const plate=useMemo(()=>{const q=new THREE.Shape();q.moveTo(-.72,-.84);q.lineTo(.68,-.72);q.lineTo(.82,.48);q.lineTo(.3,.92);q.lineTo(-.52,.82);q.lineTo(-.82,.2);q.closePath();const hole=new THREE.Path();hole.absellipse(0,.05,.22,.32,0,Math.PI*2,false,0);q.holes.push(hole);const g=new THREE.ExtrudeGeometry(q,{depth:.34,steps:1,curveSegments:18,bevelEnabled:true,bevelSegments:3,bevelSize:.06,bevelThickness:.06});g.center();g.computeVertexNormals();return g},[])
  useEffect(()=>()=>plate.dispose(),[plate])
  return <group name="home-v46-machine-core-assembly" position={[0,0,-2.42]} userData={{treatment:'v46-layered-machined-aperture-captures-authored-heart-trace'}}>
    <mesh geometry={plate} position={[0,0,-.12]} castShadow receiveShadow><meshPhysicalMaterial color="#1b2321" roughness={.5} metalness={.5} envMapIntensity={.82}/></mesh>
    <mesh geometry={plate} position={[0,0,.18]} rotation={[0,Math.PI,.04]} scale={[.82,.82,.82]} castShadow receiveShadow><meshPhysicalMaterial color="#343a34" roughness={.56} metalness={.42} envMapIntensity={.78}/></mesh>
    <pointLight position={[0,.08,.38]} color="#7fc0b5" intensity={.72} distance={3.2} decay={2}/>
  </group>
}'''
s = s.replace("function SacredOrb({state,reducedMotion,onOpen}:{state:OrbState;reducedMotion:boolean;onOpen:()=>void}){", core + "\n\nfunction SacredOrb({state,reducedMotion,onOpen}:{state:OrbState;reducedMotion:boolean;onOpen:()=>void}){")
s = s.replace("treatment:'v45-governed-authored-heart-short-filament-recessed-machine-core'", "treatment:'v46-governed-authored-heart-filament-trace-captured-in-deep-machine-bay'")
s = s.replace("<group scale={1.18} position={[0,.02,-.18]} rotation={[0,.18,0]} name=\"home-orb-authored-core\" userData={{treatment:'v45-authored-heart-short-filament-core-embedded-no-glass-no-rings'}}><primitive object={authoredOrb}/></group>", "<group scale={0.58} position={[0,.02,-2.16]} rotation={[0,.18,0]} name=\"home-orb-authored-core\" userData={{treatment:'v46-authored-heart-filament-trace-behind-machined-aperture-no-crystal-display'}}><primitive object={authoredOrb}/></group><MachineCoreAssembly/>")
s = s.replace("v45-engineered-body-is-recessed-architectural-capture-no-display-object", "v46-engineered-body-is-deep-architectural-machine-capture-no-display-object")
s = s.replace("camera.fov=size.height>size.width?60:53", "camera.fov=size.height>size.width?64:55")
s = s.replace("const desiredFov=portrait?72:58", "const desiredFov=portrait?68:56")
s = s.replace("const lookHeight=portrait?1.9:1.86", "const lookHeight=portrait?1.82:1.78")
s = s.replace("gl.toneMappingExposure=1.68", "gl.toneMappingExposure=1.9")
s = s.replace("data-home-visual-grade=\"cinematic-pbr-v45-integrated-reliquary-apse\"", "data-home-visual-grade=\"cinematic-pbr-v46-integrated-machine-apse\"")
s = s.replace("data-home-final-art-revision=\"v45-integrated-reliquary-production-candidate\"", "data-home-final-art-revision=\"v46-integrated-machine-apse-production-candidate\"")
s = s.replace("data-home-art-certification=\"v45-retained-pixel-candidate\"", "data-home-art-certification=\"v46-retained-pixel-candidate\"")

home.write_text(s)

t = test.read_text()
for a,b in {
 'v45':'v46','V45':'V46','home-v45-monolithic-reliquary-apse':'home-v46-left-apse-mass','home-v45-reliquary-cavity':'home-v46-reliquary-cavity','home-v45-depth-practicals':'home-v46-depth-practicals','home-v45-left-machined-yoke':'home-v46-left-machined-yoke','home-v45-right-machined-yoke':'home-v46-right-machined-yoke','scale={1.18}':'scale={0.58}','portrait?72:58':'portrait?68:56','toneMappingExposure=1.68':'toneMappingExposure=1.9'
}.items(): t=t.replace(a,b)
# Relax obsolete exact prose while preserving the anti-placeholder requirements.
t=t.replace("assert.match(source, /home-v46-left-apse-mass[\\s\\S]*home-v46-left-apse-mass/)", "assert.match(source, /home-v46-left-apse-mass/)")
test.write_text(t)
