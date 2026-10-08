#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {match, installedGraph, primaryCommit as historicalPrimaryCommit} from './check-installed-reviewed-advisories.mjs';
import {root,workspaceGraph,resolveConsumers,sha256,literalLockGraph} from './spatial-maintained-tooling.mjs';

export const currentPrimaryCommit='99ef6f144c4868742e6e9bc3342ba8f1748ac332';
const [checkout,output]=process.argv.slice(2);
if(!checkout||!output) throw new Error('Usage: node scripts/check-current-spatial-reviewed-advisories.mjs OFFICIAL_CHECKOUT OUTPUT_JSON');
const git=(args,options={})=>execFileSync('git',args,{encoding:'utf8',maxBuffer:16*1024*1024,...options});
const remote=git(['ls-remote','https://github.com/github/advisory-database.git','refs/heads/main']).trim().split(/\s/)[0];
if(remote!==currentPrimaryCommit) throw new Error('Official advisory HEAD advanced; refresh the complete exact pin, do not reuse predecessor acceptance');
if(git(['-C',checkout,'rev-parse','HEAD']).trim()!==currentPrimaryCommit) throw new Error('Incorrect complete advisory source');
const tracked=git(['-C',checkout,'ls-tree','-r','HEAD','advisories/github-reviewed']).trim().split('\n').map(line=>{const m=/^100644 blob ([0-9a-f]{40})\t(.+\.json)$/.exec(line);if(!m)throw new Error('Unrecognized reviewed tree entry');return {blob:m[1],path:m[2]};}).sort((a,b)=>a.path.localeCompare(b.path,'en'));
function inventory(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?inventory(path.join(dir,e.name)):e.isFile()&&e.name.endsWith('.json')?[path.relative(checkout,path.join(dir,e.name))]:[]);}
const files=inventory(path.join(checkout,'advisories/github-reviewed')).sort((a,b)=>a.localeCompare(b,'en'));
if(JSON.stringify(files)!==JSON.stringify(tracked.map(x=>x.path))) throw new Error('Complete exact reviewed inventory is required');
const consumers=resolveConsumers();
const actualRequire=createRequire(path.join(consumers.firebase,'package.json'));
const semver=actualRequire('semver'),yaml=actualRequire('yaml');
const graph=workspaceGraph();const findings=[];const manifest=[];
const lockGraph=literalLockGraph(yaml.parse(fs.readFileSync(path.join(root,'pnpm-lock.yaml'),'utf8')),semver,root);
const legacyRoot=process.env.URAI_LEGACY_TOOLING_FIXTURE;
if(!legacyRoot)throw new Error('The actual frozen retained legacy fixture must be inventoried separately; no local/file source omission');
const legacyGraph=installedGraph(legacyRoot,['.']);
const legacyLockGraph=literalLockGraph(yaml.parse(fs.readFileSync(path.join(legacyRoot,'pnpm-lock.yaml'),'utf8')),semver,legacyRoot,true);
const vendorManifest=JSON.parse(fs.readFileSync(path.join(root,'scripts/fixtures/spatial-legacy-tooling/vendor-source-manifest.json')));
if(vendorManifest.files.length!==22||vendorManifest.waiver!==false)throw new Error('Retained private source disposition drift');
for(const entry of vendorManifest.files){
  if(!/^vendor\/(?:braces|chokidar)\/[A-Za-z0-9_./-]+$/.test(entry.path)||entry.path.split('/').includes('..'))throw new Error('Invalid retained source path');
  for(const dir of [root,legacyRoot])if(sha256(fs.readFileSync(path.join(dir,entry.path)))!==entry.sha256)throw new Error('Retained licensed source drift: '+entry.path);
}
// Census the actual tracked launch source. Generic legacy imports remain confined
// to the explicit regression fixture; an application/package import is fail-closed.
const runtimePattern="['\"](braces|micromatch|fast-glob|chokidar)['\"]";
let launchImports;
try {launchImports=git(['grep','-n','-E',runtimePattern,'HEAD','--','apps','urai-tier1/src','packages','distribution'],{cwd:root}).trim();}
catch(error){if(error.status!==1)throw error;launchImports='';}
if(launchImports)throw new Error('Legacy dependency enters tracked launch source: '+launchImports);
const lockFindings=[],legacyFindings=[],legacyLockFindings=[];
for(const entry of tracked){
  const bytes=fs.readFileSync(path.join(checkout,entry.path));
  const blob=createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
  if(blob!==entry.blob)throw new Error('Reviewed Git blob mismatch: '+entry.path);
  manifest.push({path:entry.path,sha256:sha256(bytes)});
  const advisory=[JSON.parse(bytes)];
  findings.push(...match(graph,advisory,semver).findings);
  lockFindings.push(...match(lockGraph,advisory,semver).findings);
  legacyFindings.push(...match(legacyGraph,advisory,semver).findings);
  legacyLockFindings.push(...match(legacyLockGraph,advisory,semver).findings);
}
if(git(['ls-remote','https://github.com/github/advisory-database.git','refs/heads/main']).trim().split(/\s/)[0]!==currentPrimaryCommit)throw new Error('Official advisory HEAD advanced during proof');
const severeUniqueAdvisories=[...new Set([...findings,...lockFindings].filter(f=>['high','critical'].includes(f.severity)).map(f=>f.advisory))].sort();
const result={status:graph.problems.length||legacyGraph.problems.length||severeUniqueAdvisories.length?'BLOCKED':'PASS_WITHIN_CURRENT_REVIEWED_SNAPSHOT',sourceSha:git(['rev-parse','HEAD'],{cwd:root}).trim(),sourceTree:git(['rev-parse','HEAD^{tree}'],{cwd:root}).trim(),lockSha256:sha256(fs.readFileSync(path.join(root,'pnpm-lock.yaml'))),installedNodes:graph.nodes.length,graphProblems:graph.problems,completeLiteralLockPackageEntries:lockGraph.nodes.length,localFileOrVendorLockEntries:lockGraph.localSources,severeUniqueAdvisories,findings,lockFindings,retainedLicensedSource:{files:22,trackedLaunchSourceImports:[],actualInstalledNodes:legacyGraph.nodes.length,graphProblems:legacyGraph.problems,completeLiteralLockEntries:legacyLockGraph.nodes.length,localFileOrVendorSources:legacyLockGraph.localSources,findings:legacyFindings,canonicalUpstreamFindings:legacyLockFindings,rawAdvisory:'GHSA-vfj7-8cjw-p6xm',rawHighAcceptance:'OPEN_UNWAIVED',upstreamFixedVersion:null,estateSecurityAcceptance:false},installedGraph:graph.nodes,primaryRepository:'github/advisory-database',primaryCommit:currentPrimaryCommit,historicalPrimaryCommit,reviewedRecords:tracked.length,manifestSha256:sha256(Buffer.from(JSON.stringify(manifest))),observedAt:new Date().toISOString(),securityWaiver:false,method:'Complete exact current official reviewed Git inventory and every byte-bound Git blob matched locally against all actual installed workspace importers with the unchanged independent comparator. All literal lock identities and both actual/canonical local-file fork identities are separately inventoried. Raw legacy HIGH remains open/unwaived and does not certify estate security. No graph upload or exception.'};
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({...result,installedGraph:undefined,findings:undefined}));if(result.status==='BLOCKED')process.exitCode=1;
