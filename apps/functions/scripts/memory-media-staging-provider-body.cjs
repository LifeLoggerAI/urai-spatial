'use strict'
// Shared source-object and control-plane HTTP body limits for the existing
// read-only staging upload-origin collector. No provider/test injection path.
const {Buffer}=require('node:buffer')
const MAX_MEDIA_BYTES=128*1024*1024
const MAX_JSON_BYTES=1024*1024
const bad=code=>{throw Error('STAGING_UPLOAD_ORIGIN_UNVERIFIED:'+code)}

async function readBoundedProviderBody(response, maxBytes){
 if(!response || response.status!==200 || !response.headers || !response.body
    ||typeof response.body.getReader!=='function')bad('PROVIDER_RESPONSE_INVALID')
 if(!Number.isSafeInteger(maxBytes)||maxBytes<1||maxBytes>MAX_MEDIA_BYTES)bad('PROVIDER_LIMIT_INVALID')
 const raw=response.headers.get('content-length')
 let declared=null
 if(raw!==null&&raw!==undefined){
   if(typeof raw!=='string'||!/^[0-9]{1,16}$/.test(raw))bad('PROVIDER_CONTENT_LENGTH_INVALID')
   declared=Number(raw)
   if(!Number.isSafeInteger(declared)||declared>maxBytes)bad('PROVIDER_BODY_TOO_LARGE')
 }
 const reader=response.body.getReader()
 let length=0;const chunks=[]
 try{
   while(true){
     let item
     try {item=await reader.read()}catch{bad('PROVIDER_BODY_READ_FAILED')}
     if(!item||typeof item.done!=='boolean')bad('PROVIDER_BODY_MALFORMED')
     if(item.done)break
     if(!(item.value instanceof Uint8Array))bad('PROVIDER_BODY_MALFORMED')
     length+=item.value.byteLength
     if(length>maxBytes)bad('PROVIDER_BODY_TOO_LARGE')
     chunks.push(Buffer.from(item.value))
   }
 }finally{
   if(reader.releaseLock)reader.releaseLock()
 }
 if(length===0)bad('PROVIDER_BODY_EMPTY')
 if(declared!==null&&length!==declared)bad('PROVIDER_CONTENT_LENGTH_MISMATCH')
 return Buffer.concat(chunks,length)
}
async function readBoundedProviderJson(response){
 const bytes=await readBoundedProviderBody(response,MAX_JSON_BYTES)
 let data
 try{data=JSON.parse(bytes.toString('utf8'))}catch{bad('PROVIDER_RESPONSE_INVALID')}
 if(!data||typeof data!=='object'||Array.isArray(data))bad('PROVIDER_RESPONSE_INVALID')
 return data
}
module.exports={readBoundedProviderBody,readBoundedProviderJson,MAX_JSON_BYTES,MAX_MEDIA_BYTES}
