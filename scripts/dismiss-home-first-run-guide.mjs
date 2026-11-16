// Real first-run Home onboarding intentionally floats above the world.
// Prove keyboard dismissal and persisted consent to dismiss before measuring
// the unobstructed canvas and no-WebGL fallback. Never pre-seed completion.
export async function dismissHomeFirstRunGuide(page, timeoutMs = 20_000) {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 20_000) {
    throw new Error('Home first-run dismissal requires a bounded deadline')
  }
  const guide = page.locator('aside.uraiV2OnboardingCard[data-home-guide="true"]')
  await guide.waitFor({ state: 'visible', timeout: timeoutMs })
  if (await guide.count() !== 1 || await guide.getAttribute('data-first-run') !== 'automatic') {
    throw new Error('Expected exactly one automatic Home first-run guide')
  }
  const skip = guide.getByRole('button', { name: 'Skip', exact: true })
  await skip.waitFor({ state: 'visible', timeout: timeoutMs })
  await skip.focus()
  if (!await skip.evaluate(element => document.activeElement === element)) {
    throw new Error('Home first-run Skip must receive keyboard focus')
  }
  await page.keyboard.press('Enter')
  await guide.waitFor({ state: 'detached', timeout: timeoutMs })
  const completionPersisted = await page.evaluate(() => localStorage.getItem('urai:onboarding:v2:complete') === '1')
  if (!completionPersisted) throw new Error('Home first-run dismissal did not persist')
  return { guide: 'automatic-home-first-run', input: 'native-keyboard-enter', dismissed: true, completionPersisted }
}
