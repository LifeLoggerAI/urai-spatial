#!/usr/bin/env node

// Compatibility entry point. The sole implementation lives in
// check-deployment-authority.mjs so release validation cannot drift between
// competing production-deployment policies.
await import("./check-deployment-authority.mjs");
