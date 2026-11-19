#!/usr/bin/env node
// R1535 REVIEW ONLY: reproducible, entirely synthetic public environment.
// Not photogrammetry, recorded life, an AAA+++ Gold Master, or production approval.
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const defaultOutput = resolve(dirname(fileURLToPath(import.meta.url)), '../public/assets/urai/home-production/interpretive/sanctuary-golden-grove-v1.splat')
const output = process.argv[2] ? resolve(process.argv[2]) : defaultOutput
let seed = 1535
const rand = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296)
const between = (min, max) => min + (max - min) * rand()
const clip = (v) => Math.max(0, Math.min(255, Math.round(v)))
const points = []
function varied(rgb, spread = 16) {
  const offset = between(-spread, spread)
  return rgb.map((value) => clip(value + offset + between(-spread / 2, spread / 2)))
}
function splat(x, y, z, scale, rgb, alpha = 210, anis = 1) {
  if (![x,y,z,scale].every(Number.isFinite) || scale <= 0) throw new Error('invalid synthetic point')
  points.push({ x, y, z, scale, rgb, alpha, anis })
}
// Distance scenery is intentionally behind the navigable sanctuary.
// These are algorithmic illustration points, NOT reconstructed real places.
for (let i = 0; i < 17000; i++) {
  const x = between(-112, 112), z = between(-140, -56)
  const ridge = 3 + 13 * Math.sin(x * .018 + z * .011) ** 2 + 5 * Math.cos(x * .045 - z * .03) ** 2
  const y = Math.max(0, 2.3 + ridge * (1 - Math.abs(z + 80) / 105) + between(-.8, .8))
  splat(x, y, z, between(.55, 1.65), varied(y > 17 ? [93,121,118] : z < -96 ? [63,89,91] : [62,103,91], 12), between(145, 218))
}
for (let i = 0; i < 10000; i++) {
  const x = between(-83, 83), z = between(-77, -23)
  const y = .4 + .015*x*x/30 + .5*Math.sin(.11*x+.19*z) + between(-.22,.22)
  const palette = [[71,102,73],[86,112,68],[109,117,73],[69,95,75]]
  splat(x,y,z,between(.30,.85),varied(palette[Math.floor(rand()*palette.length)],21),between(124,205),1.65)
}
for (let tree = 0; tree < 56; tree++) {
  const side = tree % 2 ? -1 : 1, x = side * between(19,82), z = -between(23,92)
  const h = between(6,17), trunk = between(.13,.39)
  for (let i=0;i<155;i++) {
    const t=rand(), angle=between(0,Math.PI*2), r=trunk*(1-.55*t)
    splat(x+r*Math.cos(angle),h*t,z+r*Math.sin(angle),between(.09,.23),varied([91,77,57],18),between(180,248))
  }
  const crown=tree%3 ? [47,94,65] : [81,112,71]
  for (let cluster=0;cluster<10;cluster++) {
    const cx=x+between(-2.5,2.5),cy=h*between(.52,1.04),cz=z+between(-2.5,2.5)
    const rx=between(1.2,3.5),ry=between(1,2.9),rz=between(1.1,3.3)
    for (let i=0;i<63;i++) {
      const a=between(0,2*Math.PI), u=between(-1,1), r=rand()**.55, b=Math.sqrt(1-u*u)
      const px=cx+rx*r*b*Math.cos(a),py=cy+ry*r*u,pz=cz+rz*r*b*Math.sin(a)
      const light=px<0?8:19, color=rand()<.10?[143,139,80]:crown.map(v=>v+light)
      splat(px,py,pz,between(.11,.34),varied(color,21),between(155,240))
    }
  }
}
for(let i=0;i<6900;i++) {
  const x=(i%2?-1:1)*between(11.5,29),z=between(-21,9),y=between(.1,1.2)
  const palette=rand()<.79?[68,117,77]:[[213,160,87],[210,181,132],[186,128,130]][Math.floor(rand()*3)]
  splat(x,y,z,between(.045,.17),varied(palette,24),between(130,240))
}
for(let i=0;i<3200;i++) splat(between(-70,70),between(2,24),between(-100,-25),between(.12,.42),varied([172,172,137],24),between(22,67))
for(let i=0;i<2300;i++) {
  const x=between(-80,80),z=between(-110,-48)
  splat(x,19+5*Math.sin(x*.041+z*.037)+between(-2.3,2.3),z,between(.45,1.3),varied([187,195,178],15),between(35,82))
}
const bytes=Buffer.allocUnsafe(points.length*32)
for(let i=0;i<points.length;i++) {
  const p=points[i], off=i*32
  bytes.writeFloatLE(p.x,off)
  bytes.writeFloatLE(-p.y,off+4)
  bytes.writeFloatLE(-p.z,off+8)
  bytes.writeFloatLE(p.scale*p.anis,off+12)
  bytes.writeFloatLE(p.scale,off+16)
  bytes.writeFloatLE(p.scale,off+20)
  for(let c=0;c<3;c++)bytes[off+24+c]=clip(p.rgb[c])
  bytes[off+27]=clip(p.alpha)
  bytes[off+28]=255;bytes[off+29]=128;bytes[off+30]=128;bytes[off+31]=128
}
mkdirSync(dirname(output),{recursive:true})
writeFileSync(output,bytes)
console.log(JSON.stringify({classification:'SYNTHETIC_PUBLIC_REVIEW_ONLY',path:output,pointCount:points.length,byteSize:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),visualAcceptanceEstablished:false,productionAuthorized:false}))
