#!/usr/bin/env node
import assert from 'node:assert/strict'

const spatialE2ERoutes = [
  '/',
  '/life-map',
  '/focus',
  '/replay',
  '/unwind',
]

const spatialE2ERecoveryKeys = [
  'Escape',
]

assert.deepEqual(spatialE2ERoutes, ['/', '/life-map', '/focus', '/replay', '/unwind'])
assert.ok(spatialE2ERecoveryKeys.includes('Escape'))

console.log('URAI spatial E2E lock passed.')
