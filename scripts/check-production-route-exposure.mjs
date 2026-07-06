#!/usr/bin/env node

// Compatibility entry point. The sole implementation lives in
// check-production-route-exposure-v2.mjs so every release caller enforces the
// same route, static Hosting, exact-SHA, and asset contract.
await import('./check-production-route-exposure-v2.mjs')
