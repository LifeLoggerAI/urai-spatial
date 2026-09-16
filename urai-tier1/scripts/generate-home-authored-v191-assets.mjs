import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import * as THREE from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'

class NodeFileReader {
  result = null
  onloadend = null
  async readAsArrayBuffer(blob) { this.result = await blob.arrayBuffer(); this.onloadend?.() }
  async readAsDataURL(blob) { this.result = `data:${blob.type};base64,${Buffer.from(await blob.arrayBuffer()).toString('base64')}`; this.onloadend?.() }
}
globalThis.FileReader = NodeFileReader

const OUT = resolve('urai-tier1/public/assets/urai/home-production/authored-v191')
const color = (hex) => new THREE.Color(hex)

function terrainHeight(x, z) {
  const depth = THREE.MathUtils.clamp((6.2 - z) / 24.2, 0, 1)
  const lateral = Math.abs(x) / 9.2
  const channel = Math.exp(-Math.pow(x / 3.2, 4))
  const side = Math.pow(lateral, 2.65) * (0.55 + depth * 1.95)
  const far = Math.pow(depth, 3.35) * (2.2 + 0.55 * Math.sin(x * 0.42 + 0.8))
  const port = Math.exp(-(Math.pow((x + 5.9) / 2.2, 2) + Math.pow((z + 4.2) / 4.8, 2))) * 0.88
  const starboard = Math.exp(-(Math.pow((x - 6.1) / 2.0, 2) + Math.pow((z + 6.0) / 4.4, 2))) * 1.02
  const deepPort = Math.exp(-(Math.pow((x + 3.8) / 2.7, 2) + Math.pow((z + 13.0) / 3.2, 2))) * 1.12
  const groundBasin = Math.exp(-(Math.pow((x + 4.9) / 2.05, 2) + Math.pow((z + 8.8) / 2.55, 2))) * 1.22
  const mapBasin = Math.exp(-(Math.pow((x - 4.9) / 2.05, 2) + Math.pow((z + 8.8) / 2.55, 2))) * 1.22
  const strata = (Math.sin(x * 0.73 + z * 0.49) * 0.16 + Math.sin(x * 1.91 - z * 1.27) * 0.07 + Math.cos(x * 3.17 + z * 2.31) * 0.035) * (0.22 + lateral * 0.78)
  const cleft = -Math.exp(-Math.pow(x / 2.45, 2)) * (0.18 + depth * 0.18)
  return -0.52 + depth * 0.08 + side + far + port + starboard + deepPort - groundBasin - mapBasin + strata * (1 - channel * 0.72) + cleft
}

function makeLandscape() {
  // Keep the authored landscape below the repository/API binary transport ceiling.
  // The former 128 x 168 mesh exported a 1,044,464-byte GLB and was truncated
  // while committed, leaving a valid header but an incomplete index buffer.
  // This still supplies more than 11k authored vertices while producing a
  // self-contained GLB small enough to survive every governed transport path.
  const xs = 88, zs = 108, positions = [], colors = [], indices = []
  const shadow = color('#102722'), moss = color('#496d5c'), mineral = color('#7a6c5a'), cool = color('#405b60')
  for (let zi = 0; zi <= zs; zi++) {
    const tz = zi / zs, z = 6.2 - tz * 24.2
    for (let xi = 0; xi <= xs; xi++) {
      const tx = xi / xs, x = -9.2 + tx * 18.4, y = terrainHeight(x, z)
      const warpX = Math.sin(z * 0.61 + x * 0.37) * 0.025 * Math.pow(Math.abs(x) / 9.2, 1.4)
      const warpZ = Math.cos(x * 0.88 - z * 0.31) * 0.018
      positions.push(x + warpX, y, z + warpZ)
      const slope = THREE.MathUtils.clamp((y + 0.5) / 3.8, 0, 1)
      const band = 0.5 + 0.5 * Math.sin(y * 5.2 + x * 0.31 - z * 0.18)
      const c = shadow.clone().lerp(moss, 0.28 + slope * 0.54).lerp(mineral, band * 0.16).lerp(cool, tx * 0.08)
      colors.push(c.r, c.g, c.b)
    }
  }
  for (let z = 0; z < zs; z++) for (let x = 0; x < xs; x++) {
    const a = z * (xs + 1) + x, b = a + 1, c = a + xs + 1, d = c + 1
    if ((x + z) % 2) indices.push(a, b, d, a, d, c); else indices.push(a, b, c, b, d, c)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  g.setIndex(indices); g.computeVertexNormals()
  const material = new THREE.MeshStandardMaterial({ color:'#71847a', vertexColors:true, roughness:0.97, metalness:0.001 })
  const mesh = new THREE.Mesh(g, material); mesh.name = 'home-v191-continuous-authored-canyon'; mesh.receiveShadow = true
  const scene = new THREE.Scene(); scene.name = 'home-v191-authored-landscape'; scene.add(mesh)
  const strataMaterial = new THREE.MeshStandardMaterial({color:'#30473d',roughness:0.98,metalness:0,flatShading:false})
  const shelves = [
    [-10.2,-0.42,-3.8,3.6,1.25,2.2,0.18],[-10.7,0.15,-9.0,4.2,1.75,2.8,-0.12],[-9.5,1.05,-15.2,5.2,2.5,3.3,0.22],
    [10.3,-0.46,-4.6,3.7,1.3,2.3,-0.16],[10.8,0.18,-10.0,4.3,1.8,2.7,0.14],[9.3,1.08,-15.8,5.1,2.6,3.4,-0.20],
  ]
  shelves.forEach(([x,y,z,sx,sy,sz,ry], index) => {
    const geometry = deformGeometry(new THREE.SphereGeometry(1, 20, 12), 21 + index, 1.08)
    const shelf = new THREE.Mesh(geometry, strataMaterial)
    shelf.name = `home-v193-geological-shelf-${index + 1}`
    shelf.position.set(x,y,z); shelf.scale.set(sx,sy,sz); shelf.rotation.set(0.08 * (index % 2 ? -1 : 1),ry,index % 2 ? 0.11 : -0.08)
    shelf.castShadow = true; shelf.receiveShadow = true; scene.add(shelf)
  })
  const outcropMaterial = new THREE.MeshStandardMaterial({color:'#263f38',roughness:1,metalness:0,flatShading:false})
  for(let i=0;i<18;i++){
    const side=i%2?-1:1, depth=i/17
    const geometry=deformGeometry(new THREE.SphereGeometry(1,14,10),90+i,0.72+depth*.34)
    const outcrop=new THREE.Mesh(geometry,outcropMaterial)
    outcrop.name=`home-v197-integrated-weathered-canyon-outcrop-${i+1}`
    outcrop.position.set(side*(8.35+Math.sin(i*1.7)*.42),-.42+depth*1.42,3.1-depth*20.2)
    outcrop.scale.set(.72+depth*.76,.34+depth*.48,.92+depth*.72)
    outcrop.rotation.set(.08*Math.sin(i),side*(.18+.12*Math.cos(i*.8)),side*.10)
    outcrop.castShadow=true;outcrop.receiveShadow=true;scene.add(outcrop)
  }
  return scene
}

function deformGeometry(geometry, seed, vertical = 1) {
  const p = geometry.getAttribute('position')
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i)
    const n = 1 + Math.sin(x * (3.7 + seed) + y * 2.9) * 0.075 + Math.cos(z * 4.1 - y * (2.2 + seed * 0.1)) * 0.055
    p.setXYZ(i, x * n, y * n * vertical, z * n * (0.96 + Math.sin(x * 3.2 + seed) * 0.025))
  }
  p.needsUpdate = true; geometry.computeVertexNormals(); return geometry
}

function terraceGeometry(width, depth, height, seed, backLift = 0) {
  const columns = 34, rows = 26, positions = [], colors = [], indices = []
  const shadow = color('#152c29'), stone = color('#526b5f'), mineral = color('#8b7357')
  for (let rz = 0; rz <= rows; rz++) {
    const vz = rz / rows, z = (vz - .5) * depth
    for (let cx = 0; cx <= columns; cx++) {
      const vx = cx / columns, x = (vx - .5) * width
      const edge = Math.pow(Math.max(Math.abs(x) / (width * .5), Math.abs(z) / (depth * .5)), 4)
      const weather = Math.sin(x * 2.7 + seed) * .055 + Math.cos(z * 3.1 - seed) * .045 + Math.sin((x + z) * 5.3) * .018
      const y = height * (1 - edge * .74) + backLift * vz + weather
      positions.push(x, y, z)
      const band = .5 + .5 * Math.sin(y * 13 + x * .8)
      const c = shadow.clone().lerp(stone, .42 + .34 * (1-edge)).lerp(mineral, band * .14)
      colors.push(c.r,c.g,c.b)
    }
  }
  for (let z=0;z<rows;z++) for(let x=0;x<columns;x++) { const a=z*(columns+1)+x,b=a+1,c=a+columns+1,d=c+1; indices.push(a,b,c,b,d,c) }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g
}

function sanctuaryWallGeometry(width, height, depth, seed, lean = 0) {
  const columns=30, rows=24, positions=[], colors=[], indices=[]
  const dark=color('#202f38'), memory=color('#4d5368'), light=color('#8a879f')
  for(let ry=0;ry<=rows;ry++){
    const vy=ry/rows,y=vy*height
    for(let cx=0;cx<=columns;cx++){
      const vx=cx/columns,x=(vx-.5)*width
      const crown=Math.pow(Math.abs(x)/(width*.5),1.75)
      const brokenTop=(.08+.14*Math.sin(x*2.7+seed)+.07*Math.sin(x*6.1-seed))*(.25+.75*vy)
      const z=Math.sin(x*1.45+seed)*.15+Math.sin(y*3.2-x*.7)*.065+lean*vy
      positions.push(x,y-crown*.62-brokenTop,z)
      const seam=.5+.5*Math.sin(y*10.5+x*2.2+seed)
      const c=dark.clone().lerp(memory,.38+.34*vy).lerp(light,seam*.12)
      colors.push(c.r,c.g,c.b)
    }
  }
  for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){const a=y*(columns+1)+x,b=a+1,c=a+columns+1,d=c+1;indices.push(a,b,c,b,d,c)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g
}

function makePlace(kind) {
  const scene = new THREE.Scene(); scene.name = `home-v191-${kind}-authored-place`
  const isGround = kind === 'ground'
  const baseColor = isGround ? '#204b37' : '#3d315d', glow = isGround ? '#72d59a' : '#a99be0'
  const material = new THREE.MeshStandardMaterial({color:baseColor,emissive:glow,emissiveIntensity:0.055,roughness:0.89,metalness:0.002})
  if (isGround) {
    const earthMaterial=new THREE.MeshStandardMaterial({color:'#668a78',vertexColors:true,emissive:'#315a49',emissiveIntensity:.045,roughness:.96,metalness:0})
    const terrace=new THREE.Mesh(terraceGeometry(6.8,6.4,.14,17,.34),earthMaterial)
    terrace.name='home-v197-ground-integrated-weathered-foundation';terrace.position.set(0,-.48,-.12);terrace.receiveShadow=true;scene.add(terrace)
    const shelter=new THREE.Mesh(sanctuaryWallGeometry(5.8,2.45,.18,7,.34),earthMaterial)
    shelter.name='home-v197-ground-continuous-sheltering-memory-wall';shelter.position.set(-.28,-.30,-2.05);shelter.rotation.set(-.18,.08,-.06);shelter.castShadow=true;shelter.receiveShadow=true;scene.add(shelter)
    const path=new THREE.Mesh(terraceGeometry(1.6,6.9,.035,29,.42),earthMaterial)
    path.name='home-v197-ground-grown-in-place-memory-path';path.position.set(.35,-.30,1.48);path.rotation.z=-.08;path.receiveShadow=true;scene.add(path)
    const hearthMaterial=new THREE.MeshStandardMaterial({color:'#765d43',emissive:'#c79c69',emissiveIntensity:.11,roughness:.98})
    const hearth=new THREE.Mesh(deformGeometry(new THREE.SphereGeometry(.48,48,28),31,.44),hearthMaterial)
    hearth.name='home-v203-ground-embedded-weathered-hearth';hearth.position.set(-.45,-.08,-.58);hearth.scale.set(1.16,.28,1.58);hearth.receiveShadow=true;scene.add(hearth)
  } else {
    const strataMaterial=new THREE.MeshStandardMaterial({color:'#454b5d',vertexColors:true,emissive:glow,emissiveIntensity:.018,roughness:.96,metalness:0,side:THREE.DoubleSide})
    const foundation=new THREE.Mesh(terraceGeometry(7.2,6.1,.13,43,.46),strataMaterial)
    foundation.name='home-v197-life-map-integrated-memory-observatory-foundation';foundation.position.set(0,-.48,-.2);foundation.rotation.z=.025;foundation.receiveShadow=true;scene.add(foundation)
    const wall=new THREE.Mesh(sanctuaryWallGeometry(5.4,2.6,.18,53,.54),strataMaterial)
    wall.name='home-v200-life-map-integrated-weathered-memory-ledger-1';wall.position.set(.25,-.28,-2.0);wall.rotation.set(-.15,-.08,.08);wall.castShadow=true;wall.receiveShadow=true;scene.add(wall)
    const threshold=new THREE.Mesh(terraceGeometry(1.55,6.7,.035,67,.52),strataMaterial)
    threshold.name='home-v197-life-map-ascending-observatory-path';threshold.position.set(-.25,-.31,1.42);threshold.rotation.z=.10;threshold.receiveShadow=true;scene.add(threshold)
    const traceMaterial=new THREE.MeshStandardMaterial({color:'#77718d',emissive:glow,emissiveIntensity:.11,roughness:.88})
    for(let i=0;i<4;i++){
      const points=Array.from({length:7},(_,j)=>{const t=j/6;return new THREE.Vector3(-2.2+i*1.25+Math.sin(t*4+i)*.16,-.22+t*.42,-2.5+t*4.1+Math.sin(t*5+i)*.22)})
      const trace=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),42,.035+i*.006,7,false),traceMaterial)
      trace.name=`home-v203-life-map-embedded-lineage-trace-${i+1}`;trace.receiveShadow=true;scene.add(trace)
    }
  }
  return scene
}

function makeHeart() {
  // A single folded mantle, not a ball or literal heart. The offset S-curve gives
  // the companion a changing open silhouette while the irregular tube section
  // keeps it tactile at close range. This is the editable source authority used
  // to produce the runtime GLB.
  const spine=[]
  for(let i=0;i<18;i++){
    const t=i/17, angle=-1.05+t*Math.PI*2.18
    const radius=.34+.19*Math.sin(t*Math.PI)+.07*Math.sin(t*Math.PI*5.0)
    spine.push(new THREE.Vector3(
      Math.cos(angle)*radius-.14+t*.28,
      .72-t*1.42+.18*Math.sin(t*Math.PI*3.0),
      Math.sin(angle)*radius*.62+.10*Math.sin(t*Math.PI*4.0),
    ))
  }
  const curve=new THREE.CatmullRomCurve3(spine,false,'centripetal',.42)
  const g=new THREE.TubeGeometry(curve,144,.25,14,false)
  const p=g.getAttribute('position')
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i)
    const strata=Math.sin(y*15+x*9+z*12)*.036+Math.sin(x*23-z*11)*.019
    const current=Math.exp(-Math.pow((x-.18)/.22,2)-Math.pow((y+.08)/.48,2))*.075
    p.setXYZ(i,x*(1+strata)-current,y*(1+strata*.48)+.028*Math.sin(x*9),z*(1+strata*.72))
  }
  p.needsUpdate=true;g.computeVertexNormals()
  const deep=color('#163c34'),light=color('#78bda5'),warm=color('#b79b79'),colors=[]
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);const band=.5+.5*Math.sin(y*12+x*8);const c=deep.clone().lerp(light,.24+band*.22).lerp(warm,Math.max(0,x)*.12);colors.push(c.r,c.g,c.b)}
  g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3))
  const m = new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:'#496f63',vertexColors:true,emissive:'#6ba891',emissiveIntensity:0.025,roughness:0.91,metalness:0,flatShading:true}))
  m.name='home-v201-single-connected-folded-living-memory-mantle';m.rotation.set(-0.12,0.36,-0.08);m.castShadow=true
  const scene=new THREE.Scene();scene.name='home-v201-authored-orb-presence';scene.add(m);return scene
}

async function exportGlb(scene, name) {
  const exporter = new GLTFExporter()
  const data = await exporter.parseAsync(scene, { binary:true, onlyVisible:true, trs:false })
  const path = resolve(OUT, name); await mkdir(dirname(path), {recursive:true}); await writeFile(path, Buffer.from(data))
  console.log(`${name} ${Buffer.byteLength(data)} bytes`)
}

await exportGlb(makeLandscape(), 'home-continuous-landscape-v191.glb')
await exportGlb(makePlace('ground'), 'home-ground-place-v191.glb')
await exportGlb(makePlace('life-map'), 'home-life-map-place-v191.glb')
await exportGlb(makeHeart(), 'urai-living-memory-heart-v191.glb')
