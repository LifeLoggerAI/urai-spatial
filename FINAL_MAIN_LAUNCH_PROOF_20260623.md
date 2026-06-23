# URAI Spatial Final Main Launch Proof — 2026-06-23

Main HEAD:
703396b3 Merge pull request #275 from LifeLoggerAI/home-world-ship-plan-20260622

Merged launch cleanup:
14b940f3 Merge pull request #276 from LifeLoggerAI/lifemap-script-drop-20260622
7f1ea92e Remove Life Map backup files from release surface
8dffe541 Restore ground realm shell canon

Passed:
- pnpm check:source-integrity
- pnpm check:types
- pnpm build
- Next static generation: 109/109 pages

Live route checks:
200 https://urai.app/
200 https://urai.app/home
200 https://urai.app/ground
200 https://urai.app/world
200 https://urai.app/life-map
200 https://urai.app/focus
200 https://urai.app/replay
200 https://urai.app/mirror
200 https://urai.app/passport
200 https://urai.app/status

Remaining blocker:
Cloud Shell cannot run Playwright browser verification because Chromium requires libXext.so.6 and this shell has no sudo/root. Deploy verification must run in GitHub Actions or a root/sudo/browser-lib capable environment.
