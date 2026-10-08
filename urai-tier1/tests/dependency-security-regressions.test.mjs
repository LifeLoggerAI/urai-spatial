import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import { Readable } from 'node:stream'
import test from 'node:test'

const require = createRequire(import.meta.url)
// Retained predecessor algorithms only; current installed ingress is checked separately.
const braces = require('../../vendor/braces')

test('retained historical vendor source: bounded brace walkers preserve ordinary nested patterns and padded ranges', () => {
  assert.deepEqual(braces.expand('{a,b}-{01..03}'), ['a-01', 'a-02', 'a-03', 'b-01', 'b-02', 'b-03'])
  assert.equal(braces.stringify('src/{app,{lib,test}}/*.ts'), 'src/{app,{lib,test}}/*.ts')
  const regex = new RegExp(`^${braces.compile('src/{app,{lib,test}}/file.ts')}$`)
  assert.equal(regex.test('src/lib/file.ts'), true)
  assert.equal(regex.test('src/private/file.ts'), false)
})

test('retained historical vendor source: deep untrusted patterns fail with a bounded validation error without exhausting a small stack', () => {
  const source = `
    const assert = require('node:assert/strict');
    const braces = require(${JSON.stringify(require.resolve('braces'))});
    const input = '{a,'.repeat(2400) + 'b' + '}'.repeat(2400);
    for (const method of ['compile', 'expand', 'stringify']) {
      assert.throws(() => braces[method](input), error => error instanceof RangeError && /supported depth of 64/.test(error.message), method);
    }
  `
  const result = spawnSync(process.execPath, ['--stack-size=256', '-e', source], { encoding: 'utf8', timeout: 5000 })
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`)
  assert.equal(result.signal, null)
})

test('retained historical vendor source: direct AST consumers have the same bounded depth and cycle protection', () => {
  let ast = { type: 'text', value: 'leaf' }
  for (let depth = 0; depth < 200; depth++) ast = { type: 'root', nodes: [ast] }
  for (const method of ['compile', 'expand', 'stringify']) {
    assert.throws(() => braces[method](ast), /supported depth of 64/, method)
  }
  const cycle = { type: 'root', nodes: [] }; cycle.nodes.push(cycle)
  assert.throws(() => braces.compile(cycle), /supported depth of 64/)
})

test('updated CLI parsers preserve duplicate columns without inherited JSON authority', async () => {
  const { parser } = await import('stream-json')
  const { streamValues } = await import('stream-json/streamers/stream-values.js')
  const { parse } = require('csv-parse/sync')
  const values = []
  for await (const row of Readable.from(['{"__proto__":{"isAdmin":true},"name":"synthetic"}']).pipe(parser.asStream()).pipe(streamValues.asStream())) values.push(row.value)
  assert.equal(values[0].isAdmin, undefined)
  assert.equal(Object.hasOwn(values[0], '__proto__'), true)
  const csv = parse('constructor,constructor,name\na,b,synthetic\n', { columns: true, group_columns_by_name: true })
  assert.deepEqual(csv[0].constructor, ['a', 'b'])
  assert.equal(csv[0].name, 'synthetic')
})

test('updated telemetry remains compatible with Pubsub and rejects oversized baggage', () => {
  require('@google-cloud/pubsub/build/src/telemetry-tracing.js')
  const { W3CBaggagePropagator } = require('@opentelemetry/core')
  const api = require('@opentelemetry/api')
  const carrier = { baggage: 'x'.repeat(9000) + '=y' }
  const getter = { keys: value => Object.keys(value), get: (value, key) => value[key] }
  const context = new W3CBaggagePropagator().extract(api.ROOT_CONTEXT, carrier, getter)
  assert.equal(api.propagation.getBaggage(context)?.getAllEntries().length ?? 0, 0)
})
