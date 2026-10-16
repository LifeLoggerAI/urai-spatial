# Stripe current-account authority repair

Base source: Spatial release controller #1636 at 3817922a8b0a536ddcce718d3ce1c74e9299a1d2. This is a scoped donor to the existing release branch, not a release candidate or production approval.

Both the Next.js entitlement writer and mounted Firebase Functions entitlement writer now require current Firestore owner/deletion authority and a current enabled Firebase Auth account before applying callbacks. They repeat that check after any awaited provider resolution and immediately before persistence. Firebase Auth creationTime binds the account incarnation; callbacks older than a recreated account cannot grant its access. Existing event ordering, duplicate handling, settlement verification, signature/mode gates and nonpaid recovery remain intact. Transient Auth lookup failure stays retryable and cannot grant access.

The checks use existing users, privacyRuntime/exportAuthority, privacyDeletionTombstones and deletionJobs records. They do not introduce a separate deletion schema or change financial-record retention.

Executed validation: 58 new cases against the actual transaction modules and 62 retained webhook lifecycle cases pass, 120 total with zero skips, on Node 24.19.0. Tests explicitly double Auth, Firestore and Stripe transport; they are not live Stripe, emulator, production account or cloud acceptance. The original audit probe reproduced five failures and one pass against its byte-verified predecessor. Both helper copies pass a strict TypeScript 5.9.3 check against available real firebase-admin SDK declarations. This is not a fresh frozen dependency installation or full application build.

The new test is registered in the compact native unit runner. Native Node 22, frozen installation, current-artifact browser checks, independent review, privacy acceptance and governed integration remain required. Stripe LIVE remains disabled; no paid-provider request or deployment was made.
