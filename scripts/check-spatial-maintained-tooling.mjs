#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {root, sha256, workspaceGraph, resolveConsumers, verifyConsumerSource} from './spatial-maintained-tooling.mjs';

const output = process.argv[2];
if (!output) throw new Error('Usage: node scripts/check-spatial-maintained-tooling.mjs OUTPUT_JSON');
const consumers = resolveConsumers();
const provenance = verifyConsumerSource(consumers);
const firebaseRequire = createRequire(path.join(consumers.firebase, 'package.json'));
const nextRequire = createRequire(path.join(consumers.next, 'package.json'));
for (const [require, name, version] of [[firebaseRequire,'chokidar','4.0.3'],[firebaseRequire,'anymatch','3.1.3'],[nextRequire,'glob','13.0.6']]) {
  const actual = JSON.parse(fs.readFileSync(require.resolve(name + '/package.json')));
  if (actual.version !== version) throw new Error('Unexpected dependency: ' + name + '@' + actual.version);
}
const graph = workspaceGraph();
const affected = graph.nodes.filter(node => ['braces','micromatch','fast-glob'].includes(node.name));
const result = {
  status: graph.problems.length || affected.length ? 'BLOCKED' : 'PASS_SOURCE_AND_INSTALLED_GRAPH',
  sourceSha: execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),
  sourceTree: execFileSync('git',['rev-parse','HEAD^{tree}'],{cwd:root,encoding:'utf8'}).trim(),
  lockSha256: sha256(fs.readFileSync(path.join(root,'pnpm-lock.yaml'))),
  installedNodes: graph.nodes.length, graphProblems: graph.problems, affectedPackages: affected,
  consumers: provenance.consumers.map(c => ({name:c.name,version:c.version,verifiedSourceFiles:Object.keys(c.installedSourceSha256).length,patchedFiles:c.patchedFiles})),
  installedGraph: graph.nodes, observedAt: new Date().toISOString(), securityWaiver:false,
  providerAcceptance:false, productionAcceptance:false, deviceAcceptance:false,
};
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({...result,installedGraph:undefined}));
if(result.status==='BLOCKED') process.exitCode=1;
