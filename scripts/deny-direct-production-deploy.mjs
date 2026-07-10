const command = process.env.npm_lifecycle_event || process.argv.slice(2).join(' ') || 'direct deploy alias'

console.error(`[URAI production authority] ${command} is disabled.`)
console.error('Production may be deployed only by .github/workflows/spatial-live-deploy.yml from an exact main SHA.')
console.error('Run pnpm live:check for verification. Use the protected GitHub Actions workflow for deployment.')
process.exit(1)
