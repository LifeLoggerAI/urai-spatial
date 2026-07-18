import fs from 'node:fs'

const path = 'urai-tier1/src/spatial/lifemap/SpatialLifeMapCanonical.tsx'
const source = fs.readFileSync(path, 'utf8')

function replaceOnce(value, before, after) {
  const first = value.indexOf(before)
  if (first < 0) throw new Error(`Expected source not found: ${before.slice(0, 100)}`)
  if (value.indexOf(before, first + before.length) >= 0) throw new Error(`Expected source duplicated: ${before.slice(0, 100)}`)
  return value.slice(0, first) + after + value.slice(first + before.length)
}

let next = replaceOnce(
  source,
  '<picture aria-hidden="true" data-life-map-authored-universe="primary" style={{ position: "absolute", inset: 0, zIndex: 60, pointerEvents: "none", mixBlendMode: "screen", opacity: .78 }}>',
  '<picture aria-hidden="true" data-life-map-authored-universe="atmospheric" style={{ position: "absolute", inset: 0, zIndex: 60, pointerEvents: "none", mixBlendMode: "screen", opacity: .22, maskImage: "radial-gradient(ellipse at 50% 48%, rgba(0,0,0,.72) 0%, rgba(0,0,0,.48) 48%, rgba(0,0,0,.18) 82%, transparent 100%)", WebkitMaskImage: "radial-gradient(ellipse at 50% 48%, rgba(0,0,0,.72) 0%, rgba(0,0,0,.48) 48%, rgba(0,0,0,.18) 82%, transparent 100%)" }}>',
)
next = replaceOnce(
  next,
  'style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", filter: "saturate(1.12) contrast(1.06) brightness(.9)" }}',
  'style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", transform: "scale(1.035)", filter: "saturate(.84) contrast(1.04) brightness(.68) blur(.35px)" }}',
)
fs.writeFileSync(path, next)
