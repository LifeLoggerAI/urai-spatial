# URAI Launch Evidence — Firebase Static Route Verify

Date: 2026-06-23
Repository: `LifeLoggerAI/urai-spatial`
Project: `urai-4dc1d`
Hosting URL: `https://urai-4dc1d.web.app`
Canonical domain: `https://urai.app`

## Latest build/export/deploy proof

The user terminal completed the static export and Firebase Hosting release.

```txt
=== Deploying to 'urai-4dc1d'...

i  deploying hosting
i  hosting[urai-4dc1d]: beginning deploy...
i  hosting[urai-4dc1d]: found 358 files in urai-tier1/out
✔  hosting[urai-4dc1d]: file upload complete
i  hosting[urai-4dc1d]: finalizing version...
✔  hosting[urai-4dc1d]: version finalized
i  hosting[urai-4dc1d]: releasing new version...
✔  hosting[urai-4dc1d]: release complete

✔  Deploy complete!
```

## Latest public route proof

The same post-deploy terminal verification returned:

```txt
200 /
200 /home
200 /ground
200 /life-map
200 /focus
200 /replay
200 /mirror
200 /passport
200 /status
```

## Canonical domain inspection

Live canonical domain inspection confirmed `https://urai.app/` and `https://urai.app/home` render the Home threshold surface with:

- sky click into Life Map
- ground click into Ground
- `Own your life. Step inside yourself.`
- orb companion HUD
- self-state HUD
- Sky/Ground route preview cards
- visible workforce panel
- launch route rail

Live canonical route inspection also confirmed content is reachable for:

- `/ground`
- `/life-map`
- `/focus`
- `/replay`
- `/mirror`
- `/passport`
- `/status`

## Source inspection

Source inspection through the GitHub connector confirmed:

- `urai-tier1/src/app/page.tsx` renders `TierOneExperience mode="home"`.
- `urai-tier1/src/app/home/page.tsx` renders `TierOneExperience mode="home"`.
- `TierOneExperience` returns `HomeWorldProduction` for Home mode.
- `HomeWorldProduction` imports the hover fix module.
- `HomeWorldProductionHoverFix.module.css` constrains the Ground hover zone to avoid the old half-screen slide/overlay behavior.
- `/ground` is implemented as an embodied Ground World with private workforce agents, inspectable real-life objects, consent/privacy language, and route rail.

## Screenshots

The connector environment used for this evidence pass can inspect live HTML routes and GitHub source, but does not expose a browser screenshot API for normal web pages. The available screenshot tool is PDF-only. Screenshot capture should therefore be run from the user's browser or a Playwright-enabled terminal.

Recommended follow-up capture command:

```bash
cd ~/urai-spatial/urai-tier1
node - <<'NODE'
const { chromium } = require('playwright');
const routes = ['/', '/home', '/ground', '/life-map', '/focus', '/replay'];
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
  for (const route of routes) {
    await page.goto(`https://urai.app${route}`, { waitUntil: 'networkidle', timeout: 60000 });
    const name = route === '/' ? 'root' : route.replace(/^\//, '').replace(/\//g, '-');
    await page.screenshot({ path: `../_audit/20260623_firebase_static_route_verify/${name}.png`, fullPage: true });
  }
  await browser.close();
})();
NODE
```

## Final status

- Build/export: completed in user terminal.
- Firebase Hosting release: completed.
- Route chain: HTTP 200 for `/`, `/home`, `/ground`, `/life-map`, `/focus`, `/replay`, `/mirror`, `/passport`, `/status`.
- Canonical domain: inspected live.
- Repo evidence: committed.
