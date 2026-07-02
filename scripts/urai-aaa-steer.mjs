#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const root = process.cwd();
const planPath = path.join(root, 'docs/aaa-machine/steering-plan.json');

function exists(p) {
  return fs.existsSync(p);
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function latestProofDir() {
  const receipts = path.join(os.homedir(), 'urai-final-receipts');
  if (!exists(receipts)) return null;

  return fs.readdirSync(receipts)
    .filter((name) => name.startsWith('aaa-launch-proof-'))
    .map((name) => path.join(receipts, name))
    .filter((p) => fs.statSync(p).isDirectory())
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

function pngCount(proofDir) {
  if (!proofDir) return 0;
  const dir = path.join(proofDir, 'screenshots');
  if (!exists(dir)) return 0;
  return fs.readdirSync(dir).filter((name) => name.endsWith('.png')).length;
}

function verdictStatus(file) {
  const p = path.join(root, file);
  if (!exists(p)) return 'missing';
  const text = fs.readFileSync(p, 'utf8');
  if (/VERDICT:\s*PASS/i.test(text)) return 'pass';
  if (/VERDICT:\s*FAIL/i.test(text)) return 'fail';
  if (/VERDICT:\s*REVIEW/i.test(text)) return 'review';
  return 'unknown';
}

if (!exists(planPath)) {
  console.error('Missing docs/aaa-machine/steering-plan.json');
  process.exit(1);
}

const plan = readJson(planPath);
const proofDir = latestProofDir();
const count = pngCount(proofDir);

const loops = plan.loops.map((loop) => ({
  ...loop,
  verdict: verdictStatus(loop.verdictFile),
}));

const next = loops.find((loop) => loop.verdict !== 'pass') || loops[loops.length - 1];

const report = {
  generatedAt: new Date().toISOString(),
  latestProofDir: proofDir,
  pngCount: count,
  expectedPngCount: plan.proofRequirements.screenshotsPng,
  machineProofGreen: count === plan.proofRequirements.screenshotsPng,
  loops: loops.map((loop) => ({
    id: loop.id,
    title: loop.title,
    verdict: loop.verdict,
  })),
  next: {
    id: next.id,
    title: next.title,
    runCommand: next.runCommand,
    verdictFile: next.verdictFile,
    humanMustJudge: next.humanMustJudge,
  },
};

console.log('');
console.log('# URAI AAA Machine Steering');
console.log(`latestProofDir=${report.latestProofDir || 'none'}`);
console.log(`pngCount=${report.pngCount}/${report.expectedPngCount}`);
console.log(`machineProofGreen=${report.machineProofGreen ? 'yes' : 'no'}`);

console.log('');
console.log('Loop verdicts:');
for (const loop of report.loops) {
  console.log(`- ${loop.id}: ${loop.verdict}`);
}

console.log('');
console.log('NEXT TARGET:');
console.log(`${report.next.id} — ${report.next.title}`);

console.log('');
console.log('RUN:');
console.log(report.next.runCommand);

console.log('');
console.log('HUMAN CHECK AFTER SCREENSHOTS:');
for (const item of report.next.humanMustJudge) {
  console.log(`- ${item}`);
}

const outPath = path.join(root, 'docs/receipts/machine-steering/latest.json');
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log('');
console.log(`Wrote ${outPath}`);
