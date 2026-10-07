#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { verifyProductionAssetReceiptBindings } from './lib/production-asset-receipt-bindings.mjs'

const reportIndex = process.argv.indexOf('--report')
const reportPath = reportIndex < 0 ? 'artifacts/production-asset-receipt-bindings.json' : process.argv[reportIndex + 1]
if (!reportPath) throw new Error('--report requires a path')
const exactHead = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
const report = { exactHead, ...verifyProductionAssetReceiptBindings({ root: process.cwd() }) }
mkdirSync(path.dirname(reportPath), { recursive: true })
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
if (process.env.CANDIDATE_SHA && exactHead !== process.env.CANDIDATE_SHA) throw new Error('Receipt check source differs from expected candidate head.')
if (!report.technicalPass) process.exitCode = 1
