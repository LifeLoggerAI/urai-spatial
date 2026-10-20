#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {root,resolveConsumers} from './spatial-maintained-tooling.mjs';
const output=process.argv[2];if(!output)throw new Error('Evidence directory required');
const {firebase}=resolveConsumers();const manifest=JSON.parse(fs.readFileSync(path.join(firebase,'package.json')));
const binary=typeof manifest.bin==='string'?manifest.bin:manifest.bin.firebase;
for(const flag of ['--version','--help']){
  const result=spawnSync(process.execPath,[path.join(firebase,binary),flag],{cwd:root,encoding:'utf8',timeout:60000,maxBuffer:1024*1024,env:{...process.env,CI:'true',FIREBASE_CLI_DISABLE_USAGE_REPORTING:'1'}});
  fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,flag.slice(2)+'.log'),(result.stdout??'')+(result.stderr??''));
  if(result.error||result.status!==0)throw new Error('Actual offline Firebase CLI '+flag+' failed: '+(result.error?.message??result.status));
  if(flag==='--version'&&!result.stdout.trim().split('\n').some(line=>line.trim()==='15.32.1'))throw new Error('Unexpected actual CLI version');
  if(flag==='--help'&&!/Usage:|Commands:/i.test(result.stdout))throw new Error('Actual CLI help missing');
}
console.log(JSON.stringify({status:'PASS_OFFLINE_NATIVE_CLI',version:'15.32.1',providerAcceptance:false,productionAcceptance:false}));
