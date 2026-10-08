# Local chokidar error propagation repair

This is the MIT-licensed chokidar 3.6.0 distribution from the actual installed Spatial graph, locally identified as 3.6.0-urai.spatial.1. The original LICENSE, README, types and source-file hashes are retained. It is not an upstream security release.

The existing public watch/add path schedules _addToNodeFs through Promise.all but has no rejection handler. A bounded braces rejection therefore becomes an unhandled Promise rejection even if the caller registers the supported error listener. The only runtime source change adds a catch that routes rejection through the existing _handleError/error event when the watcher is still open. An error listener receives the original validation error; no successful readiness, file match, skip, retry or silent acceptance is manufactured. Closed watchers do not receive stale errors. Standard EventEmitter behavior remains explicit when callers omit an error listener.

The locked Firebase CLI 15.32.1 delegated watcher keeps its 3.6 API and ordinary glob behavior. Tests require real file discovery, a registered error listener receiving hostile input, clean close and no unhandled rejection. Whole CLI startup/emulator/build and integrated-owner runtime acceptance are separate gates. The original braces HIGH remains recorded as an upstream unpatched advisory with a local mitigation candidate.
