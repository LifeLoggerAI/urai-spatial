import * as THREE from 'three'

// Original URAI geometry and material source. No downloaded imagery or scan UVs.
// V259 keeps the V251 Focus authority while turning the selected memory from
// dark geology into a low, open mineral-memory bloom: separated leaves, real
// negative space, and bright embedded vein language without spheres/cages.
const STRATA = [
  [-.70, .08, 1.30, .20, -.14, -.14],
  [-.46, -.30, 1.48, .18, -.18, .12],
  [-.20, -.48, 1.22, .15, -.08, .24],
  [.08, -.50, 1.12, .14, .16, .18],
  [.34, -.38, 1.28, .16, .18, .06],
  [.58, -.10, 1.18, .18, .12, -.16],
  [-.34, .30, 1.08, .14, -.20, -.12],
  [.26, .26, 1.02, .13, .18, .10],
]

export function createFocusStrata() {
  return STRATA.map(([cx, cz, height, width, lean, turn], plate) => {
    const positions: number[] = [], uvs: number[] = [], colors: number[] = [], indices: number[] = []
    const rows = 54, columns = 18
    for (let face = 0; face < 2; face++) for (let row = 0; row <= rows; row++) for (let column = 0; column <= columns; column++) {
      const t = row / rows, s = column / columns, across = s * 2 - 1
      const crown = .055 * Math.sin(s * 14 + plate * 3) + .025 * Math.sin(s * 31 + plate)
      const taper = .70 - .44 * t + .10 * Math.sin(t * 4.7 + plate)
      const root = .12 * Math.exp(-t * 12)
      const grain = .012 * Math.sin(s * 63 + t * 5 + plate) + .008 * Math.sin(s * 147 - t * 13)
      const fractureWave = Math.sin(t * 24 + s * 4 + plate) * Math.sin(s * 13 + plate * .7)
      const fracture = .026 * fractureWave
      const x = cx + lean * t * t + across * (width * taper + root)
      const y = -1.40 + t * (height + crown) + .018 * Math.sin(s * 19 + t * 32)
      const z = cz + turn * t + .085 * across * across + grain + fracture + (face ? -.038 : .038) * (1 - .42 * t)
      positions.push(x, y, z); uvs.push(s * 1.7, t * 3.2)

      // Embedded pale veins stay part of the material rather than becoming an
      // external cable/cage. They brighten fracture history inside each leaf.
      const vein = Math.pow(Math.max(0, 1 - Math.abs(fractureWave)), 10)
      const heightLight = .18 * t
      const base = new THREE.Color(plate % 3 === 0 ? '#9fc5b4' : plate % 3 === 1 ? '#b9cbb5' : '#8fb9b2')
      const history = new THREE.Color(plate % 2 ? '#e7d5ad' : '#c5e6dc')
      const c = base.lerp(history, Math.min(.76, vein * .68 + heightLight)).multiplyScalar(.78 + .12 * s)
      colors.push(c.r, c.g, c.b)
    }
    const stride = columns + 1, layer = stride * (rows + 1)
    for (let face = 0; face < 2; face++) for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
      const a = face * layer + row * stride + col, b = a + 1, c = a + stride, d = c + 1
      if (face) indices.push(a,c,b,b,c,d); else indices.push(a,b,c,b,d,c)
    }
    for (let row = 0; row < rows; row++) for (const col of [0, columns]) {
      const a = row * stride + col, b = a + stride
      indices.push(a,b,a+layer,b,b+layer,a+layer)
    }
    for (const row of [0, rows]) for (let col = 0; col < columns; col++) {
      const a = row * stride + col, b = a+1
      indices.push(a,a+layer,b,b,a+layer,b+layer)
    }
    const result = new THREE.BufferGeometry()
    result.setAttribute('position',new THREE.Float32BufferAttribute(positions,3)); result.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2)); result.setAttribute('color',new THREE.Float32BufferAttribute(colors,3)); result.setIndex(indices); result.computeVertexNormals(); result.computeBoundingSphere()
    return result
  })
}

export function createFocusSurfaceMaps(): [THREE.Texture, THREE.Texture, THREE.Texture] {
  const size = 512, h = new Float32Array(size * size), rgba = new Uint8Array(size*size*4), normals = new Uint8Array(rgba.length), rough = new Uint8Array(rgba.length)
  const hash = (x:number,y:number) => { const v = Math.sin(x*127.1+y*311.7)*43758.5453; return v-Math.floor(v) }
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    const u=x/size,v=y/size, grain=hash(x,y), vein=Math.abs(Math.sin(u*92 + Math.sin(v*19)*1.4 + Math.sin(v*47)*.23))
    const history=vein<.075 ? 1-vein/.075 : 0
    const layer=.5+.5*Math.sin(v*143+Math.sin(u*24)*.7)
    const value=.48+grain*.10+layer*.08
    h[y*size+x]=value-history*.025
    const i=(y*size+x)*4
    const r=Math.min(255,126+value*88+history*74)
    const g=Math.min(255,148+value*92+history*72)
    const b=Math.min(255,136+value*86+history*54)
    rgba.set([r,g,b,255],i)
    rough.set([255,Math.min(255,218+grain*30-layer*12),0,255],i)
  }
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    const dx=(h[y*size+(x+1)%size]-h[y*size+(x+size-1)%size])*2.1
    const dy=(h[((y+1)%size)*size+x]-h[((y+size-1)%size)*size+x])*2.1
    const n=new THREE.Vector3(-dx,-dy,1).normalize()
    normals.set([(n.x*.5+.5)*255,(n.y*.5+.5)*255,(n.z*.5+.5)*255,255],(y*size+x)*4)
  }
  const maps = [rgba,normals,rough].map((data,index)=>{
    const texture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat)
    texture.wrapS=texture.wrapT=THREE.RepeatWrapping; texture.generateMipmaps=true; texture.minFilter=THREE.LinearMipmapLinearFilter; texture.magFilter=THREE.LinearFilter; texture.anisotropy=4; texture.colorSpace=index===0?THREE.SRGBColorSpace:THREE.NoColorSpace;texture.needsUpdate=true;return texture
  })
  return [maps[0], maps[1], maps[2]]
}
