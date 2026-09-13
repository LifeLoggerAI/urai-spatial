import * as THREE from 'three'

// Original URAI geometry and material source. No downloaded imagery or scan UVs.
// V261 keeps the V251 Focus authority but lays the selected memory down into a
// low mineral-memory bloom: broad radial shells, real negative space, and
// embedded history veins without spheres, cages, spikes, or upright fins.
const PETALS = [
  [-2.62, 1.02, .64, .34, .10, -.10, -.02],
  [-2.00, 1.16, .72, .42, .16, -.08, -.08],
  [-1.34, 1.08, .68, .38, .12, .02, -.12],
  [-.68, .98, .62, .32, .15, .12, -.04],
  [.04, 1.12, .70, .40, .10, .10, .06],
  [.72, .96, .58, .30, .14, .02, .12],
  [1.48, .90, .54, .28, .09, -.08, .10],
  [2.22, .98, .60, .34, .15, -.12, .04],
]

export function createFocusStrata() {
  return PETALS.map(([angle, length, width, arc, tipRise, offsetX, offsetZ], plate) => {
    const positions: number[] = [], uvs: number[] = [], colors: number[] = [], indices: number[] = []
    const rows = 42, columns = 24
    const radialX = Math.cos(angle), radialZ = Math.sin(angle)
    const lateralX = -radialZ, lateralZ = radialX

    for (let face = 0; face < 2; face++) for (let row = 0; row <= rows; row++) for (let column = 0; column <= columns; column++) {
      const t = row / rows, s = column / columns, across = s * 2 - 1
      const open = Math.pow(Math.sin(Math.PI * Math.min(.999, Math.max(.001, t))), .58)
      const tipTaper = 1 - .46 * Math.pow(t, 2.1)
      const breadth = width * (.14 + .86 * open) * tipTaper
      const lateral = across * breadth
      const radial = .10 + length * t
      const cup = .12 * Math.sin(Math.PI * t) * (1 - across * across)
      const edgeCurl = .055 * across * across * Math.sin(Math.PI * t)
      const sweep = .075 * Math.sin(Math.PI * t + plate * .52)
      const grain = .008 * Math.sin(s * 49 + t * 9 + plate) + .005 * Math.sin(s * 119 - t * 13)
      const veinWave = Math.sin(t * 18 + s * 6 + plate * .65) * Math.sin(s * 10 - t * 2.4 + plate)
      const veinRelief = .010 * veinWave
      const thickness = .024 + .018 * (1 - t)

      const x = offsetX + radialX * (radial + sweep) + lateralX * lateral
      const z = offsetZ + radialZ * (radial + sweep) + lateralZ * lateral + grain
      const y = -1.31 + arc * Math.sin(Math.PI * t) + tipRise * t * t + cup + edgeCurl + veinRelief + (face ? -thickness : thickness)
      positions.push(x, y, z)
      uvs.push(s * 1.45, t * 2.35)

      const vein = Math.pow(Math.max(0, 1 - Math.abs(veinWave)), 12)
      const edgeShade = Math.pow(Math.abs(across), 1.7)
      const base = new THREE.Color(plate % 3 === 0 ? '#8fa9a5' : plate % 3 === 1 ? '#b5b39f' : '#78969a')
      const history = new THREE.Color(plate % 2 ? '#f0cd91' : '#d5eee7')
      const shadow = new THREE.Color('#32494a')
      const c = base.clone().lerp(history, Math.min(.80, vein * .74 + t * .08)).lerp(shadow, edgeShade * .14)
      c.multiplyScalar(.91 + .07 * s)
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
