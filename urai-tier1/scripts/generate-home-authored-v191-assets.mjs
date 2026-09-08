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
  const xs = 96, zs = 120, positions = [], colors = [], indices = []
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
  const material = new THREE.MeshStandardMaterial({ color:'#71847a', vertexColors:true, roughness:0.94, metalness:0.001 })
  const mesh = new THREE.Mesh(g, material); mesh.name = 'home-v191-continuous-authored-canyon'; mesh.receiveShadow = true
  const scene = new THREE.Scene(); scene.name = 'home-v191-authored-landscape'; scene.add(mesh)
  const strataMaterial = new THREE.MeshStandardMaterial({color:'#30473d',roughness:0.98,metalness:0,flatShading:true})
  const shelves = [
    [-10.2,-0.42,-3.8,3.6,1.25,2.2,0.18],[-10.7,0.15,-9.0,4.2,1.75,2.8,-0.12],[-9.5,1.05,-15.2,5.2,2.5,3.3,0.22],
    [10.3,-0.46,-4.6,3.7,1.3,2.3,-0.16],[10.8,0.18,-10.0,4.3,1.8,2.7,0.14],[9.3,1.08,-15.8,5.1,2.6,3.4,-0.20],
  ]
  shelves.forEach(([x,y,z,sx,sy,sz,ry], index) => {
    const geometry = deformGeometry(new THREE.DodecahedronGeometry(1, 1), 21 + index, 1.08)
    const shelf = new THREE.Mesh(geometry, strataMaterial)
    shelf.name = `home-v193-geological-shelf-${index + 1}`
    shelf.position.set(x,y,z); shelf.scale.set(sx,sy,sz); shelf.rotation.set(0.08 * (index % 2 ? -1 : 1),ry,index % 2 ? 0.11 : -0.08)
    shelf.castShadow = true; shelf.receiveShadow = true; scene.add(shelf)
  })
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

function makePlace(kind) {
  const scene = new THREE.Scene(); scene.name = `home-v191-${kind}-authored-place`
  const isGround = kind === 'ground'
  const baseColor = isGround ? '#204b37' : '#3d315d', glow = isGround ? '#72d59a' : '#a99be0'
  const material = new THREE.MeshStandardMaterial({color:baseColor,emissive:glow,emissiveIntensity:0.055,roughness:0.89,metalness:0.002})
  if (isGround) {
    const basin = new THREE.Mesh(deformGeometry(new THREE.CylinderGeometry(1.65,1.9,.20,18),9,.58),material)
    basin.name='home-v196-ground-weathered-gathering-earth'; basin.position.y=-.04; basin.scale.set(1.18,1,.86); basin.receiveShadow=true; scene.add(basin)
    const roots = [[-1.35,.18,.16,-.72],[1.28,.16,.10,.66],[-.92,.22,-.72,-.34],[.90,.20,-.74,.38],[-.18,.16,.96,-1.18]]
    roots.forEach(([x,y,z,rz],i)=>{const g=deformGeometry(new THREE.CapsuleGeometry(.17,1.22,6,12),13+i,.78);const m=new THREE.Mesh(g,material);m.name=`home-v196-ground-sheltering-root-${i+1}`;m.position.set(x,y,z);m.rotation.set(Math.PI/2.55,0,rz);m.castShadow=true;m.receiveShadow=true;scene.add(m)})
    for (let i=0;i<8;i++) { const angle=i/8*Math.PI*2; const g=deformGeometry(new THREE.DodecahedronGeometry(.34,1),70+i,.72); const seat=new THREE.Mesh(g,material); seat.name=`home-v196-ground-gathering-seat-${i+1}`; seat.position.set(Math.cos(angle)*1.42,.22,Math.sin(angle)*1.12); seat.scale.set(1.20,.58,.92); seat.rotation.y=-angle; seat.castShadow=true; seat.receiveShadow=true; scene.add(seat) }
    const hearthMaterial=new THREE.MeshStandardMaterial({color:'#6f5842',emissive:'#c19462',emissiveIntensity:.16,roughness:.96})
    const hearth=new THREE.Mesh(deformGeometry(new THREE.CylinderGeometry(.62,.78,.24,12),31,.8),hearthMaterial);hearth.name='home-v196-ground-tactile-memory-hearth';hearth.position.y=.16;hearth.receiveShadow=true;scene.add(hearth)
  } else {
    const strataMaterial=new THREE.MeshStandardMaterial({color:'#413b62',emissive:glow,emissiveIntensity:.07,roughness:.84,metalness:0})
    const branches=[[0,.62,0,1.30,.22,0],[-.48,1.45,0,1.08,.16,-.58],[.48,1.45,-.04,1.08,.16,.58],[-.92,2.18,.02,.92,.13,-.82],[.92,2.18,-.06,.92,.13,.82],[-.34,2.50,.04,.78,.12,-.34],[.34,2.50,-.02,.78,.12,.34]]
    branches.forEach(([x,y,z,len,r,rz],i)=>{const g=deformGeometry(new THREE.CapsuleGeometry(r,len,5,10),41+i,1);const m=new THREE.Mesh(g,strataMaterial);m.name=`home-v196-life-map-ascending-memory-branch-${i+1}`;m.position.set(x,y,z);m.rotation.set(0,0,rz);m.castShadow=true;scene.add(m)})
    const layers=[[-1.28,2.52,.08,.30],[-.62,2.88,-.08,.36],[0,3.10,.06,.42],[.64,2.88,-.04,.34],[1.28,2.52,.10,.29],[-.78,1.92,.12,.24],[.78,1.92,-.10,.24]]
    layers.forEach(([x,y,z,s],i)=>{const g=deformGeometry(new THREE.DodecahedronGeometry(s,1),52+i,1.12);const m=new THREE.Mesh(g,strataMaterial);m.name=`home-v196-life-map-suspended-memory-canopy-${i+1}`;m.position.set(x,y,z);m.rotation.set(.22,i*.47,.15);m.castShadow=true;scene.add(m)})
  }
  return scene
}

function makeHeart() {
  const u = 52, v = 38, positions = [], colors = [], indices = []
  const deep = color('#163c34'), light = color('#78bda5'), warm = color('#b79b79')
  for (let yi = 0; yi <= v; yi++) {
    const phi = yi / v * Math.PI
    for (let xi = 0; xi <= u; xi++) {
      const theta = xi / u * Math.PI * 2
      const sy = Math.cos(phi), ring = Math.sin(phi)
      let x = ring * Math.cos(theta), z = ring * Math.sin(theta), y = sy
      const cleft = Math.exp(-Math.pow(x / 0.27, 2)) * Math.exp(-Math.pow((y - 0.72) / 0.34, 2)) * 0.34
      const taper = 0.54 + 0.46 * ((y + 1) * 0.5)
      const memoryLayer = Math.sin(theta * 7 + phi * 5.3) * 0.070 + Math.sin(theta * 13 - phi * 3.7) * 0.035
      const living = 1 + Math.sin(theta * 3 + phi * 2.1) * 0.115 + Math.cos(theta * 5 - phi * 1.4) * 0.075 + memoryLayer
      x = x * taper * 0.72 * living * (1 + 0.08 * Math.sin(theta + 0.6))
      z = z * taper * 0.56 * living
      y = y * 0.90 - cleft + 0.055 * Math.sin(theta * 2 + phi) * ring
      positions.push(x,y,z)
      const stratum = .5 + .5 * Math.sin(theta * 9 + phi * 11)
      const c = deep.clone().lerp(light, THREE.MathUtils.clamp((y + 0.9) / 1.8,0,1) * (0.25 + stratum * .22)).lerp(warm, Math.max(0,x) * (0.08 + stratum * .08))
      colors.push(c.r,c.g,c.b)
    }
  }
  for (let y=0;y<v;y++) for(let x=0;x<u;x++){const a=y*(u+1)+x,b=a+1,c=a+u+1,d=c+1;indices.push(a,b,c,b,d,c)}
  const g = new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals()
  const m = new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:'#496f63',vertexColors:true,emissive:'#6ba891',emissiveIntensity:0.035,roughness:0.98,metalness:0,flatShading:true}))
  m.name='home-v196-single-connected-asymmetric-stratified-living-memory-heart';m.rotation.set(-0.12,0.38,-0.14);m.castShadow=true
  const scene=new THREE.Scene();scene.name='home-v191-authored-orb-heart';scene.add(m);return scene
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
