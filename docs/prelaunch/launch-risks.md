# Launch Risk Register

Date/time: 2026-06-04 UTC

| Risk | Severity | Likelihood | Mitigation | Owner | Go/no-go impact |
| --- | --- | --- | --- | --- | --- |
| Mobile crop issue | P2 | Medium | Test small/large iPhone and Android viewports; fix overflow before launch. | Founder / frontend | Go with limitation only if minor; no-go if core controls blocked. |
| Missing final assets | P3 | Medium | Hide asset-dependent sections; launch with clean copy and demo CTA. | Founder / media | Go with limitations if no broken placeholders. |
| AI provider unavailable | P1 | Medium | Verify fallback mode; disable Companion AI if needed. | Founder / engineering | No-go if Companion crash breaks demo. |
| Firebase write failure | P1 | Medium | Verify waitlist write and graceful failure state. | Founder / engineering | No-go if waitlist fails without graceful fallback. |
| Waitlist failure | P1 | Medium | Smoke test `/api/waitlist`; verify validation and success/failure states. | Founder / engineering | No-go if launch CTA cannot safely capture interest. |
| Privacy copy confusion | P2 | Medium | Review launch copy and Passport promise; add sample-data disclosure. | Founder / copy | Go with limitation if not misleading; no-go if privacy promise unclear. |
| Demo misunderstood as personal data | P2 | Medium | Keep "This demo uses sample data" visible on demo/profile/media. | Founder / media | No-go if users could reasonably infer private Adam data is shown. |
| Admin allowlist misconfigured | P0 | Low | Verify signed-out and unauthorized denial; confirm admin-only paths. | Founder / engineering | No-go. |
| Performance on older phones | P2 | Medium | Test reduced sensory mode and first load on mobile. | Founder / frontend | Go with limitation only if demo remains usable. |
| Audio autoplay issue | P3 | Medium | Ensure audio fails silently and does not loop unexpectedly. | Founder / frontend | Go with limitation if noncritical. |

## Current Risk Decision

Open risks remain until command execution and manual verification are completed. No critical privacy/admin blocker may be accepted for launch.