#!/usr/bin/env node

// Compatibility entry point. The sole implementation lives in
// check-deployment-authority-v2.mjs so every caller enforces one policy.
await import('./check-deployment-authority-v2.mjs')
