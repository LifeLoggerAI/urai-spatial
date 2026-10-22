// Nonproduction scene-to-engineering boundary. No job/permission authority.
const SHA=/^[a-f0-9]{40}$/,ID=/^[A-Za-z0-9._:-]{1,120}$/;
const COMPONENTS=new Set(['home','ascent','life-map','focus','replay']);
const deny=code=>{throw Error('CHALK_SPATIAL_'+code)};
export function chalkIntent(value){
 const s=String(value??'').trim().slice(0,1200).replace(/^chalk[\s,:!-]*/i,'').toLowerCase();
 if(/\b(pause|cancel|stop)\b.*\b(job|task|worker)\b/.test(s))return 'NOT_CONNECTED';
 if(/\b(approval|approve|permission)\b/.test(s))return 'NOT_CONNECTED';
 if(/\b(verified|repair|evidence|fix)\b/.test(s))return 'NOT_CONNECTED';
 if(/\b(choppy|stutter|jitter|lag|broken|wrong|star|diagnos|transition|visual)\b/.test(s))return 'DIAGNOSTIC';
 if(/\b(job|task|running|status|engineering|happening|urai)\b/.test(s))return 'READ_JOBS';
 return 'NOT_CONNECTED';
}
export function chalkDiagnostic({route,component,sourceSha,actorUid,frames=[],star=null,allowStar=false}){
 if(!SHA.test(sourceSha))deny('SOURCE_UNVERIFIED');
 if(typeof actorUid!=='string'||!actorUid||actorUid.includes('/'))deny('ACTOR');
 if(!COMPONENTS.has(component)||!['/','/home','/ascent','/life-map','/focus','/replay'].includes(route))deny('ROUTE');
 if(!Array.isArray(frames)||frames.length>90||frames.some(x=>!Number.isFinite(x)||x<=0||x>5000))deny('FRAMES');
 let selectedStar=null;
 if(allowStar){
   if(!star||star.authorized!==true||star.ownerUid!==actorUid||!ID.test(star.id)||!['/life-map','/focus','/replay'].includes(route))deny('STAR_DENIED');
   selectedStar={id:star.id,classification:'owner-authorized-reference-only'};
 }
 const sorted=[...frames].sort((a,b)=>a-b);
 return Object.freeze({kind:'chalk-spatial-diagnostic-v1',repository:'LifeLoggerAI/urai-spatial',
   sourceSha,component,route,selectedStar,frameSamples:frames.length,
   p95Ms:frames.length?sorted[Math.ceil(sorted.length*.95)-1]:null,
   status:'LOCAL_UNSUBMITTED',authority:'client-observation-not-server-verified'});
}
