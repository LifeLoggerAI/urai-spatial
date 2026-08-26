from pathlib import Path

p = Path('urai-tier1/src/spatial/layout/HomeWorldProductionFinal.tsx')
s = p.read_text()

def once(old, new, label):
    global s
    n = s.count(old)
    if n != 1:
        raise SystemExit(f'{label}: expected one match, found {n}')
    s = s.replace(old, new, 1)

once("const FIN_Z = [4.85, 1.45, -1.95, -5.35, -8.55] as const", "const FIN_Z = [3.9, -2.15, -7.35] as const", 'architectural fin cadence')

once("function AtmosphericDepth(){return <group name=\"home-atmospheric-depth\" userData={{treatment:'vertical-depth-veil-no-horizontal-card-v19'}}><mesh position={[0,4.4,-13.4]} renderOrder={-2}><planeGeometry args={[24,8.8]} /><meshBasicMaterial color=\"#0a1417\" transparent opacity={0.26} depthWrite={false} /></mesh><spotLight position={[-4.5,7.4,1.5]} color=\"#a9bec2\" intensity={0.42} distance={25} angle={0.34} penumbra={0.96} decay={2} /><spotLight position={[4.8,4.8,-3]} color=\"#5d7e86\" intensity={0.18} distance={18} angle={0.42} penumbra={0.98} decay={2} /></group>}",
     "function AtmosphericDepth(){return <group name=\"home-atmospheric-depth\" userData={{treatment:'fog-and-light-only-no-depth-card-v21'}}><spotLight position={[-4.5,7.4,1.5]} color=\"#a9bec2\" intensity={0.34} distance={25} angle={0.34} penumbra={0.97} decay={2} /><spotLight position={[4.8,4.8,-3]} color=\"#5d7e86\" intensity={0.14} distance={18} angle={0.42} penumbra={0.98} decay={2} /></group>}", 'remove horizon/depth card')

once("function OrbPlatform(){return <group position={[0,0,-2.15]} userData={{treatment:'integrated-floor-relic-plinth-v19'}}><mesh position={[0,0.026,0]} rotation={[-Math.PI/2,0,0]} receiveShadow><circleGeometry args={[1.12,128]} /><meshPhysicalMaterial color=\"#0b1110\" roughness={0.34} metalness={0.18} clearcoat={0.58} clearcoatRoughness={0.24} envMapIntensity={1.1} /></mesh><mesh position={[0,0.032,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[0.91,0.925,160]} /><meshStandardMaterial color=\"#6c6452\" emissive=\"#332c20\" emissiveIntensity={0.024} metalness={0.88} roughness={0.3} /></mesh><mesh position={[0,0.034,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[0.48,0.491,160]} /><meshStandardMaterial color=\"#547173\" emissive=\"#24484a\" emissiveIntensity={0.04} metalness={0.8} roughness={0.3} /></mesh></group>}",
     "function OrbPlatform(){return <group position={[0,0,-2.15]} userData={{treatment:'compact-integrated-relic-seat-v21'}}><mesh position={[0,0.026,0]} rotation={[-Math.PI/2,0,0]} receiveShadow><circleGeometry args={[0.74,128]} /><meshPhysicalMaterial color=\"#090e0e\" roughness={0.4} metalness={0.16} clearcoat={0.36} clearcoatRoughness={0.3} envMapIntensity={0.92} /></mesh><mesh position={[0,0.032,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[0.61,0.62,128]} /><meshStandardMaterial color=\"#655d4c\" emissive=\"#241f18\" emissiveIntensity={0.012} metalness={0.84} roughness={0.34} /></mesh><mesh position={[0,0.034,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[0.34,0.349,128]} /><meshStandardMaterial color=\"#4d6768\" emissive=\"#193536\" emissiveIntensity={0.018} metalness={0.78} roughness={0.34} /></mesh></group>}", 'compact Orb floor seat')

s = s.replace('data-home-final-art-revision="v20-physical-sanctuary"', 'data-home-final-art-revision="v21-visual-certification"')
s = s.replace('architectural-depth-v20', 'architectural-depth-v21-no-card')

for bad in ["planeGeometry args={[24,8.8]}", "vertical-depth-veil-no-horizontal-card-v19"]:
    if bad in s:
        raise SystemExit(f'forbidden retained visual defect marker: {bad}')
for required in ['fog-and-light-only-no-depth-card-v21','compact-integrated-relic-seat-v21','v21-visual-certification']:
    if required not in s:
        raise SystemExit(f'missing V21 marker: {required}')

p.write_text(s)
print('Applied V21 visual certification cleanup.')
