import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'
import { jsx,jsxs } from 'react/jsx-runtime'
import { contentLanguage,contentLanguageProps } from '../../packages/localization/src/contentLanguage.ts'

const source=fs.readFileSync(new URL('../src/spatial/adam/AdamPresenceRuntime.tsx',import.meta.url),'utf8')
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText
const text=node=>typeof node==='string'?node:Array.isArray(node)?node.map(text).join(''):node?.props?text(node.props.children):''
const tick=async()=>{for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve))}
function fixture(){
  const cells=[],requests=[],voices=[],audio=[];let cursor=0,locale='en-US',resolve,reject
  const hooks={useState:initial=>{const i=cursor++;cells[i]??={value:initial};return [cells[i].value,next=>{cells[i].value=typeof next==='function'?next(cells[i].value):next}]},
    useRef:initial=>{const i=cursor++;cells[i]??={current:initial};return cells[i]},useCallback:fn=>fn,useEffect:()=>{cursor++}}
  class AdamProviderError extends Error{}
  const client={AdamProviderError,requestAdamPresence:input=>{requests.push(input);return new Promise((yes,no)=>{resolve=yes;reject=no})},
    requestAdamFounderVoice:async input=>{voices.push(input);return {blob:new Blob(['synthetic-audio']),errorCode:null}}}
  const module={exports:{}}
  vm.runInNewContext(compiled,{module,exports:module.exports,require:name=>{
    if(name==='react')return hooks
    if(name==='react/jsx-runtime')return {jsx,jsxs}
    if(name==='react-dom')return {createPortal:child=>child}
    if(name==='next/navigation')return {usePathname:()=>'/home',useSearchParams:()=>({get:()=>null})}
    if(name.endsWith('/localePreference'))return {currentSpeechTag:()=>locale}
    if(name.endsWith('/contentLanguage'))return {contentLanguage,contentLanguageProps}
    if(name==='./adamClient')return client
    if(name==='./adamSurfaceContext')return {resolveAdamSurface:()=>({id:'home',label:'Home'})}
    if(name.endsWith('.module.css'))return {}
    throw Error('Unexpected Adam dependency '+name)
  },AbortController,crypto:{randomUUID:()=>String(cells.length)},URL:{createObjectURL:()=> 'blob:synthetic',revokeObjectURL:()=>{}},
  Audio:class{constructor(){audio.push(this)}play(){return Promise.resolve()}pause(){this.paused=true}}})
  const render=()=>{cursor=0;return module.exports.default()}
  const find=predicate=>{const visit=node=>{if(Array.isArray(node)){for(const n of node){const hit=visit(n);if(hit)return hit}}
    else if(node?.props){if(predicate(node))return node;return visit(node.props.children)}return null};return visit(render())}
  const open=()=>find(node=>node.type==='button').props.onClick()
  const consent=()=>{const inputs=[];find(node=>{if(node.type==='input')inputs.push(node);return false});for(const input of inputs)input.props.onChange({target:{checked:true}})}
  const send=async()=>{find(node=>node.type==='textarea').props.onChange({target:{value:'Synthetic question'}});void find(node=>node.type==='form').props.onSubmit({preventDefault(){}});await tick()}
  return {find,render,open,consent,send,requests,voices,audio,setLocale:next=>{locale=next},complete:result=>resolve(result),fail:()=>reject(new AdamProviderError('Synthetic rejection'))}
}
test('actual Adam stream, caption and queued private voice retain captured Urdu after preference changes',async()=>{
  const f=fixture();f.open();f.consent();f.setLocale('ur-PK');await f.send();f.setLocale('fr-FR')
  const message='Synthetic generated sentence long enough.'
  f.requests[0].onEvent({type:'delta',text:message,locale:'ur-PK'});await tick()
  const streamed=f.find(node=>node.type==='div'&&text(node)===message&&node.props.lang)
  assert.equal(streamed.props.lang,'ur-PK');assert.equal(streamed.props.dir,'rtl')
  f.complete({caption:message,locale:'ur-PK',requiresHumanFounder:false,handoffReason:''});await tick()
  assert.equal(f.requests[0].locale,'ur-PK');assert.equal(f.voices[0].locale,'ur-PK');assert.equal(f.audio[0].lang,'ur-PK')
  assert.equal(f.find(node=>node.type==='div'&&text(node)===message&&node.props.lang).props.lang,'ur-PK')
})
test('actual Adam clears private audio and queued speech if streamed completion fails',async()=>{
  const f=fixture();f.open();f.consent();await f.send()
  f.requests[0].onEvent({type:'delta',text:'Synthetic valid prefix long enough.',locale:'en-US'});await tick()
  f.fail();await tick();assert.equal(f.audio[0].paused,true);assert.equal(f.voices[0].signal.aborted,true)
  assert.equal(text(f.render()).includes('Synthetic valid prefix'),false)
  f.setLocale('ar-SA');await f.send()
  f.requests[1].onEvent({type:'delta',text:'Synthetic next sentence long enough.',locale:'ar-SA'});await tick()
  assert.equal(f.voices.length,2);assert.equal(f.voices[1].locale,'ar-SA');assert.equal(f.audio[1].lang,'ar-SA')
})
test('actual Adam rejects unsupported content preference before conversation or private voice',async()=>{
  const f=fixture();f.open();f.consent();f.setLocale('xx-XX');await f.send()
  assert.equal(f.requests.length,0);assert.equal(f.voices.length,0);assert.ok(text(f.render()).includes('Choose a supported content language.'))
})
