#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {match, primaryCommit as historicalPrimaryCommit} from './check-installed-reviewed-advisories.mjs';
import {root,workspaceGraph,resolveConsumers,sha256} from './spatial-maintained-tooling.mjs';

export const currentPrimaryCommit='ccd4868bd8cfbed178f5ada1194b4fe30674c25b';
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
const semver=createRequire(path.join(consumers.firebase,'package.json'))('semver');
const graph=workspaceGraph();const findings=[];const manifest=[];
for(const entry of tracked){
  const bytes=fs.readFileSync(path.join(checkout,entry.path));
  const blob=createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
  if(blob!==entry.blob)throw new Error('Reviewed Git blob mismatch: '+entry.path);
  manifest.push({path:entry.path,sha256:sha256(bytes)});
  findings.push(...match(graph,[JSON.parse(bytes)],semver).findings);
}
const severeUniqueAdvisories=[...new Set(findings.filter(f=>['high','critical'].includes(f.severity)).map(f=>f.advisory))].sort();
const result={status:graph.problems.length||severeUniqueAdvisories.length?'BLOCKED':'PASS_WITHIN_CURRENT_REVIEWED_SNAPSHOT',sourceSha:git(['rev-parse','HEAD'],{cwd:root}).trim(),sourceTree:git(['rev-parse','HEAD^{tree}'],{cwd:root}).trim(),lockSha256:sha256(fs.readFileSync(path.join(root,'pnpm-lock.yaml'))),installedNodes:graph.nodes.length,graphProblems:graph.problems,severeUniqueAdvisories,findings,installedGraph:graph.nodes,primaryRepository:'github/advisory-database',primaryCommit:currentPrimaryCommit,historicalPrimaryCommit,reviewedRecords:tracked.length,manifestSha256:sha256(Buffer.from(JSON.stringify(manifest))),observedAt:new Date().toISOString(),securityWaiver:false,method:'Complete exact current official reviewed Git inventory and every byte-bound Git blob matched locally against all actual installed workspace importers with the unchanged independent comparator. No graph upload or exception.'};
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({...result,installedGraph:undefined,findings:undefined}));if(result.status==='BLOCKED')process.exitCode=1;
