import { spawnSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const runnerPath = path.resolve('scripts/capture-lifemap-founder-proof-fixed.mjs')
const syntax = spawnSync(process.execPath, ['--check', runnerPath], { encoding: 'utf8' })
if (syntax.status !== 0) {
  const detail = [syntax.stdout, syntax.stderr].filter(Boolean).join('\n').trim()
  throw new Error(`Checked-in Founder capture runner failed syntax validation${detail ? `:\n${detail}` : ''}`)
}

console.log(`FOUNDER_CAPTURE_SYNTAX_OK ${runnerPath}`)
if (!process.argv.includes('--validate-only')) {
  await import(pathToFileURL(runnerPath).href)
  const proofDir = path.resolve(process.env.URAI_PROOF_DIR || 'artifacts/lifemap-founder-proof')
  const receiptPath = path.join(proofDir, 'receipt.json')
  const receipt = JSON.parse(await readFile(receiptPath, 'utf8'))
  const rawPr = String(process.env.URAI_PR_NUMBER || '').trim()
  const pr = rawPr ? Number.parseInt(rawPr, 10) : null
  if (pr !== null && (!Number.isInteger(pr) || pr <= 0)) throw new Error(`Invalid URAI_PR_NUMBER: ${rawPr}`)
  receipt.pr = pr
  receipt.repository = 'LifeLoggerAI/urai-spatial'
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8')
  console.log(`FOUNDER_RECEIPT_PR_BOUND ${pr ?? 'none'}`)
}
