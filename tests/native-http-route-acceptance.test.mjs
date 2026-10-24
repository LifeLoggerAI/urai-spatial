import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { assessNativeHttpRoute } from '../scripts/lib/native-http-route-acceptance.mjs';
const base = 'http://127.0.0.1:3210';
const route = (path, status, redirect, protectedRoute = false, contentType = 'text/html; charset=utf-8') =>
  assessNativeHttpRoute({path, status, redirect, protectedRoute, contentType, requestedUrl:base+path});

test('actual public HTML 200 is healthy, but empty 204 is not a rendered page', () => {
  assert.deepEqual(route('/support',200), {allowed:true,kind:'SUCCESS'});
  assert.deepEqual(route('/privacy-policy',204), {allowed:false,reason:'RENDERED_HTML_200_REQUIRED'});
});
test('public route redirect to login does not masquerade as healthy', () => {
  for (const status of [301,302,303,307,308])
    assert.equal(route('/privacy-policy',status,'/login').allowed,false);
});
test('public route redirect to a nonexistent local page fails', () => {
  assert.equal(route('/support',307,'/_not-found').allowed,false);
});
test('same-origin login redirect is an allowed signed-out protected denial', () => {
  assert.deepEqual(route('/life-map',307,'/login?next=/life-map',true),
    {allowed:true,kind:'AUTHORIZED_LOGIN_REDIRECT'});
  assert.deepEqual(route('/focus',302,base+'/login',true),
    {allowed:true,kind:'AUTHORIZED_LOGIN_REDIRECT'});
});
test('external and protocol-relative redirects are denied even from protected routes', () => {
  for (const loc of ['https://elsewhere.example/login','//elsewhere.example/login',
    'http://127.0.0.1:9999/login']) {
    assert.equal(route('/focus',302,loc,true).allowed,false,loc);
  }
});
test('protected redirect to Home or callback outside login is not authentication evidence',()=>{
  assert.equal(route('/replay',302,'/',true).allowed,false);
  assert.equal(route('/replay',302,'/login-pretend',true).allowed,false);
});
test('missing or malformed Location cannot be inferred healthy',()=>{
  for(const loc of [undefined,'','http://['])
    assert.equal(route('/support',302,loc,false).allowed,false);
});
test('unclassified 3xx responses are denied',()=>{
  assert.equal(route('/support',304,'/support').allowed,false);
});
test('protected 401/403 remains an authorized signed-out denial',()=>{
  assert.deepEqual(route('/life-map',401,null,true),{allowed:true,kind:'AUTHORIZED_DENIAL'});
  assert.deepEqual(route('/focus',403,null,true),{allowed:true,kind:'AUTHORIZED_DENIAL'});
  assert.equal(route('/login',403,null,false).allowed,false);
});
test('missing response and server errors fail closed',()=>{
  assert.equal(route('/privacy-policy',500).allowed,false);
  assert.equal(assessNativeHttpRoute({path:'/privacy-policy',error:'ECONNRESET'}).allowed,false);
});
test('same-origin absolute target uses its exact requested port',()=>{
  assert.equal(route('/life-map',308,base+'/login?next=/life-map',true).allowed,true);
});
test('native runner calls the classifier in the real HTTP audit',()=>{
  const source=readFileSync(new URL('../scripts/run-rfinal-native-evidence.mjs',import.meta.url),'utf8');
  assert.match(source,/assessNativeHttpRoute\(/);
  assert.match(source,/redirect: reply\.headers\.get\('location'\) \|\| null/);
  assert.match(source,/requestedUrl: target \+ route/);
  assert.match(source,/contentType: reply\.headers\.get\('content-type'\) \|\| null/);
  assert.match(source,/contentType: result\?\.contentType/);
});
test('HTTP 200 without HTML does not qualify any page route',()=>{
  for (const kind of [null,'application/json','text/plain','image/png','text/htmlish'])
    assert.deepEqual(route('/support',200,null,false,kind),{allowed:false,reason:'RENDERED_HTML_200_REQUIRED'});
  assert.deepEqual(assessNativeHttpRoute({path:'/support',status:200}),{allowed:false,reason:'RENDERED_HTML_200_REQUIRED'});
});
test('partial/accepted responses are not rendered pages',()=>{
  for (const status of [201,202,204,205,206])
    assert.deepEqual(route('/login',status),{allowed:false,reason:'RENDERED_HTML_200_REQUIRED'});
});
test('a protected page still needs HTML when it actually returns 200',()=>{
  assert.deepEqual(route('/life-map',200,null,true,'text/html'),{allowed:true,kind:'SUCCESS'});
  assert.equal(route('/replay',200,null,true,'application/json').allowed,false);
});
