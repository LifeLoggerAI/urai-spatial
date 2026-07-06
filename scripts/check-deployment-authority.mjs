#!/usr/bin/env node

// Compatibility entry point. The sole implementation lives in
// check-deployment-authority-v3.mjs so every caller enforces the consolidated
// merged-main verification and manual protected static deployment policy.
await import('./check-deployment-authority-v3.mjs')
