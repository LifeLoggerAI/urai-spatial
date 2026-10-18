import {test,expect} from '@playwright/test'
import {mkdirSync,writeFileSync} from 'node:fs'
import {dirname} from 'node:path'
const origin=process.env.URAI_PROOF_BASE_URL||'http://127.0.0.1:4290'
test.use({viewport:{width:1280,height:800},reducedMotion:'no-preference'})
test('original Council v4 real skinned head combines body clips and audio-clock morphs without a second mesh',async({page},info)=>{
 test.setTimeout(240000)
 const errors:string[]=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.goto(new URL('/council?unifiedGuideLab=1',origin).href,{waitUntil:'domcontentloaded',timeout:45000})
 const realm=page.locator('[data-spatial-realm="council"]')
 await expect(realm).toBeVisible({timeout:45000})
 await expect(realm).toHaveAttribute('data-council-unified-guide-lab','true',{timeout:45000})
 await expect(realm).toHaveAttribute('data-digital-human-integration','original-guide-skinned-head-morph-dev-only-not-approved')
 await expect(realm.locator('canvas')).toBeVisible({timeout:45000})
 await expect.poll(async()=>Number(await realm.getAttribute('data-council-unified-guide-morph-bindings')),{timeout:45000}).toBeGreaterThan(0)
 await expect.poll(async()=>Number(await realm.getAttribute('data-council-unified-guide-skinned-owners'))).toBeGreaterThan(0)
 await expect.poll(async()=>Number(await realm.getAttribute('data-council-unified-guide-morph-owners'))).toBeGreaterThan(0)
 await expect(realm).toHaveAttribute('data-council-unified-guide-head-parent','neck')
 await expect.poll(async()=>realm.getAttribute('data-council-idle-active-0')).toBe('true')
 await expect.poll(async()=>realm.getAttribute('data-council-listening-active-0')).toBe('true')
 await expect(page.getByLabel('Council provider')).toBeVisible()
 await expect(page.locator('[data-provider]')).toHaveAttribute('data-provider','idle')
 const lab=page.getByTestId('anonymous-facial-calibration')
 await expect(lab).toBeVisible()
 await expect(lab).toContainText('NOT Council speech')
 const res=await page.request.get(new URL('/__digital-human-dev/council-guide-v4-unified-face-receipt.json',origin).href)
 expect(res.ok()).toBe(true)
 const model=await res.json()
 expect(model.sourceSha256).toBe('fd71bed01e3216b2b60c88a34bb37465ecd49d331f089ccba830e23df1446756')
 expect(model.oneExistingSkinnedMesh).toBe(true)
 expect(model.originalJoints).toBe(17)
 expect(model.originalClips).toBe(5)
 expect(model.derivedMorphChannels).toHaveLength(10)
 const screenshot=async(name:string)=>{
  // Original Chromium compositor pixels, not a separate avatar viewer or mock.
  const originalVisibility=await lab.evaluate((el:HTMLElement)=>{const prior=el.style.visibility;el.style.visibility='hidden';return prior})
  try {
   await page.waitForTimeout(80)
   const session=await page.context().newCDPSession(page)
   try{
    const data=await session.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false})
    const path=info.outputPath(name+'.png');mkdirSync(dirname(path),{recursive:true})
    writeFileSync(path,Buffer.from(data.data,'base64'))
    await info.attach(name,{path,contentType:'image/png'})
   }finally{await session.detach()}
  } finally {await lab.evaluate((el:HTMLElement,prior:string)=>{el.style.visibility=prior},originalVisibility)}
 }
 await screenshot('unified-original-guide-standing-neutral')
 await lab.getByTestId('calibration-slow').click()
 await lab.getByTestId('calibration-play').click()
 await expect.poll(async()=>Number(await realm.getAttribute('data-council-unified-guide-morph-max')),{timeout:20000}).toBeGreaterThan(.3)
 const before=Number(await realm.getAttribute('data-council-unified-guide-audio-seconds'))
 await screenshot('unified-original-guide-audio-driven-morph-and-skeleton')
 const after=Number(await realm.getAttribute('data-council-unified-guide-audio-seconds'))
 expect(after).toBeGreaterThan(before)
 expect(Number(await realm.getAttribute('data-council-unified-guide-morph-max'))).toBeGreaterThan(0)
 await lab.getByTestId('calibration-pause').click()
 await expect.poll(async()=>Number(await realm.getAttribute('data-council-unified-guide-morph-max'))).toBe(0)
 await lab.getByTestId('calibration-play').click()
 await lab.getByTestId('calibration-mute').click()
 await expect.poll(async()=>Number(await realm.getAttribute('data-council-unified-guide-morph-max'))).toBe(0)
 await lab.getByTestId('calibration-mute').click()
 await lab.getByTestId('calibration-freeze').click()
 await lab.getByTestId('calibration-play').click()
 await expect.poll(async()=>Number(await realm.getAttribute('data-council-unified-guide-morph-max'))).toBe(0)
 await lab.getByTestId('calibration-stop').click({force:true,timeout:12000})
 await expect.poll(async()=>Number(await realm.getAttribute('data-council-unified-guide-morph-max'))).toBe(0)
 const evidence={
  classification:'ONE_ORIGINAL_V4_SKINNED_BODY_WITH_DERIVED_FACE_NONRELEASE_ONLY',
  sourceCommit:process.env.URAI_EXACT_HEAD??'unverified',
  sourceGlbSha256:model.sourceSha256,derivedGlbSha256:model.derivedSha256,
  skinnedOwners:await realm.getAttribute('data-council-unified-guide-skinned-owners'),
  morphOwners:await realm.getAttribute('data-council-unified-guide-morph-owners'),
  morphBindings:await realm.getAttribute('data-council-unified-guide-morph-bindings'),
  originalHeadParent:await realm.getAttribute('data-council-unified-guide-head-parent'),
  idle:await realm.getAttribute('data-council-idle-active-0'),
  listening:await realm.getAttribute('data-council-listening-active-0'),
  before,after,errors,voiceCreated:false,founderLikenessUsed:false,productionAccepted:false}
 const target=info.outputPath('unified-original-guide-browser-evidence.json')
 mkdirSync(dirname(target),{recursive:true});writeFileSync(target,JSON.stringify(evidence,null,2))
 await info.attach('unified-original-guide-browser-evidence',{path:target,contentType:'application/json'})
 expect(errors).toEqual([])
})
