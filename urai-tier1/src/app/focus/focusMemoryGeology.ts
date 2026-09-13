import * as THREE from 'three'

// Canonical selected-memory manifestation geometry.
// The memory is approached from Life Map as a luminous celestial object, but it
// resolves in Focus as an open, fractured memory field rather than a closed rock,
// sphere, cage, spike cluster or flower. Each authored fragment leaves deliberate
// negative space so the selected memory reads as something unfolding, not a boulder.
const MEMORY_FRAGMENTS = [
  [-2.58, .47, .84, -.08, -.02, .08],
  [-1.46, .38, .91, .05, .02, -.04],
  [-.34, .44, .78, -.02, -.04, .11],
  [.82, .36, .88, .07, .01, -.08],
  [1.91, .42, .81, -.05, .04, .03],
] as const

export function createFocusStrata() {
  return MEMORY_FRAGMENTS.map(([centerPhi, halfWidth, baseRadius, offsetX, offsetZ, phase], fragment) => {
    const positions: number[] = [], uvs: number[] = [], colors: number[] = [], indices: number[] = []
    const rows = 34, columns = 22

    for (let row = 0; row <= rows; row++) for (let column = 0; column <= columns; column++) {
      const v = row / rows
      const u = column / columns
      const across = u * 2 - 1
      const middle = Math.sin(v * Math.PI)
      const shoulder = Math.pow(Math.max(0, middle), .72)
      const width = halfWidth * (.30 + shoulder * .70)
      const phi = centerPhi + across * width + .055 * Math.sin(v * 7.1 + fragment)

      // A fragment begins close to the memory core, expands through a broad middle,
      // then curls away again. The open center and large angular gaps are intentional.
      const historyWave = Math.sin(v * 11.8 + across * 5.6 + fragment * 1.91)
      const fineWave = Math.sin(v * 24.2 - across * 12.4 + fragment * .77)
      const asymmetry = .08 * Math.sin(v * Math.PI * 1.65 + fragment * .83 + phase)
      const radial = baseRadius * (.28 + shoulder * .78 + v * .10 + asymmetry)
        + historyWave * .025 + fineWave * .011
      const lateral = across * (.10 + shoulder * .18)
      const curl = .18 * Math.pow(v, 1.7) - .08 * Math.pow(1 - v, 2)

      const x = offsetX + Math.cos(phi) * radial + Math.cos(phi + Math.PI / 2) * lateral
      const z = offsetZ + Math.sin(phi) * radial * .78 + Math.sin(phi + Math.PI / 2) * lateral * .72 - curl
      const y = -1.02 + v * 1.92 + .18 * shoulder + .08 * Math.sin(across * Math.PI + fragment * .9)

      positions.push(x, y, z)
      uvs.push(u * 1.7, v * 1.9)

      const vein = Math.pow(Math.max(0, 1 - Math.abs(historyWave)), 14)
      const hotVein = Math.pow(Math.max(0, 1 - Math.abs(Math.sin(v * 7.4 + across * 4.2 + fragment))), 18)
      const edge = Math.pow(Math.abs(across), 1.6)
      const core = new THREE.Color(fragment % 2 ? '#a9e5e1' : '#d6f2ea')
      const memory = new THREE.Color(fragment % 3 === 0 ? '#ffd19a' : '#8edfff')
      const shadow = new THREE.Color('#254b55')
      const color = shadow.clone().lerp(core, .48 + shoulder * .30).lerp(memory, Math.min(.82, vein * .54 + hotVein * .46))
      color.multiplyScalar(.88 + shoulder * .13 - edge * .10)
      colors.push(color.r, color.g, color.b)
    }

    const stride = columns + 1
    for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
      const a = row * stride + column, b = a + 1, c = a + stride, d = c + 1
      indices.push(a, b, c, b, d, c)
    }

    const result = new THREE.BufferGeometry()
    result.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    result.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    result.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    result.setIndex(indices)
    result.computeVertexNormals()
    result.computeBoundingSphere()
    return result
  })
}

export function createFocusSurfaceMaps(): [THREE.Texture, THREE.Texture, THREE.Texture] {
  const size = 512, h = new Float32Array(size * size), rgba = new Uint8Array(size * size * 4), normals = new Uint8Array(rgba.length), rough = new Uint8Array(rgba.length)
  const hash = (x:number,y:number) => { const v = Math.sin(x*127.1+y*311.7)*43758.5453; return v-Math.floor(v) }
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    const u=x/size,v=y/size, grain=hash(x,y), vein=Math.abs(Math.sin(u*66 + Math.sin(v*15)*1.15 + Math.sin(v*37)*.18))
    const history=vein<.09 ? 1-vein/.09 : 0
    const layer=.5+.5*Math.sin(v*82+Math.sin(u*16)*.46)
    const value=.62+grain*.05+layer*.035
    h[y*size+x]=value-history*.010
    const i=(y*size+x)*4
    const r=Math.min(255,142+value*88+history*92)
    const g=Math.min(255,154+value*92+history*78)
    const b=Math.min(255,160+value*96+history*68)
    rgba.set([r,g,b,255],i)
    rough.set([255,Math.min(255,178+grain*34-layer*10),0,255],i)
  }
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    const dx=(h[y*size+(x+1)%size]-h[y*size+(x+size-1)%size])*1.25
    const dy=(h[((y+1)%size)*size+x]-h[((y+size-1)%size)*size+x])*1.25
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
