import * as THREE from 'three'

// Original URAI geometry and material source. No downloaded imagery or scan UVs.
// V260 keeps the V251 Focus authority but changes the selected-memory silhouette
// from narrow fins into a low asymmetric mineral-memory bloom: broad curved
// leaves, real negative space, and embedded history veins without spheres/cages.
const PETALS = [
  [-.62, -.02, .90, .50, -.56, -.18],
  [-.42, -.24, 1.04, .56, -.38, .20],
  [-.18, -.34, 1.12, .60, -.14, .34],
  [.10, -.36, 1.02, .58, .18, .30],
  [.36, -.25, .94, .52, .42, .18],
  [.58, -.02, .82, .46, .54, -.12],
  [-.28, .20, .78, .42, -.30, -.22],
  [.24, .18, .74, .40, .34, .18],
]

export function createFocusStrata() {
  return PETALS.map(([cx, cz, height, width, lean, turn], plate) => {
    const positions: number[] = [], uvs: number[] = [], colors: number[] = [], indices: number[] = []
    const rows = 48, columns = 22
    const angle = -0.34 + plate * 0.095
    const tangentX = Math.cos(angle), tangentZ = Math.sin(angle)
    const normalX = -tangentZ, normalZ = tangentX

    for (let face = 0; face < 2; face++) for (let row = 0; row <= rows; row++) for (let column = 0; column <= columns; column++) {
      const t = row / rows, s = column / columns, across = s * 2 - 1
      const shoulder = Math.pow(Math.sin(Math.PI * Math.min(.999, Math.max(.001, t))), .52)
      const tipTaper = 1 - .54 * Math.pow(t, 2.25)
      const breadth = width * shoulder * tipTaper
      const cup = .20 * Math.sin(Math.PI * t) + .05 * Math.sin(t * Math.PI * 2 + plate)
      const sweep = lean * (.18 + .82 * t * t)
      const twist = turn * t + .05 * Math.sin(t * Math.PI)
      const grain = .010 * Math.sin(s * 51 + t * 7 + plate) + .006 * Math.sin(s * 121 - t * 11)
      const veinWave = Math.sin(t * 20 + s * 5 + plate * .7) * Math.sin(s * 11 - t * 2 + plate)
      const veinRelief = .014 * veinWave
      const lateral = across * breadth
      const centerX = cx + sweep * tangentX
      const centerZ = cz + sweep * tangentZ
      const x = centerX + lateral * normalX + (cup + veinRelief) * tangentX * .16
      const y = -1.38 + t * height + .035 * Math.sin(Math.PI * t) + .012 * Math.sin(s * 13 + t * 23)
      const z = centerZ + lateral * normalZ + twist + cup * .26 + grain + (face ? -.032 : .032) * (1 - .28 * t)
      positions.push(x, y, z); uvs.push(s * 1.55, t * 2.7)

      const vein = Math.pow(Math.max(0, 1 - Math.abs(veinWave)), 12)
      const edgeFade = Math.pow(Math.abs(across), 1.8)
      const base = new THREE.Color(plate % 3 === 0 ? '#86b8aa' : plate % 3 === 1 ? '#a5c4ab' : '#7eaaa4')
      const history = new THREE.Color(plate % 2 ? '#ead7a9' : '#caece0')
      const shadow = new THREE.Color('#365c57')
      const c = base.clone().lerp(history, Math.min(.72, vein * .66 + t * .10)).lerp(shadow, edgeFade * .18)
      c.multiplyScalar(.88 + .08 * s)
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
    result.setAttribute('position',new THREE.Float32BufferAttribute(positions,3))
    result.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2))
    result.setAttribute('color',new THREE.Float32BufferAttribute(colors,3))
    result.setIndex(indices)
    result.computeVertexNormals()
    result.computeBoundingSphere()
    return result
  })
}

export function createFocusSurfaceMaps(): [THREE.Texture, THREE.Texture, THREE.Texture] {
  const size = 512, h = new Float32Array(size * size), rgba = new Uint8Array(size*size*4), normals = new Uint8Array(rgba.length), rough = new Uint8Array(rgba.length)
  const hash = (x:number,y:number) => { const v = Math.sin(x*127.1+y*311.7)*43758.5453; return v-Math.floor(v) }
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    const u=x/size,v=y/size, grain=hash(x,y), vein=Math.abs(Math.sin(u*72 + Math.sin(v*17)*1.2 + Math.sin(v*39)*.20))
    const history=vein<.085 ? 1-vein/.085 : 0
    const layer=.5+.5*Math.sin(v*96+Math.sin(u*18)*.5)
    const value=.54+grain*.07+layer*.06
    h[y*size+x]=value-history*.018
    const i=(y*size+x)*4
    const r=Math.min(255,112+value*82+history*86)
    const g=Math.min(255,144+value*96+history*78)
    const b=Math.min(255,132+value*90+history*58)
    rgba.set([r,g,b,255],i)
    rough.set([255,Math.min(255,224+grain*24-layer*10),0,255],i)
  }
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    const dx=(h[y*size+(x+1)%size]-h[y*size+(x+size-1)%size])*1.7
    const dy=(h[((y+1)%size)*size+x]-h[((y+size-1)%size)*size+x])*1.7
    const n=new THREE.Vector3(-dx,-dy,1).normalize()
    normals.set([(n.x*.5+.5)*255,(n.y*.5+.5)*255,(n.z*.5+.5)*255,255],(y*size+x)*4)
  }
  const maps = [rgba,normals,rough].map((data,index)=>{
    const texture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat)
    texture.wrapS=texture.wrapT=THREE.RepeatWrapping
    texture.generateMipmaps=true
    texture.minFilter=THREE.LinearMipmapLinearFilter
    texture.magFilter=THREE.LinearFilter
    texture.anisotropy=4
    texture.colorSpace=index===0?THREE.SRGBColorSpace:THREE.NoColorSpace
    texture.needsUpdate=true
    return texture
  })
  return [maps[0], maps[1], maps[2]]
}
