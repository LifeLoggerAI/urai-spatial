import { spawnSync } from 'node:child_process'
import fs from 'node:fs'

const tests = [
  'tests/aaa-world-artifact-contract.test.mjs',
  'tests/asset-factory-phase6-contract.test.mjs',
  'tests/asset-validation-fail-closed-contract.test.mjs',
  'tests/automatic-hosting-recovery-contract.test.mjs',
  'tests/body-biometric-contract.test.mjs',
  'tests/continuous-spatial