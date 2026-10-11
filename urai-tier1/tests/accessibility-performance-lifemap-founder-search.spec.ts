import { expect, test, type Locator } from '@playwright/test'

async function reachableTarget(control: Locator) {
  const bounds = await control.evaluate(element => {
    const r = element.getBoundingClientRect()
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
    return { x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,viewportWidth:innerWidth,viewportHeight:innerHeight,reachable:hit===element||element.contains(hit) }
  })
  expect(bounds.width).toBeGreaterThanOrEqual(48)
  expect(bounds.height).toBeGreaterThanOrEqual(48)
  expect(bounds.x).toBeGreaterThanOrEqual(0)
  expect(bounds.y).toBeGreaterThanOrEqual(0)
  expect(bounds.right).toBeLessThanOrEqual(bounds.viewportWidth)
  expect(bounds.bottom).toBeLessThanOrEqual(bounds.viewportHeight)
  expect(bounds.reachable).toBe(true)
  return bounds
}

for (const profile of [
  { name:'desktop pointer',viewport:{width:1440,height:900},touch:false },
  { name:'mobile touch',viewport:{width:390,height:844},touch:true },
]) {
  test.describe(profile.name, () => {
    test.use({viewport:profile.viewport,hasTouch:profile.touch,isMobile:profile.touch})
    test('Founder Close and Escape preserve Search and restore each owning focus target', async ({page}) => {
      const errors:string[]=[]
      const failedRequests:string[]=[]
      page.on('pageerror',error=>errors.push(error.message))
      page.on('requestfailed',request=>failedRequests.push(request.url()+': '+request.failure()?.errorText))
      await page.addInitScript(() => {
        localStorage.setItem('urai:onboarding:v2:complete','1')
        localStorage.setItem('urai:onboarding:v3:setup-complete','1')
      })
      await page.goto('/life-map?demo=1&overview=1',{waitUntil:'domcontentloaded'})
      const world=page.getByTestId('urai-true-3d-life-map')
      await expect(world).toHaveAttribute('data-life-map-source','explicit-demo')
      await expect(world).toHaveAttribute('data-life-map-render-ready','true')
      await expect(world).toHaveAttribute('data-webgl-state','ready')
      const originalUrl=page.url()
      const trigger=page.getByRole('button',{name:'Search and navigate Life Map',exact:true})
      const launcher=page.locator('[data-urai-adam-launcher]')
      const search=page.getByRole('region',{name:'Search and filter Life Map',exact:true})
      const panel=page.getByRole('complementary',{name:'Adam founder presence',exact:true})
      const activate=async(control:Locator)=>{await reachableTarget(control);if(profile.touch)await control.tap();else await control.click()}
      await activate(trigger)
      await expect(search).toBeVisible()
      const launcherBounds=await reachableTarget(launcher)
      await activate(launcher)
      await expect(panel).toBeVisible()
      const close=panel.getByRole('button',{name:'Close Adam',exact:true})
      const closeBounds=await reachableTarget(close)
      await activate(close)
      await expect(panel).toHaveCount(0)
      await expect(search).toBeVisible()
      await expect(launcher).toBeFocused()
      expect(page.url()).toBe(originalUrl)
      await activate(launcher)
      await expect(panel).toBeVisible()
      await expect(close).toBeFocused()
      await page.keyboard.press('Escape')
      await expect(panel).toHaveCount(0)
      await expect(search).toBeVisible()
      await expect(launcher).toBeFocused()
      expect(page.url()).toBe(originalUrl)
      await page.keyboard.press('Escape')
      await expect(search).toHaveCount(0)
      await expect(trigger).toBeFocused()
      await expect(world).toHaveAttribute('data-life-map-phase','overview')
      expect(page.url()).toBe(originalUrl)
      expect(errors).toEqual([])
      expect(failedRequests).toEqual([])
      await test.info().attach('founder-search-targets.json',{body:JSON.stringify({profile,launcherBounds,closeBounds,originalUrl}),contentType:'application/json'})
      await test.info().attach('founder-search-focus-restored.png',{body:await page.screenshot(),contentType:'image/png'})
    })
  })
}
