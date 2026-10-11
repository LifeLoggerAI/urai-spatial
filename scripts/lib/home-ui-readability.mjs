// Bounded measurements of the built Home UI. No runtime/scene mutation.
export function minimumCssContrast(foreground, background) {
  const luminance = rgb => rgb.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((s,v,i) => s + v * [.2126,.7152,.0722][i],0)
  const blend = (rgba, rgb) => rgba.slice(0,3).map((v,i) => v * (rgba[3] ?? 1) + rgb[i] * (1 - (rgba[3] ?? 1)))
  return Math.min(...[0,255].map(v => {
    const bg = blend(background,[v,v,v]), fg = blend(foreground,bg)
    const l1 = luminance(fg), l2 = luminance(bg)
    return (Math.max(l1,l2) + .05) / (Math.min(l1,l2) + .05)
  }))
}
export async function inspectHomeCaption(page) {
  const evidence = await page.locator('.home-world-context').evaluate(node => {
    const s = getComputedStyle(node), box = node.getBoundingClientRect(), owner = node.closest('.urai-asset-home-world')
    let opacity = 1
    for (let current = node; current; current = current.parentElement) opacity *= Number(getComputedStyle(current).opacity)
    const range = document.createRange(); range.selectNodeContents(node)
    const lines = [...range.getClientRects()].map(r => ({left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}))
    const rgb = value => { const n = value.match(/[\d.]+/g).map(Number); return [...n.slice(0,3), n[3] ?? 1] }
    return {text:node.textContent,fontSize:Number.parseFloat(s.fontSize),color:rgb(s.color),background:rgb(s.backgroundColor),opacity,zIndex:Number(s.zIndex),vignetteZIndex:Number(getComputedStyle(owner,'::after').zIndex),bounds:{left:box.left,right:box.right,top:box.top,bottom:box.bottom},viewport:{width:innerWidth,height:innerHeight},lines}
  })
  evidence.minimumContrast = minimumCssContrast(evidence.color,evidence.background)
  evidence.passed = evidence.fontSize >= 12 && evidence.opacity >= .99 && evidence.minimumContrast >= 4.5
    && evidence.zIndex > evidence.vignetteZIndex && evidence.lines.length > 0
    && evidence.lines.every(r => r.width > 0 && r.left >= evidence.bounds.left - 1 && r.right <= evidence.bounds.right + 1 && r.top >= 0 && r.bottom <= evidence.viewport.height)
    && evidence.bounds.left >= 0 && evidence.bounds.right <= evidence.viewport.width
  return evidence
}
export async function inspectFocusedHomeNavigation(page) {
  const evidence = await page.getByRole('navigation',{name:'Accessible Home destinations'}).evaluate(nav => {
    const box = nav.getBoundingClientRect()
    const controls = [...nav.querySelectorAll('button,a')].map(node => {
      const rect = node.getBoundingClientRect(), s = getComputedStyle(node), range = document.createRange()
      range.selectNodeContents(node)
      const lines = [...range.getClientRects()].map(r => ({left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}))
      const hit = document.elementFromPoint(rect.left + rect.width / 2,rect.top + rect.height / 2)
      return {label:node.getAttribute('aria-label'),text:node.textContent,focused:node === document.activeElement,fontSize:Number.parseFloat(s.fontSize),width:rect.width,height:rect.height,bounds:{left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom},scrollWidth:node.scrollWidth,clientWidth:node.clientWidth,hit:hit === node || node.contains(hit),lines}
    })
    return {focused:nav.contains(document.activeElement),bounds:{left:box.left,right:box.right,top:box.top,bottom:box.bottom},viewport:{width:innerWidth,height:innerHeight},controls}
  })
  evidence.passed = evidence.focused && evidence.controls.length === 3
    && evidence.bounds.left >= 0 && evidence.bounds.right <= evidence.viewport.width && evidence.bounds.top >= 0 && evidence.bounds.bottom <= evidence.viewport.height
    && evidence.controls.every(c => c.width >= 48 && c.height >= 48 && c.fontSize >= 10 && c.hit && c.scrollWidth <= c.clientWidth + 1 && c.lines.length > 0 && c.lines.every(r => r.width > 0 && r.left >= c.bounds.left - 1 && r.right <= c.bounds.right + 1 && r.top >= c.bounds.top - 1 && r.bottom <= c.bounds.bottom + 1))
  return evidence
}

