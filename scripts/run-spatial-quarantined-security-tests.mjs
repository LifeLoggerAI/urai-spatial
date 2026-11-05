#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const source=path.join(root,'scripts/fixtures/spatial-legacy-tooling');
const supplied=process.env.URAI_LEGACY_TOOLING_FIXTURE;
const fixture=supplied?path.resolve(supplied):fs.mkdtempSync(path.join(os.tmpdir(),'urai-legacy-tooling-quarantine-'));
const sha256=b=>createHash('sha256').update(b).digest('hex');
const provenance=JSON.parse(fs.readFileSync(path.join(source,'vendor-source-manifest.json')));
const upstream=JSON.parse(fs.readFileSync(path.join(root,'patches/spatial-maintained-tooling-provenance.json'))).consumers.find(c=>c.name==='firebase-tools');
assert.equal(sha256(fs.readFileSync(path.join(source,'original-firebase-package.json'))),upstream.originalSourceSha256['package.json']);
assert.equal(provenance.rawAdvisory,'GHSA-vfj7-8cjw-p6xm');assert.equal(provenance.waiver,false);assert.equal(provenance.files.length,22);
const run=(command,args,env)=>{
  const result=spawnSync(command,args,{cwd:root,env:env??process.env,stdio:'inherit',timeout:300000});
  if(result.error||result.signal||result.status!==0)throw Error('Required quarantine verification failed: '+command+' '+args.join(' ')+' '+(result.error?.message??result.signal??result.status));
};
try{
  for(const name of ['package.json','pnpm-lock.yaml']){
    const bytes=fs.readFileSync(path.join(source,name)),target=path.join(fixture,name);
    if(supplied)assert.equal(sha256(fs.readFileSync(target)),sha256(bytes),'Frozen standalone fixture drift: '+name);
    else fs.writeFileSync(target,bytes);
  }
  for(const entry of provenance.files){
    assert.match(entry.path,/^vendor\/(?:braces|chokidar)\/[A-Za-z0-9_./-]+$/);assert.ok(!entry.path.split('/').includes('..'));
    const bytes=fs.readFileSync(path.join(root,entry.path));assert.equal(sha256(bytes),entry.sha256,'Retained licensed source drift: '+entry.path);
    assert.equal(createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex'),entry.gitBlob);
    const target=path.join(fixture,entry.path);
    if(supplied)assert.equal(sha256(fs.readFileSync(target)),entry.sha256);
    else{fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);}
  }
  if(!supplied){
    const args=['pnpm@10.0.0','install','--frozen-lockfile','--ignore-scripts','--dir',fixture];
    if(process.env.URAI_QUARANTINE_STORE)args.push('--store-dir',process.env.URAI_QUARANTINE_STORE);
    run('corepack',args);
  }
  const env={...process.env,URAI_LEGACY_TOOLING_QUARANTINE:'1',URAI_BRACES_CONSUMER_ROOT:fixture,URAI_BRACES_FIREBASE_CLI_PACKAGE:path.join(source,'original-firebase-package.json')};
  const unit=process.argv.includes('--unit');
  if(unit)run(process.execPath,[path.join(root,'scripts/run-pnpm.mjs'),'bootstrap:check'],env);
  run(process.execPath,['--test',...['tests/spatial-maintained-tooling-admission.test.mjs','scripts/test-spatial-dependency-manifest-resolution.mjs','scripts/test-spatial-original-baseline-authority.mjs','tests/retained-braces-source.test.cjs'].map(file=>path.join(root,file)),path.join(root,'tests/braces-tooling-consumers.test.cjs'),...(unit?[]:[path.join(root,'urai-tier1/tests/dependency-security-regressions.test.mjs')])],env);
  if(unit)run(process.execPath,[path.join(root,'scripts/run-pnpm.mjs'),'--filter','urai-tier1','test:unit'],env);
  console.log(JSON.stringify({status:'PASS_QUARANTINED_LEGACY_SOURCE_TESTS',scope:'Explicit standalone nonproduction frozen fixture; active importer security is verified separately',retainedLicensedFiles:22,rawAdvisory:provenance.rawAdvisory,waiver:false,upstreamFixedVersion:null,productionAcceptance:false}));
}finally{if(!supplied)fs.rmSync(fixture,{recursive:true,force:true});}
