# Passport visible-owner readiness candidate

Parent PR1377: 3d8882cba8c701353a0f95b4b5221dfa29c78526. Existing readiness checks any matching DOM element, allowing hidden streamed Passport content to settle the watchdog. Repository canonical-journey-realm tests already document hidden streamed duplicate owners. Reference failures show URL arrival without visible main; they do not prove this as the sole cause.

Require a connected Passport owner with layout rectangles and non-hidden/non-collapsed computed visibility. Search all matching owners so a hidden streamed copy before a visible owner does not block readiness. Other destinations unchanged. Fallback2400ms and return5000ms requirements unchanged.

Seven injected source-function cases pass: absent, hidden layout, hidden style, collapsed, detached, hidden followed by visible, and unaffected Ground. Run node urai-tier1/tests/passport-owner-readiness.test.cjs. Fresh exact-head browser handoff/return proof required. No independent approval, deployment or certification.
