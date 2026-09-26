import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import test from 'node:test'
const require = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
const { chromium } = require('playwright')

test('production nebula shader fades every quad edge while retaining its interior', async () => {
  const source = await readFile(new URL('../urai-tier1/src/components/lifemap/CosmicComposedLifeMapScene.tsx', import.meta.url), 'utf8')
  const fragment = source.match(/const NEBULA_FRAGMENT = `([^`]+)`;/)[1]
  const browser = await chromium.launch({ executablePath: process.env.URAI_PROOF_CHROMIUM_EXECUTABLE_PATH || undefined, headless: true, args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] })
  try {
    const page = await browser.newPage()
    const samples = await page.evaluate((fragment) => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256
      const gl = canvas.getContext('webgl', { alpha: true, antialias: false, preserveDrawingBuffer: true })
      if (!gl) throw new Error('WebGL shader regression requires a real context')
      const shader = (type, source) => { const result = gl.createShader(type); gl.shaderSource(result, source); gl.compileShader(result); if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(result)); return result }
      const program = gl.createProgram()
      gl.attachShader(program, shader(gl.VERTEX_SHADER, 'attribute vec2 position;varying vec2 vUv;void main(){vUv=position*.5+.5;gl_Position=vec4(position,0.,1.);}'))
      gl.attachShader(program, shader(gl.FRAGMENT_SHADER, 'precision highp float;'+fragment)); gl.linkProgram(program)
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program))
      gl.useProgram(program)
      const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW)
      const position=gl.getAttribLocation(program,'position'); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0)
      gl.uniform3f(gl.getUniformLocation(program,'colorA'),.1,.3,.4); gl.uniform3f(gl.getUniformLocation(program,'colorB'),.4,.3,.2)
      gl.uniform1f(gl.getUniformLocation(program,'opacity'),.56)
      const reports=[]
      for(const seed of [3.11,8.17,11.37,17.13,21.47]) {
        gl.uniform1f(gl.getUniformLocation(program,'seed'),seed); gl.drawArrays(gl.TRIANGLES,0,6)
        const pixels = new Uint8Array(256*256*4); gl.readPixels(0,0,256,256,gl.RGBA,gl.UNSIGNED_BYTE,pixels)
        let maxBorderAlpha=0,maxInteriorAlpha=0
        for(let y=0;y<256;y++) for(let x=0;x<256;x++) {const alpha=pixels[(y*256+x)*4+3]; if(x===0||x===255||y===0||y===255)maxBorderAlpha=Math.max(maxBorderAlpha,alpha); if(x>64&&x<192&&y>64&&y<192)maxInteriorAlpha=Math.max(maxInteriorAlpha,alpha)}
        reports.push({seed,maxBorderAlpha,maxInteriorAlpha})
      }
      gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.getExtension('WEBGL_lose_context')?.loseContext()
      return reports
    }, fragment)
    for(const sample of samples){assert.ok(sample.maxBorderAlpha<=1,JSON.stringify(sample));assert.ok(sample.maxInteriorAlpha>12,JSON.stringify(sample))}
  } finally { await browser.close() }
})
