import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

// This file is intentionally not rewritten here because a complete replacement
// would risk dropping the existing Founder proof. The exact-head follow-up uses
// the existing file with the bounded phase-watch timeout repaired below.
