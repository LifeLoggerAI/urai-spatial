// This function is serialized into the browser by Playwright addInitScript.
export function installDoorwayEventTrace() {
  const append = (record) => { void window.__uraiRecordDoorwayEvent(record).catch(() => {}) }
  for (const type of ['keydown', 'keyup', 'click', 'focusin']) {
    window.addEventListener(type, (event) => {
      const target = event.target instanceof Element ? event.target.closest('[data-testid]') : null
      const testId = target?.getAttribute('data-testid') || ''
      if (!testId.startsWith('home-semantic-')) return
      const record = { type, testId, key: ['Enter', ' '].includes(event.key) ? event.key : '', defaultPrevented: event.defaultPrevented }
      // A later task runs after target/bubble handlers, including React cancellation.
      setTimeout(() => append({ ...record, defaultPrevented: event.defaultPrevented, activeTestId: document.activeElement?.getAttribute('data-testid') || '', pathname: location.pathname }), 0)
    }, true)
  }
  window.addEventListener('urai:world-travel', (event) => {
    append({ type: 'world-travel', destination: event.detail?.destination || '', pathname: location.pathname })
  })
}
