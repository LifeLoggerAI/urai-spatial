import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

const ARTIFACT_DIR = process.env.URAI_GENESIS_ARTIFACT_DIR || 'artifacts/genesis-nine-state'
const PORT = Number(process.env.URAI_GENESIS_PORT || 3013)
const ORIGIN = `http://127.0.0.1:${PORT}`
const EXPECTED = ['home','ascent','life-map','focus','replay','focus','life-map','home']
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
mkdirSync(ARTIFACT_DIR, { recursive:true })
const report = {
  schemaVersion:'urai-genesis-nine-state-trace-2',
  sourceCommit:process.env.URAI_GENESIS_EXACT_SHA || null,
  productionServer:true, browser:'chromium',
  sourceClassification:'disclosed-sample-not-private-user-memory',
  states:[], interactions:[], consoleErrors:[], pageErrors:[], requestFailures:[],
  screenshots:[], trace:'genesis-nine-state.zip', video:null,
  assertion:'NOT_VERIFIED',
}

async function waitForServer(child, timeout=90000) {
  const started=Date.now()
  while(Date.now()-started<timeout) {
    if(child.exitCode!==null) throw Error('Production server exited: '+child.exitCode)
    try {const response=await fetch(ORIGIN);if(response.status<500) return} catch {}
    await sleep(500)
  }
  throw Error('Production server did not become ready')
}
async function expectAttribute(locator,name,value,timeout=30000) {
  await locator.waitFor({state:'attached',timeout})
  const started=Date.now()
  while(Date.now()-started<timeout) {
    if(await locator.getAttribute(name).catch(()=>null)===value) return
    await sleep(150)
  }
  throw Error(`Missing runtime proof ${name}=${value}; received ${await locator.getAttribute(name).catch(()=>null)}`)
}
async function capture(page,state,selector,attribute,value) {
  const node=page.locator(selector).first()
  await expectAttribute(node,attribute,value)
  const index=report.states.length+1
  const filename=`${String(index).padStart(2,'0')}-${state}.png`
  await page.screenshot({path:join(ARTIFACT_DIR,filename),fullPage:true})
  report.states.push({
    position:index, state, url:page.url(), owner:selector,
    evidenceAttribute:attribute, evidenceValue:await node.getAttribute(attribute),
    screenshot:filename,
  })
  report.screenshots.push(filename)
}
async function assertDestination(page,destination,ownerSelector) {
  await expectAttribute(page.getByTestId('urai-persistent-world-shell'),'data-world-destination',destination)
  await capture(page,destination,ownerSelector,'data-testid',
    ownerSelector.includes('final-focus')?'urai-final-focus-chamber':
    ownerSelector.includes('cinematic-replay')?'cinematic-replay-client':
    ownerSelector.includes('r3f-canonical')?'urai-r3f-canonical-lifemap':
    ownerSelector.includes('visible-navigable')?'home-visible-navigable-sanctuary-world':
    'urai-home-accessible-fallback')
}
async function stopServer(child) {
  if(child.exitCode!==null) return
  child.kill('SIGTERM')
  await Promise.race([new Promise(resolve=>child.once('exit',resolve)),sleep(6000)])
  if(child.exitCode===null) child.kill('SIGKILL')
}

const server=spawn('pnpm',['--filter','urai-tier1','start','--port',String(PORT)],{
  env:{...process.env,CI:'1',NEXT_TELEMETRY_DISABLED:'1'},
  cwd:process.cwd(),stdio:'inherit',
})
let browser=null,context=null,page=null
try {
  await waitForServer(server)
  browser=await chromium.launch({headless:true})
  context=await browser.newContext({
    viewport:{width:1440,height:1000},
    recordVideo:{dir:ARTIFACT_DIR,size:{width:1440,height:1000}},
  })
  await context.tracing.start({screenshots:true,snapshots:true,sources:true})
  page=await context.newPage()
  page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push({text:m.text(),url:page.url()})})
  page.on('pageerror',e=>report.pageErrors.push({message:e.message,stack:e.stack}))
  page.on('requestfailed',r=>report.requestFailures.push({url:r.url(),error:r.failure()?.errorText||null}))
  page.on('response',r=>{if(r.status()>=400)report.requestFailures.push({url:r.url(),httpStatus:r.status()})})

  await page.goto(`${ORIGIN}/home`,{waitUntil:'domcontentloaded'})
  const home=page.getByTestId('home-visible-navigable-sanctuary-world')
  await expectAttribute(home,'data-home-input-ready','true',90000)
  await assertDestination(page,'home','[data-testid="home-visible-navigable-sanctuary-world"]')
  report.interactions.push({action:'home-loaded',cameraMode:await home.getAttribute('data-home-camera-mode')})

  // Pointer taps on the real visible Three.js sky are the production ascent
  // gesture. No internal events, store writes, or synthetic phase injection.
  const canvas=home.locator('canvas').first()
  const bounds=await canvas.boundingBox()
  if(!bounds||bounds.width<50||bounds.height<50)throw Error('HOME_CANVAS_NOT_ACTIONABLE')
  let startedAscent=false
  for(const [xr,yr] of [[.5,.12],[.35,.1],[.65,.12],[.5,.22]]) {
    const x=bounds.x+bounds.width*xr,y=bounds.y+bounds.height*yr
    await page.mouse.click(x,y)
    report.interactions.push({action:'real-home-sky-pointer-tap',x,y})
    try {
      await expectAttribute(home,'data-home-scene-phase','ASCENT',1400)
      startedAscent=true
      break
    } catch {}
  }
  if(!startedAscent)throw Error('GENESIS_ASCENT_NOT_OBSERVED_AFTER_REAL_SKY_TAPS')
  await expectAttribute(home,'data-home-camera-mode','ascent',3000)
  await capture(page,'ascent','[data-testid="home-visible-navigable-sanctuary-world"]','data-home-scene-phase','ASCENT')
  const progress=Number(await home.getAttribute('data-home-ascent-progress'))
  report.interactions.push({action:'ascent-camera',progress,sequence:await home.getAttribute('data-home-portal-sequence')})
  await expectAttribute(page.getByTestId('urai-persistent-world-shell'),'data-world-destination','life-map',30000)
  await page.getByRole('button',{name:'Open disclosed sample'}).first().click({timeout:15000})
  await expectAttribute(page.getByTestId('urai-r3f-canonical-lifemap'),'data-life-map-access','explicit-demo',30000)
  await assertDestination(page,'life-map','[data-testid="urai-r3f-canonical-lifemap"]')

  await page.getByTestId('life-map-semantic-trigger').click({timeout:12000})
  const star=page.locator('[data-life-map-semantic-result]').first()
  await star.waitFor({state:'visible',timeout:25000})
  const starId=await star.getAttribute('data-life-map-node-id')
  if(!starId)throw Error('MEMORY_STAR_ID_REQUIRED')
  await star.click()
  const inspector=page.locator('.life-map-semantic-inspector').first()
  await inspector.waitFor({state:'visible',timeout:20000})
  report.interactions.push({action:'real-semantic-memory-star-selection',starId,source:'disclosed-sample'})
  await inspector.locator('nav.semantic-thresholds button').first().click()
  await assertDestination(page,'focus','[data-testid="urai-final-focus-chamber"]')
  const focus=page.getByTestId('urai-final-focus-chamber')
  await expectAttribute(focus,'data-memory-status','demo',30000)
  const replay=page.locator('.focusControls button.primary').first()
  await replay.waitFor({state:'visible',timeout:20000})
  await replay.click()
  await assertDestination(page,'replay','[data-testid="cinematic-replay-client"]')
  await expectAttribute(page.getByTestId('cinematic-replay-client'),'data-memory-status','demo',30000)

  report.interactions.push({action:'Escape',from:'replay'})
  await page.keyboard.press('Escape')
  await assertDestination(page,'focus','[data-testid="urai-final-focus-chamber"]')
  report.interactions.push({action:'Escape',from:'focus'})
  await page.keyboard.press('Escape')
  await assertDestination(page,'life-map','[data-testid="urai-r3f-canonical-lifemap"]')
  report.interactions.push({action:'Escape',from:'life-map'})
  await page.keyboard.press('Escape')
  await assertDestination(page,'home','[data-testid="home-visible-navigable-sanctuary-world"]')

  if(JSON.stringify(report.states.map(x=>x.state))!==JSON.stringify(EXPECTED))
    throw Error('GENESIS_STATE_SEQUENCE_MISMATCH')
  if(report.consoleErrors.length||report.pageErrors.length||report.requestFailures.length)
    throw Error('GENESIS_BROWSER_RESOURCE_OR_CONSOLE_ERRORS: '+JSON.stringify({
      consoleErrors:report.consoleErrors,pageErrors:report.pageErrors,requestFailures:report.requestFailures,
    }))
  report.assertion='PASS'
} catch(error) {
  report.error=error instanceof Error?error.stack||error.message:String(error)
  report.assertion='FAIL'
  throw error
} finally {
  if(page) {
    report.lastUrl=page.url()
    report.lastView={
      title:await page.title().catch(()=>null),
      world:await page.getByTestId('urai-persistent-world-shell').getAttribute('data-world-destination').catch(()=>null),
      homePhase:await page.getByTestId('home-visible-navigable-sanctuary-world').getAttribute('data-home-scene-phase').catch(()=>null),
      visibleText:(await page.locator('body').innerText().catch(()=>'' )).slice(0,1800),
    }
    if(report.assertion==='FAIL') {
      await page.screenshot({path:join(ARTIFACT_DIR,'failure-last-frame.png'),fullPage:true}).catch(()=>{})
      report.screenshots.push('failure-last-frame.png')
    }
  }
  if(context) {
    await context.tracing.stop({path:join(ARTIFACT_DIR,report.trace)}).catch(e=>{report.traceError=String(e);report.assertion='FAIL'})
    const video=page?.video()
    await context.close().catch(()=>{})
    if(video)report.video=await video.path().catch(()=>null)
  }
  if(browser)await browser.close().catch(()=>{})
  await stopServer(server)
  writeFileSync(join(ARTIFACT_DIR,'genesis-nine-state-report.json'),JSON.stringify(report,null,2))
}
