import { chromium } from 'playwright'
import fs from 'node:fs/promises'
import path from 'node:path'

const baseUrl = (process.env.URAI_AUDIT_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '')
const exactSha = String(process.env.URAI_PROOF_SOURCE_SHA || process.env.URAI_EXACT_HEAD || '').trim()
const outDir = process.env.URAI_NATIVE_DOORWAY_OUT_DIR || 'native-doorway-proof'
const screenshotDir = path.join(outDir, 'screenshots')
const allowedMethods = new Set(['pointer', 'touch', 'keyboard'])
const forbiddenMethods = /href-fallback|fallback|direct|goto|page\.goto|router-push-from-test|link-follow|extracted-href|unknown/i

if (!/^[0-9a-f]{40}$/.test(exactSha)) {
  throw new Error('URAI_PROOF_SOURCE_SHA or URAI_EXACT_HEAD must be an exact 40-character lowercase hexadecimal SHA')
}

const doorways = [
  {
    id: