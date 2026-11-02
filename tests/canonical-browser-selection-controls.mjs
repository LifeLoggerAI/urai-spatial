// The semantic result and the world threshold are different, independently
// owned controls. Resolve the exact accessible result, then enter Focus using
// the selected world's real threshold after camera arrival.
export const DISCLOSED_SAMPLE_STAR_SELECTOR = '#life-map-navigator button[data-life-map-semantic-result][data-life-map-node-id="quiet-reset"]'
export const SELECTED_MEMORY_FOCUS_SELECTOR = '.life-map-thresholds[aria-label="Selected memory actions"] button.focus-threshold'

export function disclosedSampleStar(page) {
  return page.locator(DISCLOSED_SAMPLE_STAR_SELECTOR)
}

export function selectedMemoryFocusAction(page) {
  return page.locator(SELECTED_MEMORY_FOCUS_SELECTOR)
}
