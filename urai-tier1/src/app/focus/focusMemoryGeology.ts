import * as THREE from 'three'

// Canonical selected-memory threshold. Focus is not a ring, cage, rock, flower,
// ribbon or portal prop: it is the selected stellar memory resolving into a
// sparse field of light around a large open center that Replay can be entered through.
const MEMORY_THRESHOLD_POINTS = [
  [-1.34, .76, -.06], [-.92, 1.12, .02], [-.38, 1.30, -.03], [.26, 1.24, .03], [.82, 1.02, -.04], [1.24, .58, .02],
  [1.42, .06, -.03], [1.25, -.48, .03], [.78, -.90, -.04], [.24, -1.08, .02], [-.40, -1.04, -.03], [-.96, -.78, .03], [-1.32, -.30, -.04],
] as const

export function createFocusStrata() {
  return MEMORY_THRESHOLD_POINTS.map(([cx, cy, cz], fragment) => {
    const count = 18
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const warm = new THREE.Color('#fff4dc')
    const cool = new THREE.Color(fragment % 3 === 0 ? '#a9dcff' : '#d8efff')
    for (let i = 0; i < count; i += 1) {
      const angle = i * 2.39996323 + fragment * .73
      const radius = .035 + Math.sqrt((i + .5) / count) * (.16 + (fragment % 4) * .014)
      const depth = (Math.sin(i * 1.71 + fragment) * .5 + .5) * .10
      positions.set([cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius * .72, cz + depth], i * 3)
      const color = cool.clone().lerp(warm, .24 + ((i + fragment) % 5) * .09)
      colors.set([color.r, color.g, color.b], i * 3)
    }
    const result = new THREE.BufferGeometry()
    result.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    result.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    result.computeBoundingSphere()
    return result
  })
}

export function createFocusSurfaceMaps(): [THREE.Texture, THREE.Texture, THREE.Texture] {
  const size = 512, h = new Float32Array(size * size), rgba = new Uint8Array(size * size * 4), normals = new Uint8Array(rgba.length), rough = new Uint8Array(rgba.length)
  const hash = (x:number,y:number) => { const v = Math.sin(x*127.1+y*311.7)*43758.5453; return v-Math.floor(v) }
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    const u=x/size,v=y/size, grain=hash(x,y), vein=Math.abs(Math.sin(u*72 + Math.sin(v*17)*1.32 + Math.sin(v*39)*.22))
    const history=vein<.085 ? 1-vein/.085 : 0
    const layer=.5+.5*Math.sin(v*91+Math.sin(u*18)*.52)
    const value=.50+grain*.05+layer*.028
    h[y*size+x]=value-history*.012
    const i=(y*size+x)*4
    const r=Math.min(255,66+value*92+history*142)
    const g=Math.min(255,88+value*112+history*132)
    const b=Math.min(255,96+value*126+history*112)
    rgba.set([r,g,b,255],i)
    rough.set([255,Math.min(255,188+grain*30-layer*12),0,255],i)
  }
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    const dx=(h[y*size+(x+1)%size]-h[y*size+(x+size-1)%size])*1.35
    const dy=(h[((y+1)%size)*size+x]-h[((y+size-1)%size)*size+x])*1.35
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
