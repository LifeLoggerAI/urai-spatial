import fs from 'fs'
import path from 'path'

const out = 'public/assets/urai'
fs.mkdirSync(out, { recursive: true })

function radial(name, inner, outer) {
  const size = 2048
  const canvas = new OffscreenCanvas(size, size)
  const ctx = canvas.getContext('2d')

  const grad = ctx.createRadialGradient(
    size/2, size/2, 0,
    size/2, size/2, size/2
  )

  grad.addColorStop(0, inner)
  grad.addColorStop(1, outer)

  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)

  canvas.convertToBlob().then(blob => {
    const buffer = Buffer.from(await blob.arrayBuffer())
    fs.writeFileSync(path.join(out, name), buffer)
  })
}

radial('home-aura.png', 'rgba(120,180,255,0.25)', 'rgba(0,0,0,0)')
radial('lifemap-aura.png', 'rgba(200,220,255,0.18)', 'rgba(0,0,0,0)')
radial('focus-aura.png', 'rgba(255,255,255,0.35)', 'rgba(0,0,0,0)')
radial('replay-chamber.png', 'rgba(20,40,80,0.6)', 'rgba(0,0,0,0)')
