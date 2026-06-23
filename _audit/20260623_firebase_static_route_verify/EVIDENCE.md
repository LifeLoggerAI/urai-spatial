# URAI Firebase Static Route Verification Evidence

Date: 2026-06-23
Repository: `LifeLoggerAI/urai-spatial`
Firebase project: `urai-4dc1d`
Firebase Hosting URL: `https://urai-4dc1d.web.app`
Canonical domain checked: `https://urai.app`

## User terminal deploy proof

The latest Cloud Shell log showed the Next static export and Firebase Hosting release completed successfully.

Observed route inventory included the launch-critical public surfaces:

```txt
○ /home
○ /ground
○ /life-map
○ /focus
○ /replay
○ /mirror
○ /passport
○ /status
```

Observed Firebase Hosting deploy output:

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

Project Console: https://console.firebase.google.com/project/urai-4dc1d/overview
Hosting URL: https://urai-4dc1d.web.app
```

Observed post-deploy route proof from the same terminal:

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

## Source inspection

The root route and `/home` route both render `TierOneExperience mode="home"`, and `TierOneExperience` returns `HomeWorldProduction` for `mode === "home"`.

`HomeWorldProduction` currently includes:

- Sky click zone to `/life-map`
- Ground click zone to `/ground`
- Home threshold hero copy
- Orb companion HUD
- Self-state HUD
- Sky/Ground route previews
- Visible workforce panel
- Launch route rail

The home hover-specific CSS module keeps the Ground hover affordance constrained rather than opening a half-screen overlay.

## Live canonical-domain route inspection

The web inspector verified the canonical domain is rendering the production Home threshold surface, including the sky click, ground click, orb companion HUD, self-state HUD, route previews, visible workforce panel, and route rail.

Checked live canonical routes:

- `https://urai.app/`
- `https://urai.app/home`
- `https://urai.app/ground`
- `https://urai.app/life-map`
- `https://urai.app/focus`
- `https://urai.app/replay`
- `https://urai.app/mirror`
- `https://urai.app/passport`
- `https://urai.app/status`

## Screenshot limitation from this connector session

This ChatGPT connector session can inspect live HTML and follow live route links, but it does not expose a full browser screenshot API for normal web pages. The only screenshot tool available here is PDF-only. Therefore, browser screenshot capture still needs to be done from Cloud Shell/local Playwright or the user's browser.

Recommended screenshot command from Cloud Shell after `git pull`:

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

## Status

- Build/export: completed in user terminal.
- Firebase static deploy: succeeded.
- Firebase route chain: returned HTTP 200 for `/`, `/home`, `/ground`, `/life-map`, `/focus`, `/replay`, `/mirror`, `/passport`, `/status`.
- Canonical domain route content: inspected live for Home, Ground, Life Map, Focus, Replay, Mirror, Passport, and Status.
- Production source: inspected through GitHub connector.
- Code patch: no blind visual patch applied from this connector session because the currently inspected production source already contains the Home hover fix and embodied Ground route wiring.
- Evidence commit: this file records the latest deploy and route proof.
