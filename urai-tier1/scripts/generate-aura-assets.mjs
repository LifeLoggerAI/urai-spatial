import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { Buffer } from 'node:buffer'

const OUT = path.resolve('public/assets/urai')
const SIZE = 1024

fs.mkdirSync(OUT, { recursive: true })

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return (~c) >>> 0
}

function chunk(type, data) {
  const t = Buffer.from(type)
  const len = Buffer.alloc(4)
  const crc = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0)
  return Buffer.concat([len, t, data, crc])
}

function clamp(v, min = 0, max = 255) {
  return Math.max(min, Math.min(max, Math.round(v)))
}

function parseRgba(color) {
  const match = color.match(/rgba\((\d+),(\d+),(\d+),([\d.]+)\)/)
  if (!match) return [120, 180, 255, 0.2]
  return [Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4])]
}

function writePng(file, pixelFn) {
  const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE)
  let offset = 0

  for (let y = 0; y < SIZE; y++) {
    raw[offset++] = 0
    for (let x = 0; x < SIZE; x++) {
      const [r, g, b, a] = pixelFn(x, y)
      raw[offset++] = r
      raw[offset++] = g
      raw[offset++] = b
      raw[offset++] = a
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(SIZE, 0)
  ihdr.writeUInt32BE(SIZE, 4)
  ihdr[8] = 8
  ihdr[9] = 6

  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])

  fs.writeFileSync(path.join(OUT, file), png)
  console.log(`[ASSET] wrote ${file}`)
}

function radial(name, inner, outer) {
  const [ir, ig, ib, ia] = parseRgba(inner)
  const [, , , oa] = parseRgba(outer)

  writePng(name, (x, y) => {
    const nx = (x / (SIZE - 1)) * 2 - 1
    const ny = (y / (SIZE - 1)) * 2 - 1
    const distance = Math.min(1, Math.sqrt(nx * nx + ny * ny))
    const alpha = ia * (1 - distance) + oa * distance
    return [clamp(ir), clamp(ig), clamp(ib), clamp(alpha * 255)]
  })
}

radial('home-aura.png', 'rgba(120,180,255,0.25)', 'rgba(0,0,0,0)')
radial('lifemap-aura.png', 'rgba(200,220,255,0.18)', 'rgba(0,0,0,0)')
radial('focus-aura.png', 'rgba(255,255,255,0.35)', 'rgba(0,0,0,0)')
radial('replay-chamber.png', 'rgba(20,40,80,0.6)', 'rgba(0,0,0,0)')
