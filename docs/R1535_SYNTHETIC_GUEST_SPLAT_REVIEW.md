# R1535 synthetic guest Home splat (REVIEW ONLY)

The **2,667,520-byte / 83,360-point** asset is generated deterministically at build time by \`urai-tier1/scripts/generate-public-home-splat.mjs\`. It contains no private memories or captured location imagery. Its authored points are distant mountains, trees, meadow, flowers, haze and clouds, built procedurally rather than photogrammetrically.

The runtime already has \`HomeInterpretiveSplatEnvironment\`, but it only mounts a splat when \`NEXT_PUBLIC_URAI_HOME_INTERPRETIVE_SPLAT_ASSET\` is explicitly set to:

\`/assets/urai/home-production/interpretive/sanctuary-golden-grove-v1.splat\`

Do **not** set this configuration on any production environment. Use it only in a protected and reviewed test preview. The asset remains a deliberately synthetic visual *candidate*, not a trained Gaussian reconstruction, photoreal AAA+++ Gold Master, founder acceptance, source-captured history, or certified public release. Collision/navigation remain on conventional geometry. No personal memories, authentication, privacy policy, or production hosting are changed.

Review/test: \`node --test tests/r1535-public-home-splat.test.mjs\`, \`node urai-tier1/scripts/generate-public-home-splat.mjs /tmp/test.splat\`, then the existing \`scripts/inspect-captured-reality-splat.mjs\` against that exact binary. In a **synthetic-only** browser test preview, confirm HTTP 200 with correct binary length and content type, a WebGL resource loaded through the renderer, meaningful non-background GPU pixels, default signed-out Home, absence of private data, navigation, frame-rate and reduced-motion/mobile fallback. Reject if this layer obscures interactive foreground or never draws visible pixels.

**Release gate:** HOLD / NO-GO. Private-memory writes remain disabled. No public production promotion, no SSO disable, no independent visual approval implied.
