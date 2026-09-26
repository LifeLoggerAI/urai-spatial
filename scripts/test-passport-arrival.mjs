import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { waitForPassportArrival } from './lib/passport-arrival.mjs'
const requireFromTierOne = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
const { chromium } = requireFromTierOne('playwright')
const vault = '<main data-route-owner="passport-ownership-vault">Passport</main>'
test('Passport receipt waits for mounted destination through a URL-first document handoff', async () => {
  let releaseHandoff
  const handoff = new Promise(resolve => { releaseHandoff = resolve })
  const server = createServer((req, res) => {
    res.setHeader('Content-Type', 'text/html')
    if (req.url === '/release') { handoff.then(() => res.end('ready')); return }
    if (req.url.startsWith('/home')) res.end(`<button onclick="sessionStorage.setItem('urai:home:return-frame:v1', JSON.stringify({destination:'PASSPORT',stage:'intermediate'}));history.pushState({},'', '/passport/');fetch('/release').then(()=>location.replace('/passport/?mounted=1'))">Travel</button>`)
    else res.end(`<script>sessionStorage.setItem('urai:home:return-frame:v1',JSON.stringify({destination:'PASSPORT',stage:'mounted'}))</script><div data-testid="urai-persistent-world-shell">${vault}</div>`)
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const browser = await chromium.launch({headless:true, executablePath:process.env.URAI_PROOF_CHROMIUM_EXECUTABLE_PATH || undefined})
  try {
    const page = await browser.newPage()
    const base = `http://127.0.0.1:${server.address().port}`
    await page.goto(base+'/home/')
    const arrival = waitForPassportArrival(page, 3000)
    await page.getByRole('button', {name:'Travel'}).click()
    await page.waitForURL('**/passport/')
    assert.equal(await page.locator('main').count(),0, 'URL alone prematurely accepts the intermediate Home document')
    releaseHandoff()
    const result = await arrival
    assert.equal(result.pathname, '/passport/')
    assert.deepEqual(result.returnFrame,{destination:'PASSPORT',stage:'mounted'})
    await page.setContent('<div hidden>'+vault+'</div>')
    await assert.rejects(waitForPassportArrival(page, 250), /Timeout/, 'hidden streamed payload cannot establish arrival')
    await page.setContent(`<div data-testid="urai-persistent-world-shell">${vault}${vault}</div>`)
    await assert.rejects(waitForPassportArrival(page, 250), /strict mode violation/, 'duplicate mounted owners remain an error')
  } finally {
    releaseHandoff()
    await browser.close()
    await new Promise(resolve=>server.close(resolve))
  }
})
