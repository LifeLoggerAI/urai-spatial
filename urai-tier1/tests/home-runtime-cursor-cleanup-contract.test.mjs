import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const runtime = fs.readFileSync('src/app/HomeSpatialRuntimeLayer.tsx', 'utf8')

test('Home spatial runtime resets the global cursor when it unmounts', () => {
  assert.match(runtime, /import \{ useEffect, useState \} from 'react'/)
  assert.match(runtime, /useEffect\(\(\) => \(\) => \{[\s\S]*document\.body\.style\.cursor = 'default'[\s\S]*\}, \[\]\)/)
})
