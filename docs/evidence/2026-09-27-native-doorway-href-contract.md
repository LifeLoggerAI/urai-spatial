# Native doorway contract reconciliation

Native Doorway Proof run 36306649571 at
06bcd4fbe333815b71a221bf2bcc8770551c0d0a failed two of six interactions:
desktop keyboard to Ground and desktop pointer to Life Map stayed on Home.
Build and Chromium installation passed; this was not an infrastructure failure.
Artifact: https://github.com/LifeLoggerAI/urai-spatial/actions/runs/36306649571/artifacts/10928108417

That revision still renders React event-driven destination buttons. The existing
preserved UI line already replaces those buttons with native anchors and proves
Tab/Enter input, pointer/touch hit geometry and rendered Ground destination.
This change does not duplicate that runtime repair or retry the old workflow.

Local verification of the existing UI line exposed a stale source contract:
it expected direct constant href values, while the runtime now calls the
demo-only homeSemanticHref helper. Update the assertion to require the actual
native anchor, exact accessible name, correct destination constant and helper;
also explicitly reject destination anchor onClick interception.

Before: native doorway contract 6 passed, 1 failed. After: 7 passed.
Demo helper behavioral tests: 3 passed, including destination continuity,
explicit-only demo mode, and no unrelated/private parameter forwarding.
Syntax and whitespace checks pass. Browser gates and independent acceptance
remain required; this receipt does not certify navigation or visual quality.
