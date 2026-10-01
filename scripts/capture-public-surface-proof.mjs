import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const base = process.env.URAI_PUBLIC_SURFACE_BASE || 'http://127.0.0.1:4176'
const exactHead = String(process.env.URAI_EXACT_HEAD || '').trim()
if (!/^[0-9a-f]{40}$/.test(exactHead)) throw new Error('URAI_EXACT_HEAD must be a 40-character SHA')

const outputDir = path.resolve(process.env.URAI_PUBLIC_SURFACE_OUTPUT || 'public-surface-proof')
await mkdir(outputDir, { recursive: true })

const routes = [
  ['/about/', 'A life you can move through.'],
  ['/contact/', 'Reach the right door.'],
  ['/event/', 'See the system without overstating it.'],
  ['/glass/', 'Move from screen to space.'],
  ['/offline/', 'Your way back stays visible.'],
  ['/report-bug/', 'Tell us what broke.'],
  ['/support/', 'Help when you need it.'],
]

const viewports = [
  { id:'desktop', width:1440, height:900, isMobile:false, hasTouch:false },
  { id:'mobile', width:390, height:844, isMobile:true, hasTouch:true },
]

const receipt = { schemaVersion:'urai-public-surface-proof-1', exactHead, capturedAt:new Date().toISOString(), captures:[], redirects:[], errors:[] }
const fileSafe = route => route.replace(/^\\/+|\\/+$/g,'').replaceAll('/','-') || 'root'
const browser = await chromium.launch({ headless:true })

try {
  for (const vp of viewports) {
    const context = await browser.newContext({ viewport:{ width:vp.width, height:vp.height }, isMobile:vp.isMobile, hasTouch:vp.hasTouch })
    for (const [route, heading] of routes) {
      const page = await context.newPage()
      const diagnostics = { consoleErrors:[], pageErrors:[], failedRequests:[] }
      page.on('console', m => { if (m.type() === 'error') diagnostics.consoleErrors.push(m.text()) })
      page.on('pageerror', e => diagnostics.pageErrors.push(String(e)))
      page.on('requestfailed', req => {
        let sameOrigin = false
        try { sameOrigin = new URL(req.url()).origin === new URL(base).origin } catch {}
        const failure = req.failure()?.errorText || 'unknown'
        if (sameOrigin && failure !== 'net::ERR_ABORTED') diagnostics.failedRequests.push({ url:req.url(), failure })
      })

      const response = await page.goto(new URL(route, base).href, { waitUntil:'networkidle', timeout:45000 })
      if (!response || response.status() >= 400) throw new Error(`${route} returned ${response?.status() ?? 'no-response'}`)
      await page.getByRole('heading', { level:1, name:heading }).waitFor({ state:'visible', timeout:15000 })
      const main = page.locator('main')
      await main.waitFor({ state:'visible', timeout:15000 })
      const actionCount = await page.getByRole('navigation', { name:'Page actions' }).getByRole('link').count()
      if (actionCount < 2) throw new Error(`${route} has fewer than two actions`)
      const geometry = await main.evaluate(el => {
        const r = el.getBoundingClientRect()
        return { left:r.left, right:r.right, viewportWidth:innerWidth, scrollWidth:document.documentElement.scrollWidth }
      })
      if (geometry.left < -1 || geometry.right > geometry.viewportWidth + 1 || geometry.scrollWidth > geometry.viewportWidth + 1) throw new Error(`${route} overflows ${vp.id}`)
      if (diagnostics.consoleErrors.length || diagnostics.pageErrors.length || diagnostics.failedRequests.length) throw new Error(`${route} diagnostics failed: ${JSON.stringify(diagnostics)}`)
      const file = `${fileSafe(route)}-${vp.id}-${exactHead.slice(0,12)}.png`
      await page.screenshot({ path:path.join(outputDir,file), fullPage:true })
      receipt.captures.push({ route, heading, viewport:vp.id, file, actionCount, geometry, diagnostics })
      await page.close()
    }
    await context.close()
  }

  const context = await browser.newContext({ viewport:{ width:1280, height:800 } })
  const page = await context.newPage()
  const response = await page.goto(new URL('/ascent/life-map/', base).href, { waitUntil:'networkidle', timeout:45000 })
  const finalUrl = new URL(page.url())
  if (!response || response.status() >= 400) throw new Error('/ascent/life-map failed')
  if (!['/life-map','/life-map/'].includes(finalUrl.pathname) || finalUrl.searchParams.get('from') !== 'ascent-life-map') throw new Error(`bad compatibility redirect: ${page.url()}`)
  receipt.redirects.push({ route:'/ascent/life-map/', finalUrl:page.url(), status:response.status() })
  await context.close()
} catch (error) {
  receipt.errors.push({ message:String(error), stack:error?.stack || null })
} finally {
  await browser.close()
}

await writeFile(path.join(outputDir,'receipt.json'), JSON.stringify(receipt,null,2)+'\\n')
console.log(JSON.stringify(receipt,null,2))
if (receipt.errors.length) process.exit(1)
