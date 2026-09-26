/** URL changes can precede the final document in a client-to-document handoff.
 * Read the return frame only from the visible mounted Passport owner, within
 * the existing 45-second arrival budget. Keep duplicate owners a strict error.
 */
export async function waitForPassportArrival(page, timeout = 45_000) {
  const deadline = Date.now() + timeout
  const remaining = () => Math.max(1, deadline - Date.now())
  await page.waitForURL((url) => url.pathname.replace(/\/+$/, '') === '/passport', {
    timeout: remaining(), waitUntil: 'domcontentloaded',
  })
  const passport = page.getByTestId('urai-persistent-world-shell')
    .locator('main[data-route-owner="passport-ownership-vault"]')
  await passport.waitFor({ state: 'visible', timeout: remaining() })
  return passport.evaluate(() => {
    if (window.location.pathname.replace(/\/+$/, '') !== '/passport') {
      throw new Error('Passport owner mounted at an unexpected route')
    }
    const raw = window.sessionStorage.getItem('urai:home:return-frame:v1')
    let returnFrame = null
    if (raw) {
      try { returnFrame = JSON.parse(raw) } catch { returnFrame = { parseError: true } }
    }
    return { pathname: window.location.pathname, returnFrame }
  }, undefined, { timeout: remaining() })
}
