# Home proof snapshot remediation

The predecessor is Spatial `f7282a543de70f3edca1be848e16fcf6a19348d8` on PR #1462. Concurrent commits `226f731` and `8c910df` already repaired the canvas query and accessibility readiness snapshot. This follow-on preserves both, consolidates the remaining visual proof reads and releases held keys on failure; it does not establish a release freeze or resolve the Home visual-quality finding.

## Failure evidence

- Continuous Spatial Visual Proof run `36839268333`, job `110304535976`, artifact `11153336082`: the visual group timed out at `verifyHome` while evaluating an already resolved canvas. Twelve screenshots were retained, ending at the calming Orb state. The matrix was incomplete.
- Accessibility Performance Evidence run `36839268955`, job `110304796057`, artifact `11153717861`: both attempts of the reduced-motion embodied-exploration test exhausted the 180-second budget. Trace events show successful serial attribute operations taking about 16 seconds apiece. The displacement assertion began after the timeout and context teardown. This is evidence of proof overhead; it does not by itself prove that product performance is acceptable.
- Native PR review submissions returned an empty list at this checkpoint. Machine results are not independent approval.

## Repair

The grouped visual runner collects owner count, actual canvas geometry and visibility, runtime attributes, fallback visibility and semantic navigation measurements in one browser evaluation. The existing acceptance predicate remains intact. Missing elements, duplicate owners and incorrect attributes still fail it.

The embodied-exploration readiness helper polls one snapshot for canvas visibility, asset and interaction readiness, input ownership, telemetry ownership and numeric movement fields. The displacement thresholds are unchanged. Keyboard input is released in a `finally` block.

## Acceptance still required

Run the complete visual and accessibility workflows against the resulting commit. Inspect all resulting screenshots and retain diagnostics, traces and receipts. Until those runs complete, these defects remain **repair proposed awaiting exact-head validation**.

The retained predecessor Home screenshot still shows simplified terrain, repetitive vegetation and block-like furniture. The inhabited natural sanctuary visual standard remains unmet. This change does not promote assets, alter production, bypass governance or confer approval.

Authenticated Google Admin inspection confirms UrAi has primary domain `urai.life`. Its verified secondary domains are `geturai.app`, `geturai.life`, `ruai.app` and `ruai.life`. The latter two `.life` secondary domains report attention required for email setup. Neither `urai.app` nor `urailabs.com` appears in this tenant. No mailbox or alias change was made. Support and legal delivery failures remain open pending inspection of the separate account and actual delivery verification.
