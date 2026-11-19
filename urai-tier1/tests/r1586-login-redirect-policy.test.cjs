'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const vm=require('node:vm')
const ts=require('typescript')
const source=fs.readFileSync(path.join(__dirname,'../src/app/login/popupRedirectPolicy.ts'),'utf8')
const script=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
const mod={exports:{}}
vm.runInNewContext('(function(exports,module){'+script+'})')(mod.exports,mod)
const accepts=mod.exports.popupRequiresFullPageRedirect
for(const code of ['auth/popup-blocked','auth/operation-not-supported-in-this-environment']){
  test('Redirect fallback permitted only for '+code,()=>assert.equal(accepts({code}),true))
}
for(const error of [
  {code:'auth/popup-closed-by-user'},
  {code:'auth/invalid-credential'},
  {code:'auth/network-request-failed'},
  {code:'auth/user-disabled'},
  {code:'auth/unauthorized-domain'},
  {code:'auth/cancelled-popup-request'},
  {code:'auth/account-exists-with-different-credential'},
  null,{},'auth/popup-blocked',{code:[]},{code:1}
]){
  test('No automatic full-page retry for '+JSON.stringify(error),()=>assert.equal(accepts(error),false))
}
test('Login only redirects as fallback for approved errors; authenticated redirect result required',()=>{
 const login=fs.readFileSync(path.join(__dirname,'../src/app/login/LoginClient.tsx'),'utf8')
 assert.match(login,/if \(popupRequiresFullPageRedirect\(error\)\) \{\s*await enterFullPage\(\)/)
 assert.match(login,/getRedirectResult\(auth\)\.catch/)
 assert.match(login,/await signInWithRedirect\(getUrAiAuth\(\), googleProvider\(\)\)/)
 assert.match(login,/disabled=\{state==='unavailable'\|\|state==='working'\}/)
 assert.match(login,/Your private world remains closed/)
})
