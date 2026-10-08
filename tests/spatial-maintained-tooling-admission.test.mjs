import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import test from 'node:test';
import {root,sha256,workspaceGraph,resolveConsumers,verifyConsumerSource,resolveDeclaredPackageManifest} from '../scripts/spatial-maintained-tooling.mjs';
import {match,affected} from '../scripts/check-installed-reviewed-advisories.mjs';

console.log(JSON.stringify({proofScope:'ACTUAL_INSTALLED_MAINTAINED_TOOLING_SOURCE_AND_INGRESS',wholeReviewedCorpusAcceptance:false,independentSecurityAcceptance:false,releaseAcceptance:false,productionAcceptance:false}));

test('current source declares only the maintained watcher and directory consumer ingress',()=>{
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
  assert.equal(manifest.dependencies?.braces,undefined);
  assert.equal(manifest.pnpm.overrides.braces,undefined);
  assert.equal(manifest.pnpm.overrides['chokidar@3.6.0'],undefined);
  assert.equal(manifest.pnpm.overrides['firebase-tools@15.32.1>chokidar'],'4.0.3');
  assert.equal(manifest.pnpm.overrides['@next/eslint-plugin-next@15.5.27>fast-glob'],'-');
  assert.equal(manifest.pnpm.overrides['anymatch@3.1.3>picomatch'],'2.3.2');
  assert.equal(manifest.pnpm.patchedDependencies['firebase-tools@15.32.1'],'patches/firebase-tools-15.32.1-maintained-watch.patch');
  assert.equal(manifest.pnpm.patchedDependencies['@next/eslint-plugin-next@15.5.27'],'patches/next-eslint-plugin-next-15.5.27-maintained-glob.patch');
  assert.equal(sha256(fs.readFileSync(path.join(root,manifest.pnpm.patchedDependencies['firebase-tools@15.32.1']))),'d48efb262a4970d85984dcfd982070a88835713b0b83d41a4b37b0c5f4fccb20');
  assert.equal(sha256(fs.readFileSync(path.join(root,manifest.pnpm.patchedDependencies['@next/eslint-plugin-next@15.5.27']))),'093fcffbf55fd7ebdc8f7de2be6f58cfcc342742b73d1eeb7ca6e73ce9458056');
});

test('all seven actual installed importer graphs are complete and exclude the removed ingress',()=>{
  const graph=workspaceGraph();
  assert.ok(graph.nodes.length>0,'An empty or configuration-only graph cannot pass');
  assert.deepEqual(graph.problems,[],'Missing, unresolved or outside-checkout nodes cannot pass');
  assert.deepEqual(graph.nodes.filter(node=>['braces','micromatch','fast-glob'].includes(node.name)),[]);
});

test('the actual Firebase and Next consumers retain all independently bound source bytes',()=>{
  const provenance=verifyConsumerSource(resolveConsumers());
  assert.deepEqual(provenance.consumers.map(c=>[c.name,c.version,Object.keys(c.installedSourceSha256).length]),[
    ['firebase-tools','15.32.1',983],['@next/eslint-plugin-next','15.5.27',56]
  ]);
  assert.equal(provenance.securityWaiver,false);
  assert.equal(provenance.productionAcceptance,false);
});

test('actual consumer dependency entry authority binds exact names and versions inside this checkout',()=>{
  const consumers=resolveConsumers();
  const firebaseRequire=createRequire(path.join(consumers.firebase,'package.json'));
  const nextRequire=createRequire(path.join(consumers.next,'package.json'));
  for(const [require,name,version] of [
    [firebaseRequire,'chokidar','4.0.3'],[firebaseRequire,'anymatch','3.1.3'],
    [nextRequire,'@nodelib/fs.walk','1.2.8'],[nextRequire,'brace-expansion','5.0.12'],
    [nextRequire,'glob-parent','5.1.2'],[nextRequire,'picomatch','2.3.2']
  ])assert.equal(resolveDeclaredPackageManifest(require,name,version).manifest.version,version);
});

test('the independent installed-risk comparator cannot waive a reintroduced High or incomplete graph',()=>{
  const consumers=resolveConsumers();
  const semver=createRequire(path.join(consumers.firebase,'package.json'))('semver');
  const advisory={id:'GHSA-vfj7-8cjw-p6xm',database_specific:{severity:'HIGH'},affected:[{package:{ecosystem:'npm',name:'braces'},ranges:[{type:'SEMVER',events:[{introduced:'0'},{last_affected:'3.0.3'}]}]}]};
  assert.equal(match({nodes:[{name:'braces',version:'3.0.3'}],problems:[]},[advisory],semver).status,'BLOCKED');
  assert.equal(match({nodes:[],problems:[{name:'missing-required-package'}]},[],semver).status,'BLOCKED');
  assert.throws(()=>affected('3.0.3',{ranges:[{type:'GIT',events:[]}]},semver));
});
