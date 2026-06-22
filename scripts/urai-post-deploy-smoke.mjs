#!/usr/bin/env node
const baseUrl = process.env.URAI_DEPLOY_URL

if (!baseUrl) {
  console.error('URAI_DEPLOY_URL is required, for example https://your-hosting-url.web.app')
  process.exit(1)
}

const routes = [
  '/',
  '/home',
  '/ascent',
  '/life-map',
  '/focus?memoryId=quiet-reset',
  '/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread',
  '/unwind',
  '/mirror',
  '/passport',
  '/status',
  '/privacy-controls',
]

for (const route of routes) {
  console.log(`${baseUrl.replace(/\/$/, '')}${route}`)
}

console.log('Open each URL after deploy and verify it renders the launch surface, not the old static fallback. Browser-based Playwright verification can replace this checklist once deployed runtime access is available.')
