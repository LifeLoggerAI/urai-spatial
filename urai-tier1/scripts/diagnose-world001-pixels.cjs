// Protected WORLD001 visual readiness diagnostic. Run only against an isolated, authorized dev server.
// Usage: URAI_VISUAL_URL='http://127.0.0.1:4173/?homeAssetReview=1&homePrivateFixture=1&world001ModeledV3=1' node scripts/diagnose-world001-pixels.cjs
// Never stage the donor GLB into a public/production deployment.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const url = process.env.URAI_VISUAL_URL;
  if (!url || !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(url)) {
    throw new Error('URAI_VISUAL_URL must be an explicit loopback development URL');
  }
  const output = process.env.URAI_VISUAL_OUTPUT || '/tmp/urai-world001-visual-proof';
  // A fresh run must not overwrite evidence from another browser invocation.
  if (fs.existsSync(output) && fs.readdirSync(output).length) {
    throw new Error('Output directory already contains evidence: choose a unique URAI_VISUAL_OUTPUT');
  }
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.URAI_CHROMIUM_PATH ? { executablePath: process.env.URAI_CHROMIUM_PATH } : {}),
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl'],
  });
  let failed = false;
  try {
    for (const device of [{ name: 'android', width: 390, height: 844, mobile: true }, { name: 'desktop', width: 1440, height: 900, mobile: false }]) {
      const page = await browser.newPage({ viewport: { width: device.width, height: device.height }, isMobile: device.mobile, hasTouch: device.mobile, deviceScaleFactor: 1 });
      const errors = [];
      const responses = [];
      page.on('pageerror', error => errors.push('pageerror: ' + error.message));
      page.on('console', msg => { if (msg.type() === 'error') errors.push('console: ' + msg.text()); });
      page.on('response', response => {
        if (response.status() >= 400 || /world001.*\.glb/i.test(response.url())) {
          responses.push({ status: response.status(), url: response.url().replace(/\?.*/, '') });
        }
      });
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      const samples = [];
      for (const delay of [2000, 5000, 10000]) {
        await page.waitForTimeout(delay);
        samples.push(await page.evaluate(() => {
          const owner = document.querySelector('.urai-asset-home-world[data-home-primary-owner="asset-driven"]');
          const runtime = document.querySelector('[data-urai-home-runtime]');
          const canvas = owner?.querySelector('canvas') || document.querySelector('canvas');
          return {
            time: new Date().toISOString(),
            canvas: Boolean(canvas),
            canvasWidth: canvas?.width ?? null,
            canvasHeight: canvas?.height ?? null,
            webglContextLost: canvas ? canvas.getContext('webgl2')?.isContextLost() ?? null : null,
            runtimeReady: runtime?.getAttribute('data-home-assets-ready') ?? null,
            ownerReady: owner?.getAttribute('data-home-assets-ready') ?? null,
            ownerFrames: owner?.getAttribute('data-home-rendered-frames') ?? null,
            preview: owner?.getAttribute('data-home-world001-preview') ?? null,
            meshCount: owner?.getAttribute('data-home-v3-mesh-count') ?? null,
            materialCount: owner?.getAttribute('data-home-v3-material-count') ?? null,
            visibleText: document.body.innerText.slice(-400),
          };
        }));
        if (samples.at(-1).ownerReady === 'true') break;
      }
      await page.screenshot({ path: path.join(output, device.name + '.png'), fullPage: false, timeout: 15000 });
      const last = samples.at(-1);
      const record = { device, url, samples, errors, responses, pass:
        last.ownerReady === 'true' && last.runtimeReady === 'true'
        && Number(last.ownerFrames) >= 3
        && Number(last.meshCount) > 0 && Number(last.materialCount) > 0
        && errors.length === 0 && responses.every(response => response.status < 400)
      };
      fs.writeFileSync(path.join(output, device.name + '.json'), JSON.stringify(record, null, 2));
      console.log(JSON.stringify({ device: device.name, pass: record.pass, last: samples.at(-1), errors, responses }));
      if (!record.pass) failed = true;
      await page.close();
    }
  } finally { await browser.close(); }
  process.exitCode = failed ? 1 : 0;
})().catch(error => { console.error(error); process.exitCode = 1; });
