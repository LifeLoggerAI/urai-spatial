#!/usr/bin/env node

// Compatibility entry point. The sole implementation lives in
// check-deployment-authority-v2.mjs so workflows, package scripts, and legacy
// callers all enforce the same exact-SHA static Hosting policy.
await import('./check-deployment-authority-v2.mjs')
