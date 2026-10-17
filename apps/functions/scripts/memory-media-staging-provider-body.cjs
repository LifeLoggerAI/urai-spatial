'use strict'
// Read-only HTTP integrity limits for Google control plane and stored ZIP bytes.
// Never accept automatically decompressed/transcoded bytes as original GCS data.
const {Buffer}=require('node:buffer')
const MAX_MEDIA_BYTES=128*1024*1024
const MAX_JSON_BYTES=1024*1024
const bad=code=>{throw Error('STAGING_UPLOAD_ORIGIN_UNVERIFIED:'+code)}

function getHeader(headers,name){
 try{return headers.get(name)}catch{bad('PROVIDER_RESPONSE_INVALID')}
}
function requireIdentityContentEncoding(headers){
 // Node fetch transparently decompresses gzip/br/deflate while it can expose
 // the original Content-Length. GCS may also decompressively transcode an
 // object and omit both regular encoding and length headers. The GCS stored
 // encoding header remains authoritative to reject this ambiguous case.
 for(const name of ['content-encoding','x-goog-stored-content-encoding']){
  const value=getHeader(headers,name)
  if(value!==null&&value!==undefined&&
     (typeof value!=='string'||value.trim().toLowerCase()!=='identity'))
   bad('PROVIDER_CONTENT_ENCODING_UNSAFE')
 }
}
function parseDeclaredSize(headers,name,maxBytes){
 const raw=getHeader(headers,name)
 if(raw===null||raw===undefined)return null
 if(typeof raw!=='string'||!/^[0-9]{1,16}$/.test(raw))bad('PROVIDER_CONTENT_LENGTH_INVALID')
 const declared=Number(raw)
 if(!Number.isSafeInteger(declared))bad('PROVIDER_CONTENT_LENGTH_INVALID')
 if(declared>maxBytes)bad('PROVIDER_BODY_TOO_LARGE')
 return declared
}
async function readBoundedProviderBody(response,maxBytes){
 if(!response||response.status!==200||!response.headers||!response.body
   ||typeof response.headers.get!=='function'||typeof response.body.getReader!=='function')
  bad('PROVIDER_RESPONSE_INVALID')
 if(!Number.isSafeInteger(maxBytes)||maxBytes<1||maxBytes>MAX_MEDIA_BYTES)bad('PROVIDER_LIMIT_INVALID')
 requireIdentityContentEncoding(response.headers)
 if(getHeader(response.headers,'content-range')!==null)bad('PROVIDER_RESPONSE_INVALID')
 const declared=parseDeclaredSize(response.headers,'content-length',maxBytes)
 const stored=parseDeclaredSize(response.headers,'x-goog-stored-content-length',maxBytes)
 if(declared!==null&&stored!==null&&declared!==stored)bad('PROVIDER_CONTENT_LENGTH_MISMATCH')
 const reader=response.body.getReader()
 let length=0;const chunks=[];let completed=false
 try{
  while(true){
   let item
   try{item=await reader.read()}catch{bad('PROVIDER_BODY_READ_FAILED')}
   if(!item||typeof item.done!=='boolean')bad('PROVIDER_BODY_MALFORMED')
   if(item.done){completed=true;break}
   if(!(item.value instanceof Uint8Array))bad('PROVIDER_BODY_MALFORMED')
   length+=item.value.byteLength
   if(length>maxBytes)bad('PROVIDER_BODY_TOO_LARGE')
   chunks.push(Buffer.from(item.value))
  }
 }finally{
  if(!completed&&typeof reader.cancel==='function'){
   try{await reader.cancel()}catch{/* no acceptance based on cancel result */}
  }
  if(typeof reader.releaseLock==='function')reader.releaseLock()
 }
 if(length===0)bad('PROVIDER_BODY_EMPTY')
 if((declared!==null&&length!==declared)||(stored!==null&&length!==stored))
  bad('PROVIDER_CONTENT_LENGTH_MISMATCH')
 return Buffer.concat(chunks,length)
}
async function readBoundedProviderJson(response){
 const bytes=await readBoundedProviderBody(response,MAX_JSON_BYTES)
 let data
 try{data=JSON.parse(bytes.toString('utf8'))}catch{bad('PROVIDER_RESPONSE_INVALID')}
 if(!data||typeof data!=='object'||Array.isArray(data))bad('PROVIDER_RESPONSE_INVALID')
 return data
}
module.exports={readBoundedProviderBody,readBoundedProviderJson,MAX_JSON_BYTES,MAX_MEDIA_BYTES,requireIdentityContentEncoding}
