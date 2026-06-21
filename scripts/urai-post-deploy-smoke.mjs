#!/usr/bin/env node
const baseUrl = process.env.URAI_DEPLOY_URL

if (!baseUrl) {
  console.error('URAI_DEPLOY_URL is required, for example https://your-hosting-url.web.app')
  process.exit(1)
}

const routes = [
  '/',
  '/home',
  '/life-map',
  '/replay',
  '/focus?manifestId=seed-memory-bloom',
  '/mirror',
  '/passport',
  '/status',
  '/spatial',
  '/spatial-fallback',
  '/location-map',
  '/place/place-seed-memory-bloom',
  '/place/place-seed-memory-bloom/replay',
  '/council',
  '/legacy',
  '/dream',
  '/ground',
]

for (const route of routes) {
  console.log(`${baseUrl.replace(/\/$/, '')}${route}`)
}

console.log('Open each URL after deploy and verify it renders without a fatal error. Browser-based Playwright verification can replace this checklist once deployed runtime access is available.')
