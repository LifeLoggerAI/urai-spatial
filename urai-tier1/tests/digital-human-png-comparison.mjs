import {inflateSync} from 'node:zlib'
const PNG_MAGIC=Buffer.from([137,80,78,71,13,10,26,10])
export function decodeChromiumPng(bytes){
 const file=Buffer.from(bytes)
 if(file.length<44||!file.subarray(0,8).equals(PNG_MAGIC))throw Error('invalid-browser-png-magic')
 let offset=8,width=0,height=0,depth=0,type=-1,interlace=-1
 const idats=[];let hasIHDR=false
 while(offset+12<=file.length){
  const size=file.readUInt32BE(offset),tag=file.toString('ascii',offset+4,offset+8)
  if(size>file.length-offset-12)throw Error('truncated-browser-png-chunk')
  const payload=file.subarray(offset+8,offset+8+size)
  if(tag==='IHDR'){
   if(hasIHDR||size!==13)throw Error('invalid-browser-png-header')
   hasIHDR=true;width=payload.readUInt32BE(0);height=payload.readUInt32BE(4)
   depth=payload[8];type=payload[9];interlace=payload[12]
  }else if(tag==='IDAT')idats.push(payload)
  else if(tag==='IEND')break
  offset+=size+12
 }
 if(!hasIHDR||!idats.length||width<=0||height<=0||width>12000||height>12000||depth!==8||![2,6].includes(type)||interlace!==0)
  throw Error('unsupported-browser-png:'+width+'x'+height+':bit='+depth+':type='+type+':interlace='+interlace)
 const bpp=type===2?3:4,stride=width*bpp
 const raw=inflateSync(Buffer.concat(idats));if(raw.length!==height*(stride+1))throw Error('invalid-browser-png-scanline-length')
 const pixels=Buffer.alloc(stride*height);let src=0
 for(let y=0;y<height;y++){
  const filter=raw[src++],start=y*stride,prev=start-stride
  if(filter>4)throw Error('unsupported-browser-png-filter')
  for(let i=0;i<stride;i++){
   const a=i>=bpp?pixels[start+i-bpp]:0,b=y?pixels[prev+i]:0,c=(y&&i>=bpp)?pixels[prev+i-bpp]:0
   let pred=0
   if(filter===1)pred=a
   if(filter===2)pred=b
   if(filter===3)pred=(a+b)>>>1
   if(filter===4){const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);pred=pa<=pb&&pa<=pc?a:pb<=pc?b:c}
   pixels[start+i]=(raw[src++]+pred)&255
  }
 }
 return {width,height,bpp,pixels}
}
export function compareChromiumPngRegion(beforePng,afterPng,region){
 const before=decodeChromiumPng(beforePng),after=decodeChromiumPng(afterPng)
 if(before.width!==after.width||before.height!==after.height)throw Error('screenshot-size-mismatch')
 const {cx,cy,rx,ry}=region
 if(![cx,cy,rx,ry].every(Number.isFinite)||rx<=0||ry<=0)throw Error('invalid-face-geometry-roi')
 const left=Math.max(0,Math.floor(cx-rx)),right=Math.min(before.width,Math.ceil(cx+rx))
 const top=Math.max(0,Math.floor(cy-ry)),bottom=Math.min(before.height,Math.ceil(cy+ry))
 if(right-left<28||bottom-top<28)throw Error('face-roi-not-visible')
 let delta=0,changed=0,checked=0
 for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){
  const dx=(x-cx)/rx,dy=(y-cy)/ry;if(dx*dx+dy*dy>1)continue
  const i=y*before.width+x,pi=i*before.bpp,qi=i*after.bpp
  const d=Math.abs(before.pixels[pi]-after.pixels[qi])+Math.abs(before.pixels[pi+1]-after.pixels[qi+1])+Math.abs(before.pixels[pi+2]-after.pixels[qi+2])
  delta+=d;checked++;if(d>42)changed++
 }
 return {changed,checked,meanRgbDelta:checked?delta/checked:0,roi:{left,top,right,bottom}}
}
