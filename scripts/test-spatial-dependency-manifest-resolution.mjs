import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import test from 'node:test';
import {root,resolveDeclaredPackageManifest} from './spatial-maintained-tooling.mjs';

const name='fixture-dependency',version='1.2.3';
function fixture(run) {
  const dir=fs.mkdtempSync(path.join(root,'.urai-package-manifest-fixture-'));
  const packageDir=path.join(dir,'node_modules',name);
  fs.mkdirSync(path.join(packageDir,'dist'),{recursive:true});
  fs.writeFileSync(path.join(dir,'package.json'),JSON.stringify({private:true}));
  const manifest={name,version,exports:{'.':'./dist/index.js'}};
  fs.writeFileSync(path.join(packageDir,'package.json'),JSON.stringify(manifest));
  fs.writeFileSync(path.join(packageDir,'dist/index.js'),'throw new Error("Package entry must never be executed by identity resolution");\n');
  try {run({dir,packageDir,manifest,require:createRequire(path.join(dir,'package.json'))});}
  finally {fs.rmSync(dir,{recursive:true,force:true});}
}

test('resolve the actual entry without requiring an unexported package manifest',()=>fixture(f=>{
  assert.throws(()=>f.require.resolve(name+'/package.json'),{code:'ERR_PACKAGE_PATH_NOT_EXPORTED'});
  fs.writeFileSync(path.join(f.packageDir,'dist/package.json'),JSON.stringify({type:'commonjs'}));
  const result=resolveDeclaredPackageManifest(f.require,name,version);
  assert.equal(result.path,fs.realpathSync(path.join(f.packageDir,'package.json')));
  assert.equal(result.entry,fs.realpathSync(path.join(f.packageDir,'dist/index.js')));
  assert.equal(result.manifest.name,name);assert.equal(result.manifest.version,version);
}));

test('a matching resolved entry cannot substitute a different declared name or version',()=>{
  for(const change of [{name:'wrong-dependency'},{version:'9.9.9'}])fixture(f=>{
    fs.writeFileSync(path.join(f.packageDir,'package.json'),JSON.stringify({...f.manifest,...change}));
    assert.throws(()=>resolveDeclaredPackageManifest(f.require,name,version),/Unexpected dependency identity/);
  });
});

test('an entry with no matching package manifest cannot acquire ancestor authority',()=>fixture(f=>{
  fs.rmSync(path.join(f.packageDir,'package.json'));
  fs.writeFileSync(path.join(f.packageDir,'index.js'),'throw new Error("Never execute this entry");\n');
  assert.throws(()=>resolveDeclaredPackageManifest(f.require,name,version),/Actual resolved dependency manifest is missing/);
}));

test('a resolved package symlink outside this checkout cannot satisfy identity',()=>fixture(f=>{
  const outside=fs.mkdtempSync(path.join(os.tmpdir(),'urai-public-package-boundary-'));
  try {
    fs.writeFileSync(path.join(outside,'package.json'),JSON.stringify({...f.manifest,exports:undefined,main:'index.js'}));
    fs.writeFileSync(path.join(outside,'index.js'),'throw new Error("Never execute outside entry");\n');
    fs.rmSync(f.packageDir,{recursive:true,force:true});fs.symlinkSync(outside,f.packageDir,'dir');
    assert.throws(()=>resolveDeclaredPackageManifest(f.require,name,version),/outside current checkout/);
  } finally {fs.rmSync(outside,{recursive:true,force:true});}
}));

test('a manifest symlink cannot acquire outside authority even with an inside entry',()=>fixture(f=>{
  const outside=fs.mkdtempSync(path.join(os.tmpdir(),'urai-public-manifest-boundary-'));
  try {
    const external=path.join(outside,'package.json');fs.writeFileSync(external,JSON.stringify(f.manifest));
    fs.rmSync(path.join(f.packageDir,'package.json'));fs.symlinkSync(external,path.join(f.packageDir,'package.json'));
    assert.throws(()=>resolveDeclaredPackageManifest(f.require,name,version),/outside current checkout/);
  } finally {fs.rmSync(outside,{recursive:true,force:true});}
}));

test('relative or incomplete expected package identities are rejected before resolution',()=>fixture(f=>{
  for(const invalid of ['../fixture-dependency','./fixture-dependency','@scope/','fixture-dependency/'])
    assert.throws(()=>resolveDeclaredPackageManifest(f.require,invalid,version),/Invalid expected package identity/);
  assert.throws(()=>resolveDeclaredPackageManifest(f.require,name,''),/Invalid expected package identity/);
}));
