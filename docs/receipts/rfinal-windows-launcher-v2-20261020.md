# R-FINAL Windows launcher V2

This is a versioned preparation wrapper for the original `scripts/run-rfinal-native-evidence.mjs`, not another release controller. It reuses an existing canonical Spatial checkout's Git objects, fetches the authorized integration branch into a new isolated repository, audits the maintained Windows sparse exclusions before checkout, and invokes the unchanged maintained native runner. It never checks out, resets, stashes or fetches into the recovered source. Git optional locks are disabled for source reads.

Run on Windows PowerShell 5.1 or later after downloading the versioned script:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$HOME\Downloads\URAI_RFINAL_CURRENT_HEAD_ONEPASS_20261020_v2.ps1"
```

For an explicit recovered root or nested directory, add `-ExistingRepo 'C:\verified\original\source'`. If automatic Node 22 discovery cannot find the existing portable distribution, add `-NodeExecutable 'C:\verified\toolchain\node.exe'`. Use actual paths; these examples are not claims about the founder's filesystem. Discovery searches only established Home/Downloads UrAi directory locations and requires the canonical origin plus a known original commit object. Multiple qualified donors are sorted deterministically. Only a new isolated repository's configuration, refs, checkout and index are written.

The default required ancestor is original candidate `e589b8b0e2c45d4f67cd3e14df377e0fca4c7687`. Live ref identity is checked before and after preparation and after native execution. A moved branch remains non-green while exact older evidence is retained. The original runner performs its own source ancestry, clean-index and pinned-byte checks. It owns the stage matrix and package-manager execution; the wrapper does not supply replacement tests.

The finalizer wraps directory enumeration in `@(...)`, preserves primary and packaging exceptions independently, includes hidden evidence through .NET ZIP APIs, and emits ZIP SHA-256. Missing Git, missing Node, preflight errors and child failures remain nonzero with a summary wherever output access permits. A native-green result is explicitly not release approval.

Regression command:

```powershell
powershell.exe -NoProfile -File tests\rfinal-windows-launcher.test.ps1 -NodeExecutable 'C:\verified\toolchain\node.exe'
```

Local qualification: 17 fixture groups passed on PowerShell 7.4.13 under Linux, including actual scalar FileInfo StrictMode Count reproduction, nested roots, wrong origins, dirty checkout/index preservation, real linked worktree, real concurrent commit movement, missing executables, child exit/log capture, early failure summary and ZIP, and zero/one/many hidden-file ZIP/hash round trips. The Windows-only slash/case assertion is conditional and was not executed here. No Windows 5.1 or founder-computer execution is claimed. A separately labeled Linux preparation rehearsal audited all 9,540 tracked paths (650 historical excluded unsafe names, zero unexpected paths/collisions/missing pinned files), verified the original runner blob and selftest, then deliberately stopped before native execution and packaged evidence.

The failed original launcher was not available in this checkout or matching Library searches. Its reported StrictMode failure is reproduced; its exact default ExistingRepo value and the founder's actual Git-root rejection cause cannot be established without its bytes and Windows filesystem. V2 removes hard-coded historical-root selection, accepts Git-resolved original nested/worktree roots, and keeps canonical-origin and ancestry validation.

The application source remains subject to the original 45-deliverable/267-criterion register. These tooling changes grant no private-media, provider, device, visual, independent-review, deployment, merge or release acceptance.
