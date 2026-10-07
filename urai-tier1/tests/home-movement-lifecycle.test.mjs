import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'
import { jsx, jsxs } from 'react/jsx-runtime'

const source = fs.readFileSync(new URL('../src/app/HomeAccessibleMovementControls.tsx', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: {module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX} }).outputText
function fixture() {
  const cells=[],effects=[],events=[],queryListeners=new Set();let cursor=0,pathname='/home',fine=true
  const hooks={
    useState:initial=>{const i=cursor++;cells[i]??={value:initial};return[cells[i].value,next=>{cells[i].value=next}]},
    useRef:initial=>{const i=cursor++;cells[i]??={current:initial};return cells[i]},
    useEffect:(operation,deps)=>{const i=cursor++,prior=cells[i];if(!prior||deps.some((value,index)=>!Object.is(value,prior.deps[index])))effects.push(()=>{prior?.cleanup?.();cells[i]={deps,cleanup:operation()}})}
  }
  const module={exports:{}}
  vm.runInNewContext(compiled,{module,exports:module.exports,require:name=>{
    if(name==='react')return hooks
    if(name==='react/jsx-runtime')return{jsx,jsxs}
    if(name==='next/navigation')return{usePathname:()=>pathname}
    throw new Error(name)
  },window:{dispatchEvent:event=>events.push({type:event.type,code:event.code}),addEventListener(){},removeEventListener(){},
    matchMedia:()=>({get matches(){return fine},addEventListener:(_name,listener)=>queryListeners.add(listener),removeEventListener:(_name,listener)=>queryListeners.delete(listener)})},
    document:{addEventListener(){},removeEventListener(){},visibilityState:'visible'},
    KeyboardEvent:class{constructor(type,options){this.type=type;Object.assign(this,options)}}})
  const render=()=>{cursor=0;const tree=module.exports.default();while(effects.length)effects.shift()();return tree}
  const forward=()=>{const tree=render();return tree?.props.children.find?.(node=>node?.props?.['aria-label']==='Move forward')}
  render();render()
  return{events,forward,route:path=>{pathname=path;render()},capability:value=>{fine=value;for(const listener of queryListeners)listener();render()}}
}

test('held Home movement is released on route departure and can be pressed on return',()=>{
  const f=fixture();f.forward().props.onPointerDown();f.route('/focus')
  assert.deepEqual(f.events,[{type:'keydown',code:'KeyW'},{type:'keyup',code:'KeyW'}])
  f.route('/home');f.forward().props.onPointerDown();f.forward().props.onPointerUp()
  assert.deepEqual(f.events.slice(2),[{type:'keydown',code:'KeyW'},{type:'keyup',code:'KeyW'}])
})

test('losing desktop movement capability releases held input without requiring pointer-up',()=>{
  const f=fixture();f.forward().props.onPointerDown();f.capability(false)
  assert.deepEqual(f.events,[{type:'keydown',code:'KeyW'},{type:'keyup',code:'KeyW'}])
  assert.equal(f.forward(),undefined)
  f.capability(true);f.forward().props.onPointerDown()
  assert.equal(f.events.at(-1).type,'keydown')
  assert.equal(f.events.length,3)
})
