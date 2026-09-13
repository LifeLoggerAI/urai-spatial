import * as THREE from 'three'

// Original URAI geometry and material source. No downloaded imagery or scan UVs.
// V262 broadens the selected-memory bloom and deepens its layered geology so it
// reads as an authored memory formation at arrival scale instead of a small flower.
const PETALS = [
  [-2.76, 1.42, .82, .40, .14, -.16, -.08],
  [-2.18, 1.56, .90, .48, .20, -.12, -.12],
  [-1.54, 1.44, .84, .44, .16, -.02, -.16],
  [-.88, 1.30, .78, .36, .18, .08, -.06],
  [-.18, 1.50, .88, .46, .14, .14, .04],
  [.52, 1.34, .76, .34, .18, .08, .14],
  [1.24, 1.26, .70, .32, .13, -.02, .16],
  [1.92, 1.38, .78, .38, .19, -.10, .10],
  [2.52, 1.24, .68, .30, .12, -.14, -.02],
]

export function createFocusStrata() {
  return PETALS.map(([angle, length, width, arc, tipRise, offsetX, offsetZ], plate) => {
    const positions: number[] = [], uvs: number[] = [], colors: number[] = [], indices: number[] = []
    const rows = 46, columns = 26
    const radialX = Math.cos(angle), radialZ = Math.sin(angle)
    const lateralX = -radialZ, lateralZ = radialX

    for (let face = 0; face < 2; face++) for (let row = 0; row <= rows; row++) for (let column = 0; column <= columns; column++) {
      const t = row / rows, s = column / columns, across = s * 2 - 1
      const open = Math.pow(Math.sin(Math.PI * Math.min(.999, Math.max(.001, t))), .54)
      const tipTaper = 1 - .38 * Math.pow(t, 2.15)
      const breadth = width * (.12 + .88 * open) * tipTaper
      const lateral = across * breadth
      const radial = .08 + length * t
      const cup = .14 * Math.sin(Math.PI * t) * (1 - across * across)
      const edgeCurl = .072 * across * across * Math.sin(Math.PI * t)
      const sweep = .10 * Math.sin(Math.PI * t + plate * .49)
      const grain = .010 * Math.sin(s * 47 + t * 9 + plate) + .006 * Math.sin(s * 113 - t * 13)
      const veinWave = Math.sin(t * 18 + s * 6 + plate * .65) * Math.sin(s * 10 - t * 2.4 + plate)
      const veinRelief = .013 * veinWave
      const fracture = .018 * Math.sin(t * 31 + plate * 1.9) * (1 - Math.abs(across))
      const thickness = .030 + .020 * (1 - t)

      const x = offsetX + radialX * (radial + sweep) + lateralX * lateral
      const z = offsetZ + radialZ * (radial + sweep) + lateralZ * lateral + grain
      const y = -1.22 + arc * Math.sin(Math.PI * t) + tipRise * t * t + cup + edgeCurl + veinRelief + fracture + (face ? -thickness : thickness)
      positions.push(x, y, z)
      uvs.push(s * 1.55, t * 2.55)

      const vein = Math.pow(Math.max(0, 1 - Math.abs(veinWave)), 12)
      const edgeShade = Math.pow(Math.abs(across), 1.7)
      const base = new THREE.Color(plate % 3 === 0 ? '#88a39f' : plate % 3 === 1 ? '#b7b29d' : '#748f94')
      const history = new THREE.Color(plate % 2 ? '#f1ca8c' : '#d8eee5')
      const shadow = new THREE.Color('#2b4042')
      const c = base.clone().lerp(history, Math.min(.78, vein * .70 + t * .10)).lerp(shadow, edgeShade * .18)
      c.multiplyScalar(.90 + .08 * s)
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
    const u=x/size,v=y/size, grain=hash(x,y), vein=Math.abs(Math.sin(u*66 + Math.sin(v*15)*1.15 + Math.sin(v*37)*.18))
    const history=vein<.09 ? 1-vein/.09 : 0
    const layer=.5+.5*Math.sin(v*82+Math.sin(u*16)*.46)
    const value=.56+grain*.06+layer*.05
    h[y*size+x]=value-history*.016
    const i=(y*size+x)*4
    const r=Math.min(255,128+value*82+history*92)
    const g=Math.min(255,134+value*86+history*74)
    const b=Math.min(255,128+value*84+history*64)
    rgba.set([r,g,b,255],i)
    rough.set([255,Math.min(255,220+grain*26-layer*9),0,255],i)
  }
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    const dx=(h[y*size+(x+1)%size]-h[y*size+(x+size-1)%size])*1.6
    const dy=(h[((y+1)%size)*size+x]-h[((y+size-1)%size)*size+x])*1.6
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
