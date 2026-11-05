"use strict";
const assert=require("node:assert/strict");
const {test}=require("node:test");
const {spawnSync}=require("node:child_process");
const braces=require("../vendor/braces");
const manifest=require("../vendor/braces/package.json");
const guard=error=>error instanceof RangeError&&/supported depth of 64/.test(error.message);
console.log(JSON.stringify({proofScope:"RETAINED_HISTORICAL_VENDOR_SOURCE_ALGORITHMS_ONLY",actualInstalledConsumerAcceptance:false,upstreamFixedReleaseClaim:false,securityWaiver:false,releaseAcceptance:false,productionAcceptance:false}));

test("retained source preserves its explicitly local MIT derivative identity",()=>{
  assert.equal(manifest.version,"3.0.3-urai.spatial.1");assert.equal(manifest.license,"MIT");
});
test("retained source preserves normal escaped patterns and padded numeric expansion",()=>{
  assert.deepEqual(braces.expand("{a,b}-{01..03}"),["a-01","a-02","a-03","b-01","b-02","b-03"]);
  assert.deepEqual(braces("src/**/*.{js,ts,tsx}"),["src/**/*.(js|ts|tsx)"]);
  assert.deepEqual(braces.expand("{a,{b,c}}"),["a","b","c"]);
  assert.equal(braces.stringify("src/{app,{lib,test}}/*.ts"),"src/{app,{lib,test}}/*.ts");
  assert.deepEqual(braces.expand("a\\{b,c\\}"),["a{b,c}"]);
  for(const method of ["parse","compile","expand","stringify"])
    assert.doesNotThrow(()=>braces[method]("{".repeat(63)+"x"+"}".repeat(63)));
  assert.throws(()=>braces.expand("{1..1001}"),/range limit/);
});
test("retained source rejects hostile brace/parenthesis syntax even with caller ceiling overrides",()=>{
  for(const method of ["parse","compile","expand","stringify"])
    for(const [open,close] of [["{","}"],["(",")"]])
      assert.throws(()=>braces[method](open.repeat(4000)+"x"+close.repeat(4000),{maxDepth:Infinity,maxLength:Infinity}),guard,method);
});
test("retained source bounds direct caller AST depth and child cycles",()=>{
  let ast={type:"text",value:"leaf"};
  for(let depth=0;depth<4000;depth++)ast={type:"root",nodes:[ast]};
  for(const method of ["compile","expand","stringify"])assert.throws(()=>braces[method](ast),guard,method);
  const cycle={type:"root",nodes:[]};cycle.nodes.push(cycle);
  for(const method of ["compile","expand","stringify"])assert.throws(()=>braces[method](cycle),guard,method);
});
test("retained source rejects all four public methods before exhausting a small process stack",()=>{
  const entry=require.resolve("../vendor/braces");
  const child=spawnSync(process.execPath,["--stack-size=256","-e",`const a=require('node:assert/strict'),b=require(${JSON.stringify(entry)});for(const m of ['parse','compile','expand','stringify'])a.throws(()=>b[m]('('.repeat(4000)+'x'+')'.repeat(4000)),e=>e instanceof RangeError&&/supported depth of 64/.test(e.message));`],{encoding:"utf8",timeout:5000});
  assert.equal(child.status,0,child.stdout+child.stderr);assert.equal(child.signal,null);
});
