# Adam Presence Runtime — Launch Authority

Issue authority: #1529.

Adam is a launch-critical governed digital-Founder runtime, not a per-page prerecorded presenter.

## Current implementation lane

This lane introduces:
- one Adam surface-context resolver;
- one authenticated streaming Adam conversation client;
- one server-side Adam reasoning function;
- one dedicated private-Founder voice function that fails closed unless the accepted Founder voice is enabled and configured;
- one accessible global product-shell Adam presence;
- text input, browser voice input where available, streaming text, sentence-chunk speech start, interruption, mute, captions, and explicit human-Founder handoff;
- Home, Council, Support, Onboarding, institutional-demo, and general product contexts;
- Firebase Hosting and preview rewrites for the new protected endpoints;
- regression tests that reject stock-Founder substitution.

## Deliberate fail-closed boundaries

Source completion is not Founder digital-human certification.

The runtime remains incomplete for full-vision launch until:
- a real private Founder voice exists, passes holdout evaluation, and is configured as FOUNDER_ELEVENLABS_VOICE_ID;
- FOUNDER_VOICE_ENABLED=true is intentionally enabled only after acceptance;
- ADAM_PRESENCE_ENABLED=true is enabled only in an approved environment;
- a private Founder visual/digital-human model is created and accepted;
- realtime visual lip/face/body presence is bound to this runtime;
- cross-property adapters are installed in Labs, Marketing, Investors, B2B, Studio, Foundation and any other approved launch surface;
- admitted locales have language/voice/lipsync/caption evidence;
- provider, accessibility, latency, mobile/desktop/XR, failure/fallback and kill-switch evidence is retained;
- exact-head review, governed deployment and post-deploy proof are complete.

No public/premade avatar or stock voice may silently impersonate Adam.
