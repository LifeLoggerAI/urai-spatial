// Streamed static HTML can retain a hidden Suspense payload outside the mounted
// world. Only the world-owned realm is a navigable application surface. Keep
// strict locator semantics: duplicate mounted worlds/realms must still fail.
export function worldRealm(page, testId) {
  return page.getByTestId('urai-persistent-world-shell').getByTestId(testId)
}
