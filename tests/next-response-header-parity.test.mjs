import test from 'node:test'
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { REQUIRED } from '../scripts/check-hosting-response-headers.mjs'

const configUrl=pathToFileURL(resolve('urai-tier1/next.config.mjs')).href

async function nextConfig(mode) {
  const old=process.env.URAI_FIREBASE_STATIC_EXPORT
  try {
    if(mode===null)delete process.env.URAI_FIREBASE_STATIC_EXPORT
    else process.env.URAI_FIREBASE_STATIC_EXPORT=mode
    return (await import(configUrl+'?mode='+encodeURIComponent(mode??'unset'))).default
  } finally {
    if(old===undefined)delete process.env.URAI_FIREBASE_STATIC_EXPORT
    else process.env.URAI_FIREBASE_STATIC_EXPORT=old
  }
}

test('Next dynamic mode applies the canonical minimal header baseline to all paths', async()=>{
  const config=await nextConfig(null)
  assert.equal(typeof config.headers,'function')
  const rules=await config.headers()
  assert.equal(rules.length,1)
  assert.equal(rules[0].source,'/:path*')
  const headers=rules[0].headers
  const values=new Map(headers.map(x=>[x.key.toLowerCase(),x.value]))
  assert.equal(values.size,headers.length)
  for(const [key,value] of REQUIRED)assert.equal(values.get(key),value,key)
  assert.doesNotMatch(values.get('content-security-policy'),/\b(?:script-src|default-src)\b/)
})

test('Firebase static export mode retains export settings without Next response header rules',async()=>{
  const config=await nextConfig('true')
  assert.equal(config.output,'export')
  assert.equal(config.images.unoptimized,true)
  assert.equal(config.trailingSlash,true)
  assert.equal(config.headers,undefined)
})

test('explicit nonstatic flag still applies Next headers',async()=>{
  const config=await nextConfig('false')
  assert.equal(typeof config.headers,'function')
  assert.ok((await config.headers()).length>0)
})
