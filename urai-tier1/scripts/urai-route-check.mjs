import fs from 'node:fs'
import path from 'node:path'

const routes = ['/', '/home', '/life-map', '/replay', '/focus', '/mirror', '/passport', '/status']

const outDir = path.resolve('out')
const nextAppDir = path.resolve('.next/server/app')

function candidates(route) {
  const clean = route === '/' ? '' : route.replace(/^\/+|\/+$/g, '')
  const list = []

  if (fs.existsSync(outDir)) {
    if (!clean) list.push(path.join(outDir, 'index.html'))
    else {
      list.push(path.join(outDir, clean, 'index.html'))
      list.push(path.join(outDir, `${clean}.html`))
    }
  }

  if (fs.existsSync(nextAppDir)) {
    if (!clean) {
      list.push(path.join(nextAppDir, 'index.html'))
      list.push(path.join(nextAppDir, 'page.html'))
    } else {
      list.push(path.join(nextAppDir, `${clean}.html`))
      list.push(path.join(nextAppDir, clean, 'index.html'))
      list.push(path.join(nextAppDir, clean, 'page.html'))
    }
  }

  return list
}

let failed = 0

for (const route of routes) {
  const found = candidates(route).find((file) => fs.existsSync(file) && fs.statSync(file).isFile())

  if (!found) {
    failed += 1
    console.error(`FAIL route ${route} -> no static/prerendered HTML file found`)
    continue
  }

  const body = fs.readFileSync(found, 'utf8')
  const hasMarker = body.includes('__next') || body.includes('URAI') || body.includes('urai-scene-stage')

  if (body.length > 300 && hasMarker) {
    console.log(`PASS route ${route} -> prerendered render marker found at ${path.relative(process.cwd(), found)}`)
  } else {
    failed += 1
    console.error(`FAIL route ${route} -> file=${path.relative(process.cwd(), found)} bytes=${body.length} marker=${hasMarker}`)
  }
}

process.exit(failed ? 1 : 0)
