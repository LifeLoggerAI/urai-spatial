import test from 'node:test'
import assert from 'node:assert/strict'
import {deflateSync} from 'node:zlib'
import {decodeChromiumPng,compareChromiumPngRegion} from './digital-human-png-comparison.mjs'
function png(width,height,rgbs){
 const chunks=[]
 function pack(type,data){
  const name=Buffer.from(type),out=Buffer.alloc(12+data.length);out.writeUInt32BE(data.length,0)
  name.copy(out,4);data.copy(out,8)
  let crc=0xffffffff
  for(let i=4;i<8+data.length;i++){crc^=out[i];for(let b=0;b<8;b++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}
  out.writeUInt32BE((crc^0xffffffff)>>>0,8+data.length);return out
 }
 const header=Buffer.alloc(13);header.writeUInt32BE(width,0);header.writeUInt32BE(height,4);header[8]=8;header[9]=2
 const scan=Buffer.alloc(height*(width*3+1))
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)for(let channel=0;channel<3;channel++)
  scan[y*(width*3+1)+1+x*3+channel]=rgbs[(y*width+x)*3+channel]
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),pack('IHDR',header),pack('IDAT',deflateSync(scan)),pack('IEND',Buffer.alloc(0))])
}
test('decodes exact Chromium 8-bit RGB PNG framing',()=>{
 const a=Buffer.alloc(64*64*3,55),p=png(64,64,a)
 const d=decodeChromiumPng(p);assert.equal(d.width,64);assert.equal(d.height,64);assert.equal(d.bpp,3)
 assert.equal(d.pixels[0],55)
})
test('measures real screenshot pixel changes inside anchored ellipse without browser-side decoding',()=>{
 const baseline=Buffer.alloc(64*64*3,45),changed=Buffer.from(baseline)
 for(let y=25;y<37;y++)for(let x=25;x<37;x++){const i=(y*64+x)*3;changed[i]=200;changed[i+1]=150}
 const face={cx:31,cy:31,rx:21,ry:21}
 const diff=compareChromiumPngRegion(png(64,64,baseline),png(64,64,changed),face)
 assert.ok(diff.changed>100);assert.ok(diff.meanRgbDelta>1)
 const frozen=compareChromiumPngRegion(png(64,64,baseline),png(64,64,baseline),face)
 assert.equal(frozen.changed,0);assert.equal(frozen.meanRgbDelta,0)
})
test('denies malformed PNG instead of fabricating evidence',()=>assert.throws(()=>decodeChromiumPng(Buffer.from('NOTPNG')),/invalid-browser-png-magic/))
