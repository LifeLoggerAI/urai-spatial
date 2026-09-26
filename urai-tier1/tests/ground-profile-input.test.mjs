import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import * as THREE from 'three'

const source = readFileSync(new URL('../src/app/GroundSpatialWorldClean.tsx', import.meta.url), 'utf8')
const ast = ts.createSourceFile('ground.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const names = new Set(['PROFILES', 'resolveProfile', 'groundHeight', 'buildTerrainGeometry'])
const selected = ast.statements.filter(node => ts.isFunctionDeclaration(node)
  ? names.has(node.name?.text)
  : ts.isVariableStatement(node) && node.declarationList.declarations.some(d => names.has(d.name.getText(ast))))
const context = { THREE, result: null }
vm.runInNewContext(ts.transpileModule(selected.map(node => node.getText(ast)).join('\n')
  + '\nresult = { PROFILES, resolveProfile, buildTerrainGeometry };', {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText, context)
const { PROFILES, resolveProfile, buildTerrainGeometry } = context.result

test('untrusted Ground environment query always resolves to a complete own profile', () => {
  for (const raw of ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'valueOf', '', 'TEMPERATE', 'unknown', null, undefined, {}, 42]) {
    assert.equal(resolveProfile(raw), PROFILES.temperate, `unsafe profile: ${String(raw)}`)
  }
})

test('all five permitted Ground profiles preserve finite terrain and material inputs', () => {
  for (const id of ['temperate', 'urban', 'woodland', 'arid', 'coastal']) {
    const profile = resolveProfile(id)
    assert.equal(profile, PROFILES[id])
    assert.ok(Number.isFinite(profile.roughness))
    assert.ok(profile.textureRepeat.every(x => Number.isFinite(x) && x > 0))
    const geometry = buildTerrainGeometry(profile)
    for (const name of ['position', 'normal', 'color', 'uv', 'uv2']) {
      assert.ok([...geometry.getAttribute(name).array].every(Number.isFinite), `${id}: ${name}`)
    }
    assert.ok(geometry.boundingSphere.radius > 0 && Number.isFinite(geometry.boundingSphere.radius))
    geometry.dispose()
  }
})
