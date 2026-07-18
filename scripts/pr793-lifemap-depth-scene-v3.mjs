import fs from 'node:fs'
const p='urai-tier1/src/components/lifemap/AdaptiveLifeMapScene.tsx'
const r=()=>fs.readFileSync(p,'utf8');const w=(v)=>fs.writeFileSync(p,v)
function between(a,b,v){const s=r(),i=s.indexOf(a),j=s.indexOf(b,i);if(i<0||j<0||s.indexOf(a,i+a.length)>=0)throw new Error(`marker ${a}`);w(s.slice(0,i)+v+s.slice(j))}
function once(a,b){const s=r(),i=s.indexOf(a);if(i<0||s.indexOf(a,i+a.length)>=0)throw new Error(`source ${a}`);w(s.slice(0,i)+b+s.slice(i+a.length))}

between('function GoalMonuments() {','\n\nfunction PrivateVaults()',`function GoalMonuments() {
  const beacons = useMemo(() => [
    { color: "#b7efff", points: [[-7.4,-1.8,-19.5],[-7,0.2,-19.9],[-7.55,2.1,-20.4],[-6.9,4.4,-21.1]] },
    { color: "#fff0b8", points: [[6.8,-2,-22.5],[6.3,0.7,-22.8],[7.1,3.2,-23.4],[6.6,6.1,-24.1]] },
    { color: "#c7b7ff", points: [[2.6,-2.4,-26.5],[2.1,-0.2,-26.9],[2.9,2,-27.5],[2.4,4.8,-28.2]] },
  ].map((item) => ({ ...item, curve: new THREE.CatmullRomCurve3(item.points.map((point) => new THREE.Vector3(...point as [number,number,number]))), crown: item.points.at(-1) as [number,number,number] })), []);
  return <group name="life-map-far-goal-beacons">{beacons.map((beacon,index)=><group key={beacon.color}>
    <mesh name="life-map-goal-thread"><tubeGeometry args={[beacon.curve,64,index===1?0.045:0.03,8,false]}/><meshBasicMaterial color={beacon.color} transparent opacity={index===1?0.28:0.16} depthWrite={false} blending={THREE.AdditiveBlending}/></mesh>
    <mesh position={beacon.crown} name="life-map-goal-crown"><sphereGeometry args={[index===1?0.14:0.1,20,20]}/><meshBasicMaterial color={beacon.color} transparent opacity={0.78} depthWrite={false} blending={THREE.AdditiveBlending}/></mesh>
    <pointLight position={beacon.crown} color={beacon.color} intensity={index===1?0.7:0.35} distance={5.5}/>
  </group>)}</group>;
}\n\n`)

between('function PrivateVaults() {','\n\nfunction EmotionalWeather',`function PrivateVaults() {
  const vaults=[
    {position:[-5.6,-2.4,-7.2] as [number,number,number],rotation:[0.08,0.44,-0.06] as [number,number,number],color:"#8ddfff",radius:0.94},
    {position:[5.7,-2.05,-9.2] as [number,number,number],rotation:[-0.04,-0.38,0.04] as [number,number,number],color:"#c3a2ff",radius:0.72},
  ];
  return <group name="life-map-private-vaults">{vaults.map((vault,index)=><group key={vault.color} position={vault.position} rotation={vault.rotation} name="life-map-private-vault-arc">
    <mesh rotation={[Math.PI/2,0,index?-0.22:0.18]}><torusGeometry args={[vault.radius,0.025,10,88,Math.PI*1.62]}/><meshBasicMaterial color={vault.color} transparent opacity={0.14} depthWrite={false} blending={THREE.AdditiveBlending}/></mesh>
    <mesh rotation={[Math.PI/2,0.18,index?0.34:-0.28]} scale={0.72}><torusGeometry args={[vault.radius,0.014,8,72,Math.PI*1.28]}/><meshBasicMaterial color="#e8fbff" transparent opacity={0.08} depthWrite={false}/></mesh>
    <mesh position={[0,0,0.04]}><sphereGeometry args={[0.07,16,16]}/><meshBasicMaterial color={vault.color} transparent opacity={0.52} depthWrite={false} blending={THREE.AdditiveBlending}/></mesh>
  </group>)}</group>;
}\n\n`)

between('function EmotionalWeather({ profile }: { profile: SpatialQualityProfile }) {','\n\nfunction MemoryPath',`function EmotionalWeather({ profile }: { profile: SpatialQualityProfile }) {
  const group=useRef<THREE.Group>(null);
  const geometry=useMemo(()=>{
    const clouds=[[-3.4,1.1,-8.8,"#4fdfff",4.2,1.8,2.4],[3.5,-0.4,-9.8,"#b177ff",4.8,2,2.8],[0.8,2.4,-12.2,"#fff1bd",3.6,1.4,2.2]] as const;
    const n=profile.tier==="high"?180:profile.tier==="medium"?120:72,positions=new Float32Array(clouds.length*n*3),colors=new Float32Array(clouds.length*n*3);
    clouds.forEach((cloud,c)=>{const color=new THREE.Color(cloud[3]);for(let i=0;i<n;i++){const o=(c*n+i)*3,a=i*2.399963229728653+c*0.82,q=Math.sqrt((i+1)/n),l=0.45+(i%7)*0.045;positions[o]=cloud[0]+Math.cos(a)*q*cloud[4];positions[o+1]=cloud[1]+Math.sin(a*1.37)*q*cloud[5];positions[o+2]=cloud[2]+Math.cos(a*0.73)*q*cloud[6];colors[o]=color.r*l;colors[o+1]=color.g*l;colors[o+2]=color.b*l;}});
    const next=new THREE.BufferGeometry();next.setAttribute("position",new THREE.BufferAttribute(positions,3));next.setAttribute("color",new THREE.BufferAttribute(colors,3));return next;
  },[profile.tier]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  useFrame(({clock})=>{if(!group.current||profile.reducedMotion||!profile.documentVisible)return;group.current.position.x=Math.sin(clock.elapsedTime*0.035)*0.34;group.current.rotation.z=Math.sin(clock.elapsedTime*0.022)*0.018;});
  return <group ref={group} name="life-map-emotional-weather"><points geometry={geometry} frustumCulled={false}><pointsMaterial size={profile.tier==="high"?0.17:0.13} vertexColors transparent opacity={0.18} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending}/></points><pointLight position={[-3.2,1.3,-8.4]} color="#4fdfff" intensity={0.34} distance={7}/><pointLight position={[3.4,-0.2,-9.4]} color="#b177ff" intensity={0.28} distance={7}/></group>;
}\n\n`)

between('function ForegroundDepthCrossings({ profile }: { profile: SpatialQualityProfile }) {','\n\nfunction LifeMapWorld',`function ForegroundDepthCrossings({ profile }: { profile: SpatialQualityProfile }) {
  const group=useRef<THREE.Group>(null);
  const crossings=useMemo(()=>[
    {color:"#79dfff",curve:new THREE.CatmullRomCurve3([[-8.4,-4.1,4.2],[-7.9,-1.4,3.2],[-8.5,1.7,2.2],[-7.6,4.6,1.1]].map((point)=>new THREE.Vector3(...point as [number,number,number])))},
    {color:"#b68cff",curve:new THREE.CatmullRomCurve3([[8.6,4.5,3.4],[7.9,2,2.5],[8.5,-0.7,1.6],[7.8,-3.8,0.6]].map((point)=>new THREE.Vector3(...point as [number,number,number])))},
  ],[]);
  useFrame(({clock})=>{if(!group.current||profile.reducedMotion||!profile.documentVisible)return;group.current.rotation.y=Math.sin(clock.elapsedTime*0.04)*0.018;});
  return <group ref={group} name="life-map-near-depth-crossings">{crossings.map((crossing)=><mesh key={crossing.color} name="life-map-near-crossing-thread"><tubeGeometry args={[crossing.curve,52,0.018,7,false]}/><meshBasicMaterial color={crossing.color} transparent opacity={0.09} depthWrite={false} blending={THREE.AdditiveBlending}/></mesh>)}</group>;
}\n\n`)

once('  const { nodes, loading, error, usingSeedData } = useLifeMapEvents();','  const requestedDemo = params.get("demo") === "1";\n  const { nodes, loading, error, usingSeedData } = useLifeMapEvents(requestedDemo ? "demo-user" : undefined);')
