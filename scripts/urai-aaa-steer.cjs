#!/usr/bin/env node

import('./urai-aaa-steer.mjs').catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exitCode = 1
})
