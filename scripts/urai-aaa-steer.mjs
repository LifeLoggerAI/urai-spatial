#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const root = process.cwd()
const planPath = path.join(root, 'docs/aaa-machine/steering-plan.json')

function exists(target) {
  return fs.existsSync(target)
}

function readJson(target) {
  return JSON.parse(fs.readFileSync(target, 'utf8'))
}

function latestProofDir(prefix) {
  const receipts = path.join(os.homedir(), 'urai-final-receipts')
  if (!exists(receipts)) return null

  return fs.readdirSync(receipts)
    .filter((name) => name.startsWith(prefix))
    .map((name) => path.join(receipts, name))
    .filter((target) => fs.statSync(target).isDirectory())
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null
}

function pngCount(proofDir, screenshotDirectory) {
  if (!proofDir) return 0
  const directory = path.join(proofDir, screenshotDirectory)
  if (!exists(directory)) return 0
  return fs.readdirSync(directory).filter((name) => name.endsWith('.png')).length
}

function proofReceipt(proofDir, receiptFile) {
  if (!proofDir) return null
  const target = path.join(proofDir, receiptFile)
  if (!exists(target)) return null
  try {
    return readJson(target)
  } catch {
    return null
  }
}

function verdictStatus(file) {
  const target = path.join(root, file)
  if (!exists(target)) return 'missing'
  const text = fs.readFileSync(target, 'utf8')
  if (/VERDICT:\s*PASS/i.test(text)) return 'pass'
  if (/VERDICT:\s*FAIL/i.test(text)) return 'fail'
  if (/VERDICT:\s*REVIEW/i.test(text)) return 'review'
  return 'unknown'
}

if (!exists(planPath)) {
  console.error('Missing docs/aaa-machine/steering-plan.json')
  process.exit(1)
}

const plan = readJson(planPath)
const contract = plan.receiptContract || {}
const directoryPrefix = contract.directoryPrefix || 'aaa-launch-proof-'
const receiptFile = contract.receiptFile || 'receipt.json'
const screenshotDirectory = contract.screenshotDirectory || 'live-visual-audit/screenshots'
const proofDir = latestProofDir(directoryPrefix)
const receipt = proofReceipt(proofDir, receiptFile)
const count = pngCount(proofDir, screenshotDirectory)
const expectedPngCount = Number(plan.proofRequirements?.screenshotsPng || 0)

const loops = plan.loops.map((loop) => ({
  ...loop,
  verdict: verdictStatus(loop.verdictFile),
}))

const next = loops.find((loop) => loop.verdict !== 'pass') || loops[loops.length - 1]
const receiptSafe = Boolean(
  receipt &&
  receipt.status === 'passed' &&
  receipt.productionDeploymentAttempted === false &&
  receipt.productionDeploymentAuthority === contract.productionAuthority
)

const report = {
  generatedAt: new Date().toISOString(),
  planVersion: plan.version,
  latestProofDir: proofDir,
  receiptStatus: receipt?.status || 'missing',
  receiptLoopName: receipt?.loopName || null,
  productionDeploymentAttempted: receipt?.productionDeploymentAttempted ?? null,
  productionDeploymentAuthority: receipt?.productionDeploymentAuthority || null,
  pngCount: count,
  expectedPngCount,
  screenshotDirectory,
  machineProofGreen: receiptSafe && count === expectedPngCount,
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
}

console.log('')
console.log('# URAI AAA Machine Steering')
console.log(`latestProofDir=${report.latestProofDir || 'none'}`)
console.log(`receiptStatus=${report.receiptStatus}`)
console.log(`pngCount=${report.pngCount}/${report.expectedPngCount}`)
console.log(`machineProofGreen=${report.machineProofGreen ? 'yes' : 'no'}`)

console.log('')
console.log('Loop verdicts:')
for (const loop of report.loops) {
  console.log(`- ${loop.id}: ${loop.verdict}`)
}

console.log('')
console.log('NEXT TARGET:')
console.log(`${report.next.id} — ${report.next.title}`)

console.log('')
console.log('RUN:')
console.log(report.next.runCommand)

console.log('')
console.log('HUMAN CHECK AFTER SCREENSHOTS:')
for (const item of report.next.humanMustJudge) {
  console.log(`- ${item}`)
}

const outputDirectory = path.join(root, 'docs/receipts/machine-steering')
fs.mkdirSync(outputDirectory, { recursive: true })
const outPath = path.join(outputDirectory, 'latest.json')
fs.writeFileSync(outPath, JSON.stringify(report, null, 2))
console.log('')
console.log(`Wrote ${outPath}`)
