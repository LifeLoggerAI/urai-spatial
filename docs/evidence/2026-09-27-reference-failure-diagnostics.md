# Reference failure diagnostics

Parent: 992ace1b7c40a7388a6fb9b8b9907006064f3454. Reference run36313491180 shard2 artifact10930099600 independently hashes to 2768f1d57dde4e86b1f3524801edfccb55840905d3ccedf0c033f5235fd10ea9. It records 32 captures and PASSPORT-PHYS-011 failing before Passport main becomes visible (30000ms). Final URL is Passport; no console errors or failed requests are recorded; failure screenshot is absent. This does not establish the cause.

Add best-effort failure screenshot with its own 5000ms bound. Preserve original error, failure classification and all original acceptance thresholds. Diagnostic failure is recorded separately and cannot mark a failing capture successful. Syntax verified with node --check. This change improves subsequent diagnosis; it does not repair or certify Passport.

Sibling shard0 artifact10930492294 independently hashes to 8474c3610576e39aa224094c7dd4f4f5ed399d9083aabcedf95881020e057a37 and records 33 captures, zero failures. This is partial-estate evidence only.
