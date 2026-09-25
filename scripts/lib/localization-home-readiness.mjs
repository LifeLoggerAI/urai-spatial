const HOME_SCENE_SELECTOR = '.urai-asset-home-world[data-home-primary-owner="asset-driven"]'

export async function waitForLocalizationHomeScene(page) {
  const scene = page.locator(HOME_SCENE_SELECTOR).first()
  await scene.waitFor({ state: 'visible', timeout: 45_000 })
  // Canvas creation/capability is not sufficient: the Scene effect publishes
  // this readiness only after its suspended asset subtree has committed.
  await page.waitForFunction((selector) => {
    return document.querySelector(selector)?.getAttribute('data-home-assets-ready') === 'true'
  }, HOME_SCENE_SELECTOR, { timeout: 90_000 })
  return scene
}
