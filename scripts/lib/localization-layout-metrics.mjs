export function readLocalizationLayoutMetrics() {
    const root = document.documentElement
    const body = document.body
    const interactive = Array.from(document.querySelectorAll('button,a,[role="button"],summary'))
      .filter((node) => node instanceof HTMLElement)
      .map((node) => {
        const rect = node.getBoundingClientRect()
        const style = getComputedStyle(node)
        const opacity = Number.parseFloat(style.opacity || '1')
        // CSS clipping, not transformed bounds, determines whether sr-only
        // world controls paint pixels. Perspective can magnify their 1px box.
        const clipEdges = [...String(style.clip).matchAll(/(-?(?:\d*\.)?\d+)px/g)].map((match) => Number(match[1]))
        const clippedToEmpty = clipEdges.length === 4 && (clipEdges[2] <= clipEdges[0] || clipEdges[1] <= clipEdges[3])
        const visuallyExposed = !clippedToEmpty && rect.width > 0
          && rect.height > 0
          && style.display !== 'none'
          && style.visibility !== 'hidden'
          && opacity >= .05
          && node.getAttribute('aria-hidden') !== 'true'
        return {
          label: (node.getAttribute('aria-label') || node.textContent || '').trim().slice(0, 120),
          width: rect.width,
          height: rect.height,
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          opacity,
          visuallyExposed,
        }
      })
      .filter((item) => item.visuallyExposed)
    return {
      clientWidth: root.clientWidth,
      scrollWidth: Math.max(root.scrollWidth, body?.scrollWidth || 0),
      clientHeight: root.clientHeight,
      scrollHeight: Math.max(root.scrollHeight, body?.scrollHeight || 0),
      clippedInteractive: interactive.filter((item) => item.right < -1 || item.left > root.clientWidth + 1),
      undersizedVisibleInteractive: interactive.filter((item) => item.width > 0 && item.height > 0 && (item.width < 32 || item.height < 32)),
    }
}
