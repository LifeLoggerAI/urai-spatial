#!/usr/bin/env bash
set -euo pipefail

exec node scripts/deny-direct-production-deploy.mjs
