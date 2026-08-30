#!/usr/bin/env python3
from pathlib import Path

SOURCE = Path('urai-tier1/src/spatial/layout/HomeWorldProductionFinal.tsx')
text = SOURCE.read_text()


def replace_once(old: str, new: str, label: str) -> None:
    global text
    if new in text:
        return
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one source match, found {count}')
    text = text.replace(old, new, 1)


replace_once(
"""function ProductionSanctuary(){return <group name=\"home-v49-scanned-detail-layer\" userData={{visualOwner:'v49-authored-sanctuary-detail-only',construction:'restrained-cc0-practicals-over-authored-load-bearing-sanctuary',visualTreatment:'v49-no-raw-rock-shell-no-pipe-kitbash'}}>
  <group name=\"home-v49-authored-practicals\" userData={{treatment:'v49-real-caged-practicals-integrated-into-authored-apse'}}>
    <ProductionAsset url={V48_CAGED_SCONCE} name=\"home-v49-left-sconce\" position={[-4.42,2.18,-5.92]} rotation={[0,0.72,0]} span={0.56}/>
    <ProductionAsset url={V48_CAGED_SCONCE} name=\"home-v49-right-sconce\" position={[4.34,2.12,-6.08]} rotation={[0,-0.74,0]} span={0.56}/>
    <pointLight position={[-4.28,2.12,-5.72]} color=\"#d1aa73\" intensity={0.54} distance={5.8} decay={2}/>
    <pointLight position={[4.2,2.08,-5.88]} color=\"#7db0a9\" intensity={0.5} distance={5.6} decay={2}/>
  </group>
</group>}""",
"""function ProductionSanctuary(){return <group name=\"home-v49-scanned-detail-layer\" userData={{visualOwner:'v66r1-photogrammetry-integrated-sanctuary',construction:'restrained-cc0-practicals-and-embedded-photogrammetry-relief',visualTreatment:'v66r1-scanned-relief-breaks-flat-wall-read'}}>
  <group name=\"home-v49-authored-practicals\" userData={{treatment:'v49-real-caged-practicals-integrated-into-authored-apse'}}>
    <ProductionAsset url={V48_CAGED_SCONCE} name=\"home-v49-left-sconce\" position={[-4.42,2.18,-5.92]} rotation={[0,0.72,0]} span={0.56}/>
    <ProductionAsset url={V48_CAGED_SCONCE} name=\"home-v49-right-sconce\" position={[4.34,2.12,-6.08]} rotation={[0,-0.74,0]} span={0.56}/>
    <pointLight position={[-4.28,2.12,-5.72]} color=\"#d1aa73\" intensity={0.62} distance={6.2} decay={2}/>
    <pointLight position={[4.2,2.08,-5.88]} color=\"#7db0a9\" intensity={0.58} distance={6.0} decay={2}/>
  </group>
  <group name=\"home-v66r1-embedded-photogrammetry-relief\" userData={{treatment:'v66r1-real-scanned-rock-relief-seated-into-wall-mass-not-floating-collage'}}>
    <ProductionAsset url={V48_ROCK_FACE_01} name=\"home-v66r1-left-deep-relief\" position={[-5.72,1.38,-8.08]} rotation={[0.04,1.08,0.08]} span={3.25} scale={[0.94,1.1,0.62]}/>
    <ProductionAsset url={V48_ROCK_FACE_02} name=\"home-v66r1-right-deep-relief\" position={[5.7,1.12,-6.86]} rotation={[-0.02,-1.04,-0.06]} span={3.0} scale={[0.98,1.12,0.64]}/>
    <ProductionAsset url={V48_ROCK_FACE_02} name=\"home-v66r1-left-mid-relief\" position={[-5.75,0.86,-3.38]} rotation={[0.03,1.22,-0.03]} span={2.15} scale={[0.9,1.0,0.58]}/>
  </group>
</group>}""",
'production sanctuary photogrammetry integration',
)

replace_once(
"""function OrbCradle(){return <group name=\"home-orb-engineered-cradle\" userData={{treatment:'v57-service-vault-load-path-no-pedestal-no-ring-no-primitive-clamps'}}><ReliquaryWing side={-1}/><ReliquaryWing side={1}/></group>}""",
"""function OrbCradle(){return <group name=\"home-orb-engineered-cradle\" userData={{treatment:'v66r1-wall-seated-engineered-reliquary-no-pedestal-no-ring-no-primitive-clamps'}}>
  <ReliquaryWing side={-1}/><ReliquaryWing side={1}/>
  <RoundedBox args={[0.58,3.35,0.72]} radius={0.09} smoothness={5} position={[-2.38,1.82,-7.62]} rotation={[0,0.08,-0.045]} castShadow receiveShadow><meshPhysicalMaterial color=\"#202724\" roughness={0.64} metalness={0.24} clearcoat={0.06} clearcoatRoughness={0.68} envMapIntensity={0.78}/></RoundedBox>
  <RoundedBox args={[0.58,3.35,0.72]} radius={0.09} smoothness={5} position={[2.38,1.82,-7.62]} rotation={[0,-0.08,0.045]} castShadow receiveShadow><meshPhysicalMaterial color=\"#202724\" roughness={0.64} metalness={0.24} clearcoat={0.06} clearcoatRoughness={0.68} envMapIntensity={0.78}/></RoundedBox>
  <TaperedLoadBeam from={[-2.14,3.2,-7.48]} to={[-0.78,2.52,-7.28]} width={0.24} color=\"#59645f\"/>
  <TaperedLoadBeam from={[2.14,3.2,-7.48]} to={[0.78,2.52,-7.28]} width={0.24} color=\"#59645f\"/>
  <StructuralRib points={[[ -1.96,0.42,-7.5],[-1.7,2.52,-7.46],[0,3.38,-7.42],[1.7,2.52,-7.46],[1.96,0.42,-7.5]]} radius={0.062} color=\"#6b7770\" metalness={0.72} roughness={0.38}/>
  <pointLight position={[0,2.22,-7.12]} color=\"#8fcdbf\" intensity={0.44} distance={5.2} decay={2}/>
</group>}""",
'orb reliquary integration',
)

replace_once(
"""    {ORB_FRAGMENT_LAYOUT.map(([p,r,scale],i)=><RoundedBox key={i} args={[.42,.2,.78]} radius={.07} smoothness={5} position={p as [number,number,number]} rotation={r as [number,number,number]} scale={scale*8.2} castShadow receiveShadow><meshStandardMaterial color={i%2?'#59635e':'#73796f'} metalness={.78} roughness={.31} envMapIntensity={1.0}/></RoundedBox>)}
    <mesh scale={.34} castShadow><icosahedronGeometry args={[1,2]}/><meshStandardMaterial color=\"#7fc6b7\" emissive=\"#2c776c\" emissiveIntensity={.34} metalness={.42} roughness={.3}/></mesh>""",
"""    {ORB_FRAGMENT_LAYOUT.map(([p,r,scale],i)=><RoundedBox key={i} args={[.42,.2,.78]} radius={.07} smoothness={5} position={p as [number,number,number]} rotation={r as [number,number,number]} scale={scale*10.8} castShadow receiveShadow><meshStandardMaterial color={i%2?'#59635e':'#73796f'} metalness={.78} roughness={.31} envMapIntensity={1.0}/></RoundedBox>)}
    <mesh scale={.43} castShadow><icosahedronGeometry args={[1,2]}/><meshStandardMaterial color=\"#7fc6b7\" emissive=\"#2c776c\" emissiveIntensity={.34} metalness={.42} roughness={.3}/></mesh>""",
'orb hierarchy enlargement',
)

replace_once(
"""  return <group userData={{treatment:'v47-recessed-threshold-seam-no-freestanding-arch-or-columns',destination:tone}}>
    <mesh position={[0,.055,.04]} rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[1.9,.22]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={.12} roughness={.58} metalness={.32} /></mesh>
    {authoredPortal?<group position={[0,1.34,-1.35]} scale={0.026} visible={false}><primitive object={model} /></group>:null}
    <mesh position={[0,1.45,0.04]} onClick={(event)=>{event.stopPropagation();onActivate()}}><boxGeometry args={[2.2,2.9,1.1]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh>
  </group>""",
"""  const portalTone=tone==='ground'?'#5c8378':'#747ba4'
  return <group userData={{treatment:'v66r1-recessed-load-bearing-threshold-aperture-no-freestanding-arch',destination:tone}}>
    <RoundedBox args={[.34,3.18,.64]} radius={.055} smoothness={4} position={[-1.16,1.58,.12]} castShadow receiveShadow><meshPhysicalMaterial color=\"#1a211f\" roughness={.68} metalness={.18} clearcoat={.05} clearcoatRoughness={.72}/></RoundedBox>
    <RoundedBox args={[.34,3.18,.64]} radius={.055} smoothness={4} position={[1.16,1.58,.12]} castShadow receiveShadow><meshPhysicalMaterial color=\"#1a211f\" roughness={.68} metalness={.18} clearcoat={.05} clearcoatRoughness={.72}/></RoundedBox>
    <RoundedBox args={[2.66,.34,.64]} radius={.055} smoothness={4} position={[0,3.02,.12]} castShadow receiveShadow><meshPhysicalMaterial color=\"#1e2623\" roughness={.64} metalness={.22} clearcoat={.05} clearcoatRoughness={.68}/></RoundedBox>
    <mesh position={[0,1.57,-.16]} receiveShadow><planeGeometry args={[1.92,2.66]} /><meshPhysicalMaterial color=\"#07110f\" emissive={portalTone} emissiveIntensity={tone==='ground'?.2:.28} transparent opacity={.8} transmission={.08} roughness={.42} metalness={.08} clearcoat={.22} clearcoatRoughness={.36} side={THREE.DoubleSide}/></mesh>
    <mesh position={[0,.055,.04]} rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[1.9,.22]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={.18} roughness={.58} metalness={.32} /></mesh>
    <pointLight position={[0,1.68,.18]} color={portalTone} intensity={tone==='ground'?.28:.34} distance={4.6} decay={2}/>
    {authoredPortal?<group position={[0,1.34,-1.35]} scale={0.026} visible={false}><primitive object={model} /></group>:null}
    <mesh position={[0,1.55,0.04]} onClick={(event)=>{event.stopPropagation();onActivate()}}><boxGeometry args={[2.2,3.1,1.1]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh>
  </group>""",
'threshold aperture integration',
)

replace_once(
"""    let next:Nearby=null,best=Infinity
    for(const [name,p,r] of candidates){const d=Math.hypot(pos.current.x-p.x,pos.current.z-p.z);if(d<r&&d<best){next=name;best=d}}
    if(next!==last.current){last.current=next;onNearby(next)}""",
"""    let next:Nearby=null,best=Infinity
    for(const [name,p,r] of candidates){const d=Math.hypot(pos.current.x-p.x,pos.current.z-p.z);if(d<r&&d<best){next=name;best=d}}
    if(next){
      const focus=next==='orb'?ORB.clone():next==='ground'?GROUND.clone():LIFE_MAP.clone()
      focus.y=next==='orb'?2.12:1.58
      const freeLook=camera.quaternion.clone()
      camera.lookAt(focus)
      const landmarkLook=camera.quaternion.clone()
      camera.quaternion.copy(freeLook).slerp(landmarkLook,1-Math.pow(0.00008,delta))
    }
    if(next!==last.current){last.current=next;onNearby(next)}""",
'landmark focus composition',
)

replace_once(
"""<PhysicalEnvironment /><ambientLight intensity={0.3} color=\"#c9d8d3\" /><hemisphereLight args={['#91aaa4','#111713',0.5]} /><directionalLight position={[-10,15,8]} intensity={0.72} color=\"#e8d6b8\" /><directionalLight position={[9,8,-10]} intensity={0.48} color=\"#79aaa2\" />""",
"""<PhysicalEnvironment /><ambientLight intensity={0.4} color=\"#c9d8d3\" /><hemisphereLight args={['#91aaa4','#111713',0.6]} /><directionalLight position={[-10,15,8]} intensity={0.86} color=\"#e8d6b8\" /><directionalLight position={[9,8,-10]} intensity={0.58} color=\"#79aaa2\" />""",
'balanced sanctuary lighting',
)

SOURCE.write_text(text)
print('Applied V66 retained-pixel composition repair: landmark framing, real scanned relief, engineered Orb cradle, visible thresholds, balanced light.')
