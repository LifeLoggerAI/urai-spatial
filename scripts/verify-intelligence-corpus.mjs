import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

const corpusPath=path.resolve('operations/intelligence/corpus/v1/cases.json');
const manifestPath=path.resolve('operations/intelligence/release-eval-manifest.json');
const outPath=path.resolve(process.env.URAI_EVAL_RECEIPT || 'artifacts/intelligence-eval/corpus-v1-receipt.json');
const fail=(m)=>{console.error('[intelligence-corpus] FAIL: '+m);process.exitCode=1};
const read=(p)=>{if(!fs.existsSync(p)){fail('missing '+p);return null}try{return JSON.parse(fs.readFileSync(p,'utf8'))}catch(e){fail('invalid JSON '+p+': '+e.message);return null}};
const corpus=read(corpusPath),manifest=read(manifestPath);
if(!corpus||!manifest) process.exit(1);
if(corpus.schemaVersion!==1) fail('schemaVersion must be 1');
if(!/^urai-intelligence-synthetic-v\\d+$/.test(corpus.corpusId||'')) fail('invalid corpusId');
if(corpus.containsPrivateUserData!==false) fail('corpus must declare containsPrivateUserData=false');
if(!Array.isArray(corpus.cases)||corpus.cases.length<14) fail('at least 14 synthetic cases required');
const required=new Set((manifest.families||[]).filter(f=>f.priority==='P0').map(f=>f.id));
const seen=new Set(),covered=new Set();
for(const c of corpus.cases||[]){
 if(!c||typeof c!=='object') {fail('case must be an object');continue}
 if(!/^[a-z0-9-]+$/.test(c.id||'')) fail('invalid case id '+String(c.id));
 if(seen.has(c.id)) fail('duplicate case id '+c.id); seen.add(c.id);
 if(!required.has(c.family)) fail(c.id+' references unknown/non-P0 family '+c.family); else covered.add(c.family);
 if(c.severity!=='P0') fail(c.id+' must be P0 in the release seed corpus');
 if(!Array.isArray(c.syntheticContext)||!c.syntheticContext.length) fail(c.id+' requires syntheticContext');
 for(const item of c.syntheticContext||[]){if(!['user-report','sensor-summary','memory-record','system-state','provider-result'].includes(item.source)||typeof item.content!=='string'||!item.content.trim()) fail(c.id+' has invalid context')}
 if(typeof c.userPrompt!=='string'||!c.userPrompt.trim()) fail(c.id+' requires userPrompt');
 if(!Array.isArray(c.expectedInvariants)||!c.expectedInvariants.length) fail(c.id+' requires expectedInvariants');
 if(!Array.isArray(c.forbiddenOutcomes)||!c.forbiddenOutcomes.length) fail(c.id+' requires forbiddenOutcomes');
}
for(const family of required) if(!covered.has(family)) fail('missing executable seed case for '+family);
const raw=fs.readFileSync(corpusPath); const sha256=crypto.createHash('sha256').update(raw).digest('hex');
if(process.exitCode) process.exit(process.exitCode);
const receipt={schemaVersion:1,status:'BASELINE_STRUCTURE_PASS',releaseClassification:'NO_GO_PENDING_SEMANTIC_EXECUTION',corpusId:corpus.corpusId,corpusSha256:sha256,caseCount:corpus.cases.length,families:[...covered].sort(),containsPrivateUserData:false};
fs.mkdirSync(path.dirname(outPath),{recursive:true});fs.writeFileSync(outPath,JSON.stringify(receipt,null,2)+'\\n');
console.log('[intelligence-corpus] PASS: '+receipt.caseCount+' synthetic seed cases across '+receipt.families.length+' P0 families; semantic certification remains NO-GO.');
