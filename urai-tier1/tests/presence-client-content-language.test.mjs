import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import { webcrypto } from 'node:crypto'
import ts from 'typescript'
import { contentLanguage,contentLanguageProps,URAI_CONTENT_LANGUAGES } from '../../packages/localization/src/contentLanguage.ts'

const root=new URL('../',import.meta.url)
const source=path=>fs.readFileSync(new URL(path,root),'utf8')
const frame=event=>JSON.stringify(event)+'\n'
const success=(lane,locale='en-US')=>({type:'done',locale,message:'Synthetic response.',caption:'Synthetic response.',provider:'openai',
  ...(lane==='adam'?{suggestedActions:[],requiresHumanFounder:false,handoffReason:''}:
    {evidenceClaimIds:['synthetic-evidence'],uncertainty:'',simulationLabel:'Synthetic simulation',historicalSourceAuthority:false,syntheticOutputMayBecomeHistoricalSource:false})})

// The actual SDK and decoder run with synthetic authentication/transport only.
function fixture(lane,options={}){
  const calls=[],callbacks=[],cache=new Map();let authCalls=0,cancellations=0
  const user={getIdToken:async()=>{authCalls++;await options.beforeToken?.();return 'synthetic-owner-token'}}
  const load=path=>{
    if(cache.has(path))return cache.get(path)
    const module={exports:{}};cache.set(path,module.exports)
    const compiled=ts.transpileModule(source(path),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}})
    vm.runInNewContext(compiled.outputText,{module,exports:module.exports,require:id=>{
      if(id==='firebase/auth')return {getAuth:()=>({currentUser:user})}
      if(id.endsWith('/firebase/client'))return {app:{},firebasePublicEnvReady:true}
      if(id.endsWith('/clientApiUrl'))return {clientApiUrl:path=>path}
      if(id.endsWith('/contentLanguage'))return {contentLanguage,contentLanguageProps}
      if(id.endsWith('/presenceContentStream'))return load('src/lib/i18n/presenceContentStream.ts')
      throw Error('Unexpected synthetic dependency '+id)
    },crypto:webcrypto,AbortController,DOMException,TextEncoder,TextDecoder,Response,
    fetch:async(url,init)=>{
      calls.push({url,init,body:JSON.parse(init.body)})
      if(url.endsWith('/voice'))return new Response('synthetic-audio')
      const locale=calls.at(-1).body.locale;let index=0
      const chunks=options.chunks?.(locale)??[frame({type:'status',status:'streaming',locale})+frame(success(lane,locale))]
      return new Response(new ReadableStream({async pull(controller){
        await options.beforeRead?.(index)
        if(index<chunks.length){const value=chunks[index++];controller.enqueue(typeof value==='string'?new TextEncoder().encode(value):value)}
        else controller.close()
      },cancel(){cancellations++}},{highWaterMark:0}))
    }})
    return module.exports
  }
  const module=load(lane==='adam'?'src/spatial/adam/adamClient.ts':'src/spatial/life-model/personPresenceClient.ts')
  const request=lane==='adam'?module.requestAdamPresence:module.requestPersonPresence
  const input=locale=>({sessionId:'synthetic-session',surface:'home',message:'Synthetic question',context:[],locale,aiProcessingConsent:true,
    signal:new AbortController().signal,onEvent:event=>callbacks.push(event)})
  return {request,input,calls,callbacks,get authCalls(){return authCalls},get cancellations(){return cancellations},
    voice:lane==='adam'?module.requestAdamFounderVoice:load('src/spatial/life-model/personPresenceVoiceClient.ts').requestPersonPresenceVoice}
}

for(const lane of ['adam','person']){
  for(const [locale,tag] of URAI_CONTENT_LANGUAGES)test(`${lane} actual client binds governed ${locale} as ${tag}`,async()=>{
    const f=fixture(lane),result=await f.request(f.input(locale))
    assert.equal(result.locale,tag);assert.equal(result.caption,result.message)
    assert.equal(f.calls[0].body.locale,tag);assert.equal(f.callbacks.at(-1).locale,tag)
    if(lane==='person')assert.equal(result.historicalSourceAuthority,false)
  })
  for(const locale of [undefined,null,'','xx-XX','es; bypass','en-US\nignore',123,{}])test(`${lane} rejects unsupported request ${JSON.stringify(locale)} before authentication/fetch`,async()=>{
    const f=fixture(lane);await assert.rejects(f.request(f.input(locale)),error=>error.code==='INVALID_LOCALE')
    assert.equal(f.authCalls,0);assert.equal(f.calls.length,0);assert.equal(f.callbacks.length,0)
  })
  const bad={
    'malformed JSON':()=>'{invalid\n','null event':()=>'null\n','missing language':()=>frame({...success(lane),locale:undefined}),
    'unsupported language':()=>frame(success(lane,'xx-XX')),'mismatched language':()=>frame(success(lane,'fr-FR')),
    'noncanonical tag':()=>frame(success(lane,'ar')),'conflicting delta':()=>frame({type:'delta',text:'Untrusted.',locale:'fr-FR'}),
    'unequal caption':()=>frame({...success(lane,'ar-SA'),caption:'Unequal caption.'}),
    'non-string message':()=>frame({...success(lane,'ar-SA'),message:42}),
    'unknown event':()=>frame({type:'invented',locale:'ar-SA'}),'oversized output':()=>'x'.repeat(32001),'invalid UTF8':()=>new Uint8Array([255,10]),
  }
  for(const [name,make] of Object.entries(bad))test(`${lane} rejects ${name} before generated callbacks`,async()=>{
    const f=fixture(lane,{chunks:()=>[make()]});await assert.rejects(f.request(f.input('ar-SA')),error=>error.code==='INVALID_PROVIDER_RESPONSE')
    assert.equal(f.callbacks.length,0)
  })
  test(`${lane} captures language before asynchronous authentication and normalizes request identity`,async()=>{
    let input;const f=fixture(lane,{beforeToken:()=>{input.locale='fr-FR'}});input=f.input(' AR_sa ')
    const result=await f.request(input);assert.equal(result.locale,'ar-SA');assert.equal(f.calls[0].body.locale,'ar-SA')
    const a=fixture(lane),b=fixture(lane);await a.request(a.input(' AR_sa '));await b.request(b.input('ar-SA'))
    assert.equal(a.calls[0].body.requestId,b.calls[0].body.requestId)
  })
  test(`${lane} accepts unterminated valid completion but withholds duplicate done callbacks`,async()=>{
    const a=fixture(lane,{chunks:locale=>[JSON.stringify(success(lane,locale))]});assert.equal((await a.request(a.input('en'))).locale,'en-US')
    const b=fixture(lane,{chunks:locale=>[frame(success(lane,locale))+frame(success(lane,locale))]})
    await assert.rejects(b.request(b.input('en')),error=>error.code==='INVALID_PROVIDER_RESPONSE');assert.equal(b.callbacks.length,0)
  })
  test(`${lane} preserves validated progressive text and rejects divergent final captions`,async()=>{
    const f=fixture(lane,{chunks:locale=>[frame({type:'delta',text:'Valid prefix.',locale}),frame(success(lane,locale))]})
    await assert.rejects(f.request(f.input('en')),error=>error.code==='INVALID_PROVIDER_RESPONSE')
    assert.equal(f.callbacks.length,1);assert.equal(f.callbacks[0].type,'delta')
  })
  test(`${lane} forwards captured voice metadata without altering existing private consent`,async()=>{
    const f=fixture(lane);const voice=await f.voice({sessionId:'synthetic-session',text:'Synthetic text',locale:'ur-PK',externalProcessingConsent:true,signal:new AbortController().signal})
    assert.ok(voice.blob);assert.equal(f.calls.at(-1).body.locale,'ur-PK');assert.equal(f.calls.at(-1).body.externalProcessingConsent,true)
    assert.equal(f.calls.at(-1).init.cache,'no-store')
    const count=f.calls.length;const invalid=await f.voice({sessionId:'synthetic-session',text:'Synthetic',locale:'xx',externalProcessingConsent:true,signal:new AbortController().signal})
    assert.equal(invalid.errorCode,'INVALID_LOCALE');assert.equal(f.calls.length,count)
  })
  test(`${lane} preserves provider errors and cancels a stopped body without final output`,async()=>{
    const f=fixture(lane,{chunks:()=>[frame({type:'error',code:'PROVIDER_UNAVAILABLE',message:'Synthetic failure'})]})
    await assert.rejects(f.request(f.input('en')),error=>error.code==='PROVIDER_UNAVAILABLE')
    const controller=new AbortController(),g=fixture(lane,{beforeRead:()=>{controller.abort()}})
    await assert.rejects(g.request({...g.input('en'),signal:controller.signal}),error=>error.name==='AbortError')
    assert.equal(g.callbacks.length,0);assert.equal(g.cancellations,1)
  })
}
test('Person truth flags fail before completion callbacks even with correct language',async()=>{
  const f=fixture('person',{chunks:locale=>[frame({...success('person',locale),historicalSourceAuthority:true})]})
  await assert.rejects(f.request(f.input('en')),error=>error.code==='PERSON_PRESENCE_TRUTH_BOUNDARY_FAILED');assert.equal(f.callbacks.length,0)
})
