import * as admin from 'firebase-admin'
import { defineSecret } from 'firebase-functions/params'
import { onRequest } from 'firebase-functions/v2/https'

if (!admin.apps.length) admin.initializeApp()

const db=admin.firestore()
const ELEVENLABS_API_KEY=defineSecret('ELEVENLABS_API_KEY')
const REGION='us-central1'
const WEB_CLIENT_ORIGINS=['https://urai.app','https://www.urai.app',/^https:\/\/localhost(?::\d+)?$/]

type JsonMap=Record<string,unknown>

class VoiceError extends Error{
  constructor(readonly status:number,readonly code:string,message:string){super(message);this.name='VoiceError'}
}
function isRecord(value:unknown):value is JsonMap{return Boolean(value)&&typeof value==='object'&&!Array.isArray(value)}
function bearer(value:unknown){const h=Array.isArray(value)?value[0]:String(value??'');if(!h.startsWith('Bearer '))throw new VoiceError(401,'UNAUTHORIZED','Authentication is required.');return h.slice(7).trim()}
async function uidFrom(request:{headers:Record<string,unknown>}){const decoded=await admin.auth().verifyIdToken(bearer(request.headers.authorization),true);if(!decoded.uid)throw new VoiceError(401,'UNAUTHORIZED','Authentication is required.');return decoded.uid}
function readBody(request:{body?:unknown}){if(!isRecord(request.body))throw new VoiceError(400,'INVALID_BODY','Request body must be JSON.');if(Buffer.byteLength(JSON.stringify(request.body),'utf8')>16_384)throw new VoiceError(413,'REQUEST_TOO_LARGE','Request is too large.');return request.body}
async function requireConsent(uid:string,explicit:boolean){
  if(!explicit)throw new VoiceError(403,'EXPLICIT_CONSENT_REQUIRED','External voice processing consent is required.')
  const [policy,provider]=await Promise.all([db.doc(`users/${uid}/privacyPolicy/current`).get(),db.doc(`users/${uid}/providerConnections/elevenlabs`).get()])
  if(!policy.exists)throw new VoiceError(403,'CONSENT_POLICY_REQUIRED','A saved privacy policy is required.')
  const p=policy.data()??{},domains=isRecord(p.domains)?p.domains:{},models=isRecord(domains.models)?domains.models:{},identity=isRecord(domains.identity)?domains.identity:{},enforcement=isRecord(p.enforcement)?p.enforcement:{}
  if(!['granted','limited'].includes(String(models.mode??''))||models.modelContext!==true)throw new VoiceError(403,'MODEL_PROCESSING_NOT_AUTHORIZED','Model processing is not authorized.')
  if(!['granted','limited'].includes(String(identity.mode??''))||identity.likenessEnabled!==true)throw new VoiceError(403,'VOICE_LIKENESS_NOT_AUTHORIZED','Voice likeness is not authorized.')
  if(enforcement.state!=='fully-enforced')throw new VoiceError(409,'CONSENT_ENFORCEMENT_PENDING','Privacy changes are still being enforced.')
  if(provider.exists){
    const d=provider.data()??{},state=String(d.revocationState??'not-required')
    if(d.processingAllowed!==true||['requested','pending','complete'].includes(state))throw new VoiceError(403,'PROVIDER_PROCESSING_REVOKED','Voice provider processing is not authorized.')
  }
}

export const personPresenceVoiceProvider=onRequest({
  region:REGION,timeoutSeconds:30,memory:'256MiB',cors:WEB_CLIENT_ORIGINS,secrets:[ELEVENLABS_API_KEY],
},async(request,response)=>{
  try{
    if(process.env.PERSON_PRESENCE_VOICE_ENABLED!=='true')throw new VoiceError(503,'PERSON_PRESENCE_VOICE_DISABLED','Person voice is not enabled.')
    if(request.method!=='POST')throw new VoiceError(405,'METHOD_NOT_ALLOWED','POST is required.')
    const uid=await uidFrom(request)
    const body=readBody(request)
    const sessionId=String(body.sessionId??'').trim()
    const text=String(body.text??'').trim()
    if(!/^presence:[A-Za-z0-9-]{16,80}$/.test(sessionId))throw new VoiceError(400,'INVALID_SESSION','Presence session is invalid.')
    if(!text||text.length>900)throw new VoiceError(413,'AUDIO_TOO_LONG','Voice request exceeds the configured limit.')
    await requireConsent(uid,body.externalProcessingConsent===true)

    const session=await db.doc(`users/${uid}/simulationSessions/${sessionId}`).get()
    if(!session.exists||session.get('ownerId')!==uid||session.get('state')!=='active'||session.get('historicalSourceAuthority')!==false){
      throw new VoiceError(409,'PRESENCE_SESSION_UNAVAILABLE','Person presence session is unavailable.')
    }
    const bundleId=String(session.get('bundleId')??'')
    const personId=String(session.get('personId')??'')
    const [bundle,binding]=await Promise.all([
      db.doc(`users/${uid}/personModelBundles/${bundleId}`).get(),
      db.doc(`users/${uid}/personRenderBindings/${bundleId}:voice`).get(),
    ])
    if(!bundle.exists||bundle.get('ownerId')!==uid||bundle.get('state')!=='current'||bundle.get('synthetic')!==false){
      throw new VoiceError(409,'PERSON_MODEL_STALE','Person model must be recompiled.')
    }
    if(
      !binding.exists
      ||binding.get('ownerId')!==uid
      ||binding.get('personId')!==personId
      ||binding.get('bundleId')!==bundleId
      ||binding.get('modality')!=='voice'
      ||binding.get('provider')!=='elevenlabs'
      ||binding.get('reviewState')!=='ACCEPTED'
      ||binding.get('consentState')!=='authorized'
      ||binding.get('state')!=='current'
    )throw new VoiceError(409,'ACCEPTED_PERSON_VOICE_NOT_READY','No accepted private voice is bound to this person state.')

    const voiceId=String(binding.get('providerResourceId')??'')
    if(!/^[A-Za-z0-9_-]{1,64}$/.test(voiceId))throw new VoiceError(409,'PERSON_VOICE_BINDING_INVALID','Accepted voice binding is invalid.')
    const modelId=String(binding.get('providerModelId')??process.env.ELEVENLABS_MODEL_ID??'eleven_multilingual_v2').slice(0,100)
    const endpoint=new URL(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/stream`)
    endpoint.searchParams.set('output_format',process.env.ELEVENLABS_OUTPUT_FORMAT||'mp3_44100_128')
    if(process.env.ELEVENLABS_ZERO_RETENTION==='true')endpoint.searchParams.set('enable_logging','false')
    const controller=new AbortController()
    const timeout=setTimeout(()=>controller.abort(),15_000)
    response.on('close',()=>{if(!response.writableEnded)controller.abort()})
    const upstream=await fetch(endpoint,{
      method:'POST',
      headers:{'xi-api-key':ELEVENLABS_API_KEY.value(),'Content-Type':'application/json',Accept:'audio/mpeg'},
      body:JSON.stringify({text,model_id:modelId,voice_settings:{stability:0.68,similarity_boost:0.84,style:0.12,use_speaker_boost:true}}),
      signal:controller.signal,
    }).finally(()=>clearTimeout(timeout))
    if(!upstream.ok||!upstream.body)throw new VoiceError(upstream.status===429?429:503,'ELEVENLABS_REQUEST_FAILED','Accepted person voice is unavailable.')
    response.status(200)
    response.setHeader('Content-Type',upstream.headers.get('content-type')||'audio/mpeg')
    response.setHeader('Cache-Control','private, no-store, max-age=0')
    response.setHeader('X-Content-Type-Options','nosniff')
    response.setHeader('X-URAI-Provider','elevenlabs')
    response.setHeader('X-URAI-Presence','accepted-private-person-voice')
    const reader=upstream.body.getReader()
    while(true){const {value,done}=await reader.read();if(done)break;response.write(Buffer.from(value))}
    response.end()
  }catch(error){
    const e=error instanceof VoiceError?error:new VoiceError(500,'PERSON_VOICE_FAILURE','Person voice is temporarily unavailable.')
    if(!response.headersSent)response.status(e.status).json({error:e.code,message:e.message})
    else response.end()
  }
})
