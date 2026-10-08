#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {setTimeout as delay} from 'node:timers/promises';
import test from 'node:test';
import {root,sha256,resolveConsumers,verifyConsumerSource} from './spatial-maintained-tooling.mjs';

const [baselineRoot,baselineManifest,sourceOnlyRoot]=process.argv.slice(2);
if(!baselineRoot||!baselineManifest)throw new Error('Usage: node scripts/test-spatial-maintained-consumers.mjs ORIGINAL_UNPACK_ROOT BASELINE_PACKAGE_JSON [SOURCE_ONLY_PROBE_ROOT]');
const baselineRequire=createRequire(path.resolve(baselineManifest));
const consumers=sourceOnlyRoot?{firebase:path.join(sourceOnlyRoot,'firebase'),next:path.join(sourceOnlyRoot,'next'),eslint:baselineRequire('eslint')}:resolveConsumers();
const provenance=verifyConsumerSource(consumers);
for(const c of provenance.consumers){const dir=path.join(baselineRoot,c.name==='firebase-tools'?'firebase':'next');for(const [file,hash]of Object.entries(c.originalSourceSha256))assert.equal(sha256(fs.readFileSync(path.join(dir,file))),hash,'Original public package drift: '+file);}
const candidateRequire=sourceOnlyRoot?baselineRequire:createRequire(path.join(consumers.firebase,'package.json'));
const candidateChokidar=sourceOnlyRoot?candidateRequire('chokidar-candidate'):candidateRequire('chokidar');
const baselineChokidar=baselineRequire(sourceOnlyRoot?'chokidar-original':'chokidar');
const candidateAnymatch=candidateRequire('anymatch');
const nextRequire=sourceOnlyRoot?baselineRequire:createRequire(path.join(consumers.next,'package.json'));
const originalGlob=baselineRequire('fast-glob');
const log={log(){},logLabeled(){}};
const forbidden=()=>{throw new Error('Network/process/provider operation forbidden in watcher fixture');};
function firebaseModule(dir,relative,chokidar,puts){
  const exports={};
  const types={Emulators:{FUNCTIONS:'functions',DATABASE:'database',FIRESTORE:'firestore',STORAGE:'storage'},Severity:{ERROR:'ERROR'}};
  const registry={EmulatorRegistry:{isRunning:()=>false,getInfo:()=>undefined,client:()=>({put:async(...args)=>{puts.push(args);return {body:{issues:[]}};}})}};
  const mocks={
    chokidar,anymatch:candidateAnymatch,fs,path,events:baselineRequire('node:events'),url:baselineRequire('node:url'),semver:baselineRequire('semver'),
    colorette:new Proxy({}, {get:()=>s=>s}),
    './downloadableEmulators':{start:async()=>undefined,stop:async()=>undefined},
    './registry':registry,'../emulator/types':types,'./types':types,'../../types':types,
    './emulatorLogger':{EmulatorLogger:{forEmulator:()=>log}},'../../emulatorLogger':{EmulatorLogger:{forEmulator:()=>log}},
    '../../../fsutils':{readFile:file=>fs.readFileSync(file,'utf8')},
    '../utils':{debounce:fn=>fn,logLabeledBullet(){},logWarning(){},logLabeledSuccess(){}},
    '../deploy/functions/runtimes/supported':{runtimeIsLanguage:()=>false},
  };
  const deny=new Proxy(forbidden,{get:()=>forbidden});
  const source=fs.readFileSync(path.join(dir,relative),'utf8');
  const allowed=new Set([...source.matchAll(/require\("([^"\n]+)"\)/g)].map(x=>x[1]));
  const require=name=>{if(!allowed.has(name))throw new Error('Unexpected fixture import: '+name);return mocks[name]??deny;};
  vm.runInThisContext('(function(exports,require,module){'+source+'\n})', {filename:relative})(exports,require,{exports});
  return exports;
}
async function waitFor(predicate,label){const until=Date.now()+5000;while(Date.now()<until){if(predicate())return;await delay(20);}throw new Error('Watch deadline exhausted: '+label);}
async function ready(watcher){await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('Watcher ready deadline')),5000);watcher.once('ready',()=>{clearTimeout(timeout);resolve();});watcher.once('error',e=>{clearTimeout(timeout);reject(e);});});}

for(const [label,dir,actual] of [['original',path.join(baselineRoot,'firebase'),baselineChokidar],['maintained',consumers.firebase,candidateChokidar]]){
  test(label+' actual FunctionsEmulator.connect literal watch, ignore algebra and lifecycle',async()=>{
    const fixture=fs.mkdtempSync(path.join(os.tmpdir(),'urai-functions-watch-'));const watchers=[];const events=[];let reloads=0;
    const observed={...actual,watch:(input,options)=>{const w=actual.watch(input,options);watchers.push({w,options});w.on('all',(event,file)=>events.push([event,path.relative(fixture,file)]));return w;}};
    try{
      fs.writeFileSync(path.join(fixture,'index.js'),'first');
      const {FunctionsEmulator}=firebaseModule(dir,'lib/emulator/functionsEmulator.js',observed,[]);
      const instance=Object.create(FunctionsEmulator.prototype);
      Object.assign(instance,{staticBackends:[{functionsDir:fixture,runtime:'nodejs22',ignore:['generated/**','*.skip','cache','!keep.skip']}],logger:log,watchers:[],loadTriggers:async()=>{reloads++;},performPostLoadOperations:async()=>undefined});
      await instance.connect();assert.equal(watchers.length,1);await ready(watchers[0].w);assert.equal(reloads,1);
      const patterns=[/(^|[\/\\])\../,/.+\.log/ ,/.+?[\\\/]node_modules[\\\/].+?/,/.+?[\\\/]venv[\\\/].+?/, '**/generated/**','**/*.skip','**/cache','**/!keep.skip'];
      const expected=candidateAnymatch(patterns,undefined,{dot:true});
      const options=watchers[0].options;
      const matcher=typeof options.ignored==='function'?options.ignored:candidateAnymatch(options.ignored,undefined,{dot:true});
      const predicate=typeof options.ignored==='function'?matcher:(file,stats)=>matcher([file,stats]);
      const files=['index.js','.hidden','file.log','node_modules/pkg/a.js','venv/bin/python','generated/item.js','cache','a.skip','keep.skip','nested/file.js','generated'];
      for(const file of files){const absolute=path.join(fixture,file);const stats=fs.statSync(fixture);assert.equal(typeof predicate(absolute,stats),'boolean');assert.equal(predicate(absolute,stats),expected([absolute,stats]),'Ignore algebra for '+file);}
      fs.writeFileSync(path.join(fixture,'index.js'),'second');await waitFor(()=>reloads>=2,'Functions reload');
      fs.mkdirSync(path.join(fixture,'generated'));fs.writeFileSync(path.join(fixture,'generated/ignored.js'),'ignored');await delay(180);assert(!events.some(([,f])=>f==='generated/ignored.js'));
      fs.writeFileSync(path.join(fixture,'new.js'),'new');await waitFor(()=>events.some(([e,f])=>e==='add'&&f==='new.js'),'Functions add');
      fs.unlinkSync(path.join(fixture,'new.js'));await waitFor(()=>events.some(([e,f])=>e==='unlink'&&f==='new.js'),'Functions unlink');
      await Promise.all(watchers.map(({w})=>w.close()));assert(watchers.every(({w})=>w.closed));
    }finally{await Promise.all(watchers.map(({w})=>w.close()));fs.rmSync(fixture,{recursive:true,force:true});}
  });
  test(label+' actual DatabaseEmulator.start/connect reads and updates literal rules',async()=>{
    const fixture=fs.mkdtempSync(path.join(os.tmpdir(),'urai-database-watch-'));const file=path.join(fixture,'database.rules.json');const puts=[];let instance;
    try{fs.writeFileSync(file,'{"rules":{".read":false}}');const {DatabaseEmulator}=firebaseModule(dir,'lib/emulator/databaseEmulator.js',actual,puts);instance=new DatabaseEmulator({rules:[{instance:'fixture',rules:file}]});await instance.start();await ready(instance.rulesWatchers[0]);await instance.connect();assert(puts.some(args=>args[1].includes('false')));fs.writeFileSync(file,'{"rules":{".read":true}}');await waitFor(()=>puts.some(args=>args[1].includes('true')),'Database rules change');await instance.stop();assert.equal(instance.rulesWatchers.length,0);}finally{if(instance)await instance.stop();fs.rmSync(fixture,{recursive:true,force:true});}
  });
  test(label+' actual FirestoreEmulator.start recompiles changed literal rules',async()=>{
    const fixture=fs.mkdtempSync(path.join(os.tmpdir(),'urai-firestore-watch-'));const file=path.join(fixture,'firestore.rules');const puts=[];let instance;
    try{fs.writeFileSync(file,'rules_version = "2"; // first');const {FirestoreEmulator}=firebaseModule(dir,'lib/emulator/firestoreEmulator.js',actual,puts);instance=new FirestoreEmulator({rules:file,project_id:'fixture'});await instance.start();await ready(instance.rulesWatcher);fs.writeFileSync(file,'rules_version = "2"; // second');await waitFor(()=>puts.some(args=>args[1].rules.files[0].content.includes('second')),'Firestore rules change');await instance.rulesWatcher.close();assert(instance.rulesWatcher.closed);}finally{if(instance?.rulesWatcher)await instance.rulesWatcher.close();fs.rmSync(fixture,{recursive:true,force:true});}
  });
  test(label+' actual StorageRulesManager.start updates rules, denies unreadable and closes',async()=>{
    const fixture=fs.mkdtempSync(path.join(os.tmpdir(),'urai-storage-watch-'));const file=path.join(fixture,'storage.rules');const loads=[];let instance;
    try{fs.writeFileSync(file,'first');const runtime={loadRuleset:async input=>{loads.push(input.files[0].content);return {ruleset:{},issues:{all:[]}};}};const {createStorageRulesManager}=firebaseModule(dir,'lib/emulator/storage/rules/manager.js',actual,[]);instance=createStorageRulesManager({name:file,content:'first'},runtime);await instance.start();await ready(instance._watcher);assert.deepEqual(loads,['first']);fs.writeFileSync(file,'second');await waitFor(()=>loads.includes('second'),'Storage rules change');fs.unlinkSync(file);await delay(180);assert.equal(loads.at(-1),'second');await instance.stop();assert(instance._watcher.closed);}finally{if(instance)await instance.stop();fs.rmSync(fixture,{recursive:true,force:true});}
  });
}

function nextModule(dir,relative,glob){
  const cache=new Map();
  function load(file){file=path.resolve(dir,file);if(!file.startsWith(path.resolve(dir)+path.sep))throw new Error('Next fixture path escape');if(!file.endsWith('.js'))file+='.js';if(cache.has(file))return cache.get(file).exports;const module={exports:{}};cache.set(file,module);const require=name=>{if(name==='fast-glob')return glob;if(['@nodelib/fs.walk','brace-expansion','glob-parent','picomatch'].includes(name))return nextRequire(name);if(['fs','path'].includes(name))return baselineRequire('node:'+name);if(name.startsWith('.'))return load(path.relative(dir,path.resolve(path.dirname(file),name)));throw new Error('Unexpected Next dependency: '+name);};vm.runInThisContext('(function(exports,require,module){'+fs.readFileSync(file,'utf8')+'\n})',{filename:file})(module.exports,require,module);return module.exports;}
  return load(relative);
}
test('Next root discovery preserves literal, symlink, hidden, braces, extglob, exclusions and terminal globstar results',()=>{
  const fixture=fs.mkdtempSync(path.join(os.tmpdir(),'urai-next-roots-'));const before=process.cwd();
  try{for(const dir of ['apps/a/pages','apps/b/pages','apps/.hidden/pages','apps/a/nested/deep','literal','name[bracket]'])fs.mkdirSync(path.join(fixture,dir),{recursive:true});fs.symlinkSync('a',path.join(fixture,'apps/link'),'dir');fs.writeFileSync(path.join(fixture,'literal/file'),'file');process.chdir(fixture);
    const original=nextModule(path.join(baselineRoot,'next'),'dist/utils/get-root-dirs.js',originalGlob).getRootDirs;const candidate=nextModule(consumers.next,'dist/utils/get-root-dirs.js').getRootDirs;
    const patterns=[undefined,'literal','missing','literal/file','apps/*','apps/{a,b}','apps/@(a|b)','apps/**','**','apps/**/pages','apps/link/**','!apps/a',['apps/*','!apps/b'],['literal',42,'missing'],'name[bracket]'];
    for(const pattern of patterns){const context={cwd:fixture,settings:{next:pattern===undefined?{}:{rootDir:pattern}}};assert.deepEqual(candidate(context).sort(),original(context).sort(),'Root pattern '+JSON.stringify(pattern));}
  }finally{process.chdir(before);fs.rmSync(fixture,{recursive:true,force:true});}
});
test('All Next lint rules/configs retained; actual ESLint emits equivalent diagnostics across real root settings',()=>{
  const fixture=fs.mkdtempSync(path.join(os.tmpdir(),'urai-next-lint-'));const before=process.cwd();
  try{for(const dir of ['apps/a/pages','apps/b/pages'])fs.mkdirSync(path.join(fixture,dir),{recursive:true});fs.writeFileSync(path.join(fixture,'apps/a/pages/about.jsx'),'export default function About(){return null}');process.chdir(fixture);
    const original=nextModule(path.join(baselineRoot,'next'),'dist/index.js',originalGlob);const candidate=nextModule(consumers.next,'dist/index.js');
    assert.deepEqual(Object.keys(candidate.rules),Object.keys(original.rules));assert.deepEqual(candidate.configs,original.configs);for(const name of Object.keys(candidate.rules))assert.deepEqual(candidate.rules[name].meta,original.rules[name].meta);
    const snippets=['export default()=> <a href="/about">About</a>','export default()=> <img src="/x.png"/>','export default()=> <script src="/x.js"/>','export default()=> <head><title>Title</title></head>','let module = {};','export default()=> <link rel="stylesheet" href="/style.css"/>','export default()=> <a href="https://example.com">External</a>'];
    const patterns=['apps/a','apps/*','apps/{a,b}','apps/@(a|b)','apps/**',['apps/a','apps/b']];
    const lint=(plugin,code,pattern)=>{const linter=new consumers.eslint.Linter({cwd:fixture});return linter.verify(code,[{files:['**/*.jsx'],plugins:{'@next/next':plugin},languageOptions:{ecmaVersion:2022,sourceType:'module',parserOptions:{ecmaFeatures:{jsx:true}}},settings:{next:{rootDir:pattern}},rules:{...plugin.configs.recommended.rules,...plugin.configs['core-web-vitals'].rules}}],{filename:path.join(fixture,'page.jsx')});};
    let genuineDiagnostics=0;for(const pattern of patterns)for(const code of snippets){const expected=lint(original,code,pattern);genuineDiagnostics+=expected.length;assert.deepEqual(lint(candidate,code,pattern),expected,'Lint consumer parity '+JSON.stringify(pattern));}assert(genuineDiagnostics>=24,'Actual lint functions must emit their original findings');
  }finally{process.chdir(before);fs.rmSync(fixture,{recursive:true,force:true});}
});

test('Independent advisory comparator remains fail closed for actual High and malformed boundaries',async()=>{
  const {match,affected}=await import('./check-installed-reviewed-advisories.mjs');const semver=baselineRequire('semver');
  const high={id:'GHSA-vfj7-8cjw-p6xm',database_specific:{severity:'HIGH'},affected:[{package:{ecosystem:'npm',name:'braces'},ranges:[{type:'SEMVER',events:[{introduced:'0'},{last_affected:'3.0.3'}]}]}]};
  assert.equal(match({nodes:[{name:'braces',version:'3.0.3'}],problems:[]},[high],semver).status,'BLOCKED');assert.equal(match({nodes:[],problems:[{name:'missing'}]},[],semver).status,'BLOCKED');assert.throws(()=>affected('3.0.3',{ranges:[{type:'GIT',events:[]}]},semver));
});
console.log(JSON.stringify({proofScope:sourceOnlyRoot?'SOURCE_ONLY_PUBLIC_PACKAGE_PROBE':'ACTUAL_INSTALLED_CONSUMER_PROOF',providerAcceptance:false,productionAcceptance:false,securityWaiver:false}));
