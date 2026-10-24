import assert from 'node:assert/strict'
import test from 'node:test'
import { assessNativeHttpRoute as accept } from '../scripts/lib/native-http-route-acceptance.mjs'
const check=(path,status,options={})=>accept({path,status,requestedUrl:'http://127.0.0.1:3002'+path,...options})
test('only complete rendered HTML page passes public route',()=>{
 assert.equal(check('/support',200,{contentType:'text/html; charset=utf-8'}).allowed,true)
 for(const value of [null,'application/json','text/plain','text/htmlish'])assert.equal(check('/support',200,{contentType:value}).allowed,false)
 for(const code of [201,202,204,206,304,404,500])assert.equal(check('/support',code,{contentType:'text/html'}).allowed,false)
})
test('signed-out private denial is not accepted as authenticated journey',()=>{
 assert.deepEqual(check('/focus',403,{protectedRoute:true}),{allowed:true,kind:'AUTHORIZED_DENIAL'})
 assert.deepEqual(check('/life-map',307,{protectedRoute:true,redirect:'/login?next=/life-map'}),{allowed:true,kind:'AUTHORIZED_LOGIN_REDIRECT'})
 assert.equal(check('/login',403).allowed,false)
})
test('cross-origin and public redirects are blocked',()=>{
 for(const url of ['http://127.0.0.1:3003/login','https://bad.example/login','//bad.example/login','/'])assert.equal(check('/focus',302,{protectedRoute:true,redirect:url}).allowed,false)
 assert.equal(check('/support',307,{redirect:'/login'}).allowed,false)
})
test('failed network and malformed redirect fail closed',()=>{
 assert.equal(accept({path:'/support',error:'ECONNRESET'}).allowed,false)
 assert.equal(check('/focus',302,{protectedRoute:true,redirect:'http://['}).allowed,false)
})
