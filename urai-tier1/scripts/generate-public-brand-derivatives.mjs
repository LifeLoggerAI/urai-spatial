import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const root = path.resolve(process.cwd(), '..')
const registryPath = path.join(root, 'brand/public-identity-registry.json')
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'))
const outDir = path.join(process.cwd(), 'brand/exports/public')
fs.mkdirSync(outDir, { recursive: true })

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const t = Buffer.from(type)
  const out = Buffer.alloc(12 + data.length)
  out.writeUInt32BE(data.length, 0)
  t.copy(out, 4)
  data.copy(out, 8)
  out.writeUInt32BE(crc32(Buffer.concat([t, data])), 8 + data.length)
  return out
}
function png(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    const row = y * (width * 4 + 1)
    raw[row] = 0
    rgba.copy(raw, row + 1, y * width * 4, (y + 1) * width * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8; ihdr[9] = 6
  return Buffer.concat([Buffer.from('\x89PNG\r\n\x1a\n', 'binary'), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))])
}
function hex(value) {
  const s = value.replace('#', '')
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16), 255]
}
function raster(width, height, identity, background, monochrome = false) {
  const px = Buffer.alloc(width * height * 4)
  const paper = hex(identity.paper), ink = hex(monochrome ? '#FFFFFF' : identity.ink), accent = hex(monochrome ? '#FFFFFF' : identity.primary)
  const transparent = background === 'transparent'
  for (let i = 0; i < width * height; i++) {
    const c = transparent ? [0, 0, 0, 0] : paper
    px.set(c, i * 4)
  }
  const cx = width / 2, cy = height / 2, scale = Math.min(width, height) / 1024
  const rr = 318 * scale, stroke = Math.max(1, 44 * scale), core = Math.max(1, 96 * scale)
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy)
    let c = null
    if (Math.abs(d - rr) <= stroke / 2) c = ink
    if (d <= core) c = accent
    if (c) px.set(c, (y * width + x) * 4)
  }
  return png(width, height, px)
}
function svg(identity, title, mode, modifier = true) {
  const dark = mode === 'dark'; const mono = mode === 'monochrome'
  const bg = dark ? identity.ink : identity.paper
  const ring = mono ? '#000000' : dark ? identity.paper : identity.ink
  const core = mono ? '#000000' : identity.primary
  const extra = modifier && identity.structuralModifier === 'evidence-notch'
    ? '<path d="M512 164v80M392 812h240" stroke="currentColor" stroke-width="34" stroke-linecap="round"/>'
    : modifier ? '<path d="M736 700c42 26 72 62 88 108" fill="none" stroke="currentColor" stroke-width="30" stroke-linecap="round"/>' : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024" role="img" aria-labelledby="title desc"><title id="title">${title}</title><desc id="desc">Deterministic ${title} ring and orb master</desc>${mode === 'transparent' ? '' : `<rect width="1024" height="1024" fill="${bg}"/>`}<g color="${ring}"><circle cx="512" cy="512" r="318" fill="none" stroke="${ring}" stroke-width="44"/><circle cx="512" cy="512" r="96" fill="${core}"/>${extra}</g></svg>\n`
}

const identities = registry.identities
for (const [key, identity] of Object.entries(identities)) {
  for (const mode of ['light', 'dark', 'monochrome']) {
    const file = `${key}-orb-${mode}.svg`
    fs.writeFileSync(path.join(outDir, file), svg(identity, identity.displayName, mode))
  }
}
fs.writeFileSync(path.join(outDir, 'favicon.svg'), svg(identities.urai, 'UrAi', 'transparent', false))
fs.writeFileSync(path.join(outDir, 'splash-mark.svg'), svg(identities.urai, 'UrAi', 'transparent'))
fs.writeFileSync(path.join(outDir, 'loading-mark.svg'), svg(identities.urai, 'UrAi static loading mark', 'transparent'))

for (const item of registry.derivatives.filter((x) => x.format === 'png')) {
  const identity = item.id.startsWith('ruai-') ? identities.ruai : identities.urai
  const mono = item.id === 'notification'
  fs.writeFileSync(path.join(outDir, item.file), raster(item.width, item.height, identity, item.background, mono))
}

const files = fs.readdirSync(outDir).filter((name) => name !== 'manifest.json').sort()
const manifest = {
  generatedAt: new Date().toISOString(),
  generator: 'generate-public-brand-derivatives.mjs@1.0.0',
  sourceRegistrySha256: crypto.createHash('sha256').update(fs.readFileSync(registryPath)).digest('hex'),
  productionPublished: false,
  providerCalls: 0,
  spendUsd: '0.00',
  files: files.map((name) => {
    const data = fs.readFileSync(path.join(outDir, name))
    return { file: name, bytes: data.length, mimeType: name.endsWith('.svg') ? 'image/svg+xml' : 'image/png', sha256: crypto.createHash('sha256').update(data).digest('hex') }
  }),
}
fs.writeFileSync(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`[OK] Generated ${manifest.files.length} deterministic public brand files in ${outDir}`)
