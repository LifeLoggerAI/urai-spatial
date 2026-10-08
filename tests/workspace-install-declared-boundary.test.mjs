import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const script = fileURLToPath(new URL('../scripts/check-workspace-install.mjs', import.meta.url))

function fixture(change = () => {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'urai-declared-workspace-'))
  const write = (name, value) => {
    const full = path.join(root, name)
    fs.mkdirSync(path.dirname(full), { recursive: true })
    fs.writeFileSync(full, value)
  }
  const packageJson = { packageManager:'pnpm@10.0.0', devDependencies:{'firebase-tools':'15.32.1','fill-range':'7.1.1'} }
  write('package.json', JSON.stringify(packageJson))
  write('pnpm-workspace.yaml', 'packages:\n  - urai-tier1\n')
  write('.nvmrc', '22\n')
  write('.node-version', '22\n')
  write('urai-tier1/package.json', JSON.stringify({ dependencies:{next:'15.5.27',react:'19.2.7','react-dom':'19.2.7'},devDependencies:{typescript:'6.0.3',tsx:'4.22.3'} }))
  const module = (importer, name) => {
    write(path.join(importer, 'node_modules', name, 'package.json'),JSON.stringify({name,main:'index.js'}))
    write(path.join(importer, 'node_modules', name, 'index.js'),'export {}\n')
  }
  for (const name of Object.keys(packageJson.devDependencies)) module('',name)
  for (const name of ['next','react','react-dom','typescript','tsx']) module('urai-tier1',name)
  try {
    change({root,write,module,packageJson})
    const result=spawnSync(process.execPath,[script],{cwd:root,encoding:'utf8'})
    assert.equal(result.error,undefined)
    return result
  } finally { fs.rmSync(root,{recursive:true,force:true}) }
}

test('isolated workspace resolves declared root packages and actual tier1 compiler without a root TS hoist',()=>{
  const result=fixture()
  assert.equal(result.status,0,result.stderr)
  assert.match(result.stdout,/Workspace install looks ready/)
})

for (const name of ['firebase-tools','fill-range']) {
  test(`missing declared root ${name} rejects the actual workspace`,()=>{
    const result=fixture(({root})=>fs.rmSync(path.join(root,'node_modules',name),{recursive:true}))
    assert.equal(result.status,1)
    assert.match(result.stderr,/Root workspace dependencies are not installed/)
  })
}

test('an unrelated root compiler cannot replace a missing declared root CLI',()=>{
  const result=fixture(({root,module})=>{
    module('','typescript')
    fs.rmSync(path.join(root,'node_modules','firebase-tools'),{recursive:true})
  })
  assert.equal(result.status,1)
  assert.match(result.stderr,/Root workspace dependencies are not installed/)
})

for (const [importer, dependency, error] of [
  ['', 'fill-range', /Root workspace dependencies are not installed/],
  ['urai-tier1', 'typescript', /Tier1 dependencies are not installed: typescript/],
]) {
  test(`a package outside the installed workspace cannot satisfy ${importer || 'root'} ${dependency}`,()=>{
    const result=fixture(({root,write})=>{
      const dependencyDirectory=path.join(root,importer,'node_modules',dependency)
      fs.rmSync(dependencyDirectory,{recursive:true})
      write('unrelated-package/package.json',JSON.stringify({name:dependency,main:'index.js'}))
      write('unrelated-package/index.js','export {}\n')
      fs.symlinkSync(path.join(root,'unrelated-package'),dependencyDirectory,'dir')
    })
    assert.equal(result.status,1)
    assert.match(result.stderr,error)
  })
}

test('native hoisting remains compatible with complete root declarations',()=>{
  const result=fixture(({root,module})=>{
    module('','typescript')
    fs.rmSync(path.join(root,'urai-tier1','node_modules','typescript'),{recursive:true})
  })
  assert.equal(result.status,0,result.stderr)
})

test('missing tier1 compiler remains a failure',()=>{
  const result=fixture(({root})=>fs.rmSync(path.join(root,'urai-tier1','node_modules','typescript'),{recursive:true}))
  assert.equal(result.status,1)
  assert.match(result.stderr,/Tier1 dependencies are not installed: typescript/)
})

test('a newly declared but uninstalled root dependency fails closed',()=>{
  const result=fixture(({write,packageJson})=>{
    packageJson.devDependencies['uninstalled-dependency']='1.0.0'
    write('package.json',JSON.stringify(packageJson))
  })
  assert.equal(result.status,1)
})

test('empty root dependency declarations fail closed',()=>{
  const result=fixture(({write,packageJson})=>{
    delete packageJson.devDependencies
    write('package.json',JSON.stringify(packageJson))
  })
  assert.equal(result.status,1)
  assert.match(result.stderr,/Root workspace dependency declarations are missing/)
})

test('package-manager pin remains mandatory',()=>{
  const result=fixture(({write,packageJson})=>{
    packageJson.packageManager='pnpm@11.0.0'
    write('package.json',JSON.stringify(packageJson))
  })
  assert.equal(result.status,1)
  assert.match(result.stderr,/pnpm@10\.0\.0/)
})

test('Node22 source pin remains mandatory',()=>{
  const result=fixture(({write})=>write('.node-version','24\n'))
  assert.equal(result.status,1)
  assert.match(result.stderr,/Expected \.node-version to pin Node 22/)
})

test('missing workspace authority file remains a failure',()=>{
  const result=fixture(({root})=>fs.unlinkSync(path.join(root,'pnpm-workspace.yaml')))
  assert.equal(result.status,1)
  assert.match(result.stderr,/Missing expected monorepo file/)
})

test('malformed root manifest remains a retained failure',()=>{
  const result=fixture(({write})=>write('package.json','{malformed'))
  assert.equal(result.status,1)
  assert.match(result.stderr,/Could not read root package\.json/)
})
