import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { Buffer } from 'node:buffer'

const OUT = path.resolve('public/assets/urai')
fs.mkdirSync(OUT, { recursive: true })

const SIZE = 1024

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

function writePng(file, pixelFn) {
  const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE)
  let o = 0

  for (let y = 0; y < SIZE; y++) {
    raw[o++] = 0
    for (let x = 0; x < SIZE; x++) {
      const [r, g, b, a] = pixelFn(x, y)
      raw[o++] = r
      raw[o++] = g
      raw[o++] = b
      raw[o++] = a
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(SIZE, 0)
  ihdr.writeUInt32BE(SIZE, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const png = Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])

  fs.writeFileSync(path.join(OUT, file), png)
  console.log(`[ASSET] wrote ${file}`)
}

function clamp(v, min = 0, max = 255) {
  return Math.max(min, Math.min(max, Math.round(v)))
}


function field({ color, alpha, power = 2.4, noise = 0.08 }) {
  return (x, y) => {
    const nx = (x / (SIZE - 1)) * 2 - 1
    const ny = (y / (SIZE - 1)) * 2 - 1

    const d = Math.sqrt(nx * nx + ny * ny)

    const base = Math.pow(Math.max(0, 1 - d), power)

    const warp =
      Math.sin(x * 0.013 + y * 0.021) * 0.12 +
      Math.sin(x * 0.031 - y * 0.017) * 0.08

    const directional = Math.max(0, 1 - (ny * 0.6 + 0.2))

    const a = Math.max(0, base + warp * noise) * directional * alpha

    return [
      color[0],
      color[1],
      color[2],
      Math.max(0, Math.min(255, a))
    ]
  }
}



function chamber() {
  return (x, y) => {
    const nx = (x / (SIZE - 1)) * 2 - 1
    const ny = (y / (SIZE - 1)) * 2 - 1
    const d = Math.sqrt(nx * nx + ny * ny)

    const vignette = Math.pow(d, 2.2) * 180
    const center = Math.pow(Math.max(0, 1 - d), 3.2) * 30

    const drift =
      Math.sin(x * 0.021 + y * 0.037) * 6 +
      Math.sin(x * 0.011 - y * 0.019) * 4

    const a = vignette + center + drift

    return [6, 12, 28, Math.max(0, Math.min(255, a))]
  }
}


writePng('home-aura.png', field({ color: [105, 185, 255], alpha: 78, power: 2.7, noise: 0.018 }))
writePng('lifemap-aura.png', field({ color: [160, 205, 255], alpha: 65, power: 2.2, noise: 0.065 }))
writePng('focus-aura.png', field({ color: [218, 242, 255], alpha: 118, power: 3.4, noise: 0.02 }))
writePng('replay-chamber.png', chamber())
