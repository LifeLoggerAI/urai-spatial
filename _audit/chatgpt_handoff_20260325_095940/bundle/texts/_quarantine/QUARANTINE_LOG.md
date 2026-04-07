# Quarantine Log

This log details the files and directories that have been quarantined during the repository cleanup. The goal is to isolate non-canonical, legacy, or conflicting code without deleting it, creating a clear and single path for the primary application.

## _archive

- **Path Moved:** `_archive` -> `_quarantine/_archive`
- **Reason:** This directory contains a large number of files from a previous or alternative implementation of the URAI-SPATIAL application. Its presence in the root directory creates ambiguity regarding the canonical codebase. To enforce a single source of truth and facilitate a clean build, the entire `_archive` directory has been moved to quarantine. This isolates legacy code without permanent deletion, allowing for future inspection if needed.

## Root-Level Application & Scripts

- **Paths Moved:**
  - `public/` -> `_quarantine/public_legacy/`
  - `next.config.js` -> `_quarantine/next.config.js.legacy`
  - `next-env.d.ts` -> `_quarantine/next-env.d.ts.legacy`
  - `tsconfig.json` -> `_quarantine/tsconfig.json.legacy`
  - Various `.sh` and other scripts -> `_quarantine/legacy_scripts/`
- **Reason:** The root directory contained a mix of files for a separate static/Next.js application and numerous utility scripts. This conflicts with the designated canonical application (`urai-tier1`). To prevent build tool confusion and create a single entry point for developers, these legacy files have been quarantined.
