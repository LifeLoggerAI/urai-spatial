import * as THREE from 'three'

// Original URAI geometry and material source. No downloaded imagery or scan UVs.
// Separate broken strata leave actual air between the memory's folded interior.
const STRATA = [
  [-1.04, .10, 2.88, .64, -.22, -.22],
  [-.70, -.36, 3.46, .55, -.46, .18],
  [-.28, -.64, 3.02, .50, -.16, .38],
  [.28, -.58, 2.40, .48, .44, .19],
  [.78, -.24, 2.06, .56, .42, -.10],
  [.96, .32, 1.58, .59, .22, -.32],
  [-.58, .48, 1.76, .48, -.55, -.23],
]

export function createFocusStrata() {
  return STRATA.map(([cx, cz, height, width, lean, turn], plate) => {
    const positions: number[] = [], uvs: number[] = [], colors: number[] = [], indices: number[] = []
    const rows = 54, columns = 18
    for (let face = 0; face < 2; face++) for (let row = 0; row <= rows; row++) for (let column = 0; column <= columns; column++) {
      const t = row / rows, s = column / columns, across = s * 2 - 1
      const crown = .12 * Math.sin(s * 14 + plate * 3) + .07 * Math.sin(s * 31 + plate)
      const taper = .86 - .31 * t + .20 * Math.sin(t * 4.7 + plate)
      const root = .38 * Math.exp(-t * 12)
      const grain = .024 * Math.sin(s * 63 + t * 5 + plate) + .017 * Math.sin(s * 147 - t * 13)
      const fracture = .07 * Math.sin(t * 22 + s * 3 + plate) * Math.sin(s * 11 + plate)
      const x = cx + lean * t * t + across * (width * taper + root)
      const y = -1.47 + t * (height + crown) + .03 * Math.sin(s * 19 + t * 32)
      const z = cz + turn * t + .22 * across * across + grain + fracture + (face ? -.12 : .12) * (1 - .45 * t)
      positions.push(x, y, z); uvs.push(s * 1.7, t * 3.2)
      const shade = .68 + .23 * s + .09 * Math.sin(t * 38 + plate)
      const c = new THREE.Color(plate % 3 === 0 ? '#c4b698' : plate % 3 === 1 ? '#a99f86' : '#807e68').multiplyScalar(shade)
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
