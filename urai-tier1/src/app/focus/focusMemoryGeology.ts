import * as THREE from 'three'

// Original URAI geometry and material source. No downloaded imagery or scan UVs.
// Separate broken strata leave actual air between the memory's folded interior.
// V258 keeps the V251 authority but narrows and lowers each stratum so the
// selected memory reads as an inhabitable mineral-light manifestation rather
// than one opaque wall across the Focus chamber.
const STRATA = [
  [-.78, .10, 1.86, .36, -.18, -.16],
  [-.52, -.42, 2.10, .32, -.28, .16],
  [-.20, -.68, 1.74, .28, -.12, .30],
  [.18, -.62, 1.58, .27, .28, .16],
  [.54, -.34, 1.46, .30, .26, -.08],
  [.68, .10, 1.34, .31, .14, -.22],
  [-.42, .40, 1.42, .27, -.32, -.16],
]

export function createFocusStrata() {
  return STRATA.map(([cx, cz, height, width, lean, turn], plate) => {
    const positions: number[] = [], uvs: number[] = [], colors: number[] = [], indices: number[] = []
    const rows = 54, columns = 18
    for (let face = 0; face < 2; face++) for (let row = 0; row <= rows; row++) for (let column = 0; column <= columns; column++) {
      const t = row / rows, s = column / columns, across = s * 2 - 1
      const crown = .09 * Math.sin(s * 14 + plate * 3) + .05 * Math.sin(s * 31 + plate)
      const taper = .76 - .38 * t + .15 * Math.sin(t * 4.7 + plate)
      const root = .24 * Math.exp(-t * 12)
      const grain = .020 * Math.sin(s * 63 + t * 5 + plate) + .014 * Math.sin(s * 147 - t * 13)
      const fracture = .055 * Math.sin(t * 22 + s * 3 + plate) * Math.sin(s * 11 + plate)
      const x = cx + lean * t * t + across * (width * taper + root)
      const y = -1.43 + t * (height + crown) + .025 * Math.sin(s * 19 + t * 32)
      const z = cz + turn * t + .16 * across * across + grain + fracture + (face ? -.075 : .075) * (1 - .45 * t)
      positions.push(x, y, z); uvs.push(s * 1.7, t * 3.2)
      const shade = .72 + .19 * s + .09 * Math.sin(t * 38 + plate)
      const c = new THREE.Color(plate % 3 === 0 ? '#9daa8f' : plate % 3 === 1 ? '#7f9084' : '#687f79').multiplyScalar(shade)
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
    const crack=vein<.09 ? .22*(1-vein/.09):0
    const layer=.5+.5*Math.sin(v*143+Math.sin(u*24)*.7)
    const value=.42+grain*.12+layer*.12-crack
    h[y*size+x]=value
    const i=(y*size+x)*4, tone=145+value*100-crack*180
    rgba.set([tone,tone*.94,tone*.81,255],i)
    rough.set([255,Math.min(255,205+grain*48-layer*14),0,255],i)
  }
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    const dx=(h[y*size+(x+1)%size]-h[y*size+(x+size-1)%size])*2.8
    const dy=(h[((y+1)%size)*size+x]-h[((y+size-1)%size)*size+x])*2.8
    const n=new THREE.Vector3(-dx,-dy,1).normalize()
    normals.set([(n.x*.5+.5)*255,(n.y*.5+.5)*255,(n.z*.5+.5)*255,255],(y*size+x)*4)
  }
  const maps = [rgba,normals,rough].map((data,index)=>{
    const texture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat)
    texture.wrapS=texture.wrapT=THREE.RepeatWrapping; texture.generateMipmaps=true; texture.minFilter=THREE.LinearMipmapLinearFilter; texture.magFilter=THREE.LinearFilter; texture.anisotropy=4; texture.colorSpace=index===0?THREE.SRGBColorSpace:THREE.NoColorSpace;texture.needsUpdate=true;return texture
  })
  return [maps[0], maps[1], maps[2]]
}
