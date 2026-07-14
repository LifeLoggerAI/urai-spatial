# URAI Spatial legacy fingerprint bootstrap safe branch

Recorded: 2026-07-14

Base: `main@d811ec8d16fc3b944de4a894f4285f1529e85593`
Branch: `release/legacy-fingerprint-bootstrap-safe-20260714`

This branch contains a direct, reviewable, read-only implementation of the legacy fingerprint bootstrap contract. It does not contain a patch executor or a write-enabled workflow job.

The verifier allows the protected canonical release workflow to proceed only when the live fingerprint is absent or the response is recognized legacy HTML, the target is current main, the recovery SHA is a distinct ancestor, the Firebase project and live origin are canonical, and any redirect remains on `https://urai.app/home` without query, fragment, username, or password components.

No deploy, provider call, billing action, credential mutation, DNS change, or production-data mutation was performed while preparing this branch.
