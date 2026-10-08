import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {root,originalBaselineRequire} from './spatial-maintained-tooling.mjs';
const name='original-fixture-dependency',version='1.2.3';
const ids=[[name,name,version]];
function packageAt(dir,changes={}){
  fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'package.json'),JSON.stringify({name,version,exports:{'.':'./index.js','./package.json':'./package.json'},...changes}));
  fs.writeFileSync(path.join(dir,'index.js'),'throw new Error("Identity checks must not execute original package entry");\n');
}
function fixture(run){
  const dir=fs.mkdtempSync(path.join(root,'.urai-original-baseline-fixture-'));
  const baseline=path.join(dir,'baseline'),manifest=path.join(baseline,'package.json');
  fs.mkdirSync(baseline);fs.writeFileSync(manifest,JSON.stringify({private:true}));
  const dependency=path.join(baseline,'node_modules',name);packageAt(dependency);
  try{run({dir,baseline,manifest,dependency});}finally{fs.rmSync(dir,{recursive:true,force:true});}
}
test('real baseline manifest binds exact original package metadata and entry inside its scope',()=>fixture(f=>{
  const r=originalBaselineRequire(f.baseline,f.manifest,ids);
  assert.equal(r.resolve(name),path.join(f.dependency,'index.js'));
}));
test('a missing baseline manifest fails before Node can acquire global fallback authority',()=>fixture(f=>{
  fs.rmSync(f.manifest);assert.throws(()=>originalBaselineRequire(f.baseline,f.manifest,ids),{code:'ENOENT'});
}));
test('wrong original package name or version cannot satisfy declared baseline identity',()=>{
  for(const change of [{name:'unrelated-package'},{version:'9.9.9'}])fixture(f=>{
    packageAt(f.dependency,change);assert.throws(()=>originalBaselineRequire(f.baseline,f.manifest,ids),/Original public package identity mismatch/);
  });
});
test('a valid same-version Node parent fallback still cannot become original baseline authority',()=>fixture(f=>{
  fs.rmSync(f.dependency,{recursive:true,force:true});packageAt(path.join(f.dir,'node_modules',name));
  assert.throws(()=>originalBaselineRequire(f.baseline,f.manifest,ids),/Original public package resolved outside baseline/);
}));
test('a caller manifest outside the baseline cannot confer original package authority',()=>fixture(f=>{
  const outside=path.join(f.dir,'outside-package.json');fs.writeFileSync(outside,'{}');
  assert.throws(()=>originalBaselineRequire(f.baseline,outside,ids),/Explicit original public baseline authority required/);
}));
test('a symlinked original entry outside the baseline is rejected even with matching inside metadata',()=>fixture(f=>{
  const outside=path.join(f.dir,'outside-entry.js');fs.writeFileSync(outside,'throw new Error("Never execute outside entry");');
  fs.rmSync(path.join(f.dependency,'index.js'));fs.symlinkSync(outside,path.join(f.dependency,'index.js'));
  assert.throws(()=>originalBaselineRequire(f.baseline,f.manifest,ids),/Original public package resolved outside baseline/);
}));
test('an empty original identity set cannot turn manifest configuration into package proof',()=>fixture(f=>{
  assert.throws(()=>originalBaselineRequire(f.baseline,f.manifest,[]),/Explicit original public baseline authority required/);
}));
