// Match either real signed-out route surface. Neither can carry mounted private memories.
export const SIGNED_OUT_LIFEMAP_SELECTOR = [
  '[data-testid="urai-r3f-canonical-lifemap"][data-life-map-access="signed-out"]',
  '[data-testid="urai-life-map-signed-out-threshold"][data-life-map-source="signed-out"]',
].join(', ')

export function selectSignedOutLifeMapGate(page) {
  return page.locator(SIGNED_OUT_LIFEMAP_SELECTOR)
}
