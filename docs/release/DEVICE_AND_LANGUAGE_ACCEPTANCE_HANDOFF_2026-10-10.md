# UrAi device and language acceptance handoff

This is an execution procedure for existing adopted acceptance requirements, not an acceptance receipt. Use the final frozen candidate and its exact artifact; results from a predecessor remain predecessor evidence. No physical device, native-language review, provider sign-in, signing, or store delivery is accepted by this document.

## Candidate and evidence binding

Before testing, record the full source SHA, candidate preview URL, the build fingerprint returned by that preview, reviewer, UTC time, OS/browser/assistive-technology versions, device model, viewport, pixel ratio, renderer identity, and relevant native artifact SHA-256. Stop if the preview or installed package cannot be bound to the requested candidate. Record PASS, FAIL, BLOCKED, NOT AVAILABLE or genuinely NOT APPLICABLE with retained evidence; an empty cell is not a pass. Keep private account content and credentials out of public recordings.

The adopted device matrix is `docs/evidence/accessibility-performance-browser-device-matrix.json`. Its historical July entries do not certify a successor. The performance authority is `docs/accessibility-performance-evidence-plan-2026-07-18.md`; preserve any stricter current controller requirement.

## Physical accessibility and journey execution

1. On the candidate's actual static production build, traverse Home → Ascent → Life Map → Focus → Replay → unwind → Focus → Life Map → Home. Use a consented account and a real owned memory for private-path acceptance. A demo or anonymous fallback is a separately labelled case.
2. On Windows with NVDA and Chrome/Edge, use keyboard only: Tab/Shift+Tab, Enter/Space, arrows where advertised, and Escape/back. Record landmarks, announced labels/states, focus sequence, destination announcements, menu close/return focus, and the selected memory's identity through the journey. At 200% zoom, repeat menu and first/last route actions and verify reachable controls and readable content.
3. On Android with TalkBack, use touch exploration and swipe navigation. Repeat the journey and menu dismissal, rotate portrait/landscape, and verify actions can be activated without an underlying canvas intercept. Measure primary effective targets against the existing 48×48 CSS-pixel requirement and record safe-area/control/caption overlap.
4. On iPhone with VoiceOver and Safari, repeat touch exploration, reading order and the journey with browser bars expanded/collapsed, portrait/landscape and reduced motion. Record the actual official model and OS; an informal device nickname is insufficient for compatibility evidence. On an available Mac, repeat the adopted Safari/VoiceOver matrix cells.
5. Enable reduced motion/stimulation before loading; change settings while the app is open; verify the existing preferences take effect without duplicate UI or lost navigation. Exercise required captions, TTS and directional audio with sound both enabled and disabled. Record whether speech/audio really played on the named device rather than relying on synthetic API fixtures.
6. Test offline/slow-network interruption and recovery, background/foreground, denied permissions, and bounded no-WebGL/context-loss recovery using the existing supported controls or diagnostic procedure. Preserve memory ownership and selection; a recovery must not display another user's or demonstration content as the selected private memory.
7. Attach an exact reproduction and evidence for every failure. Retest the correction on the successor candidate; retain the original failure and identify which result it supersedes.

## Hardware performance

Use the production static export and proven hardware renderer. Capture at least 90 steady-state frames per required route. Existing budgets are desktop p95 ≤20ms, mobile p95 ≤33.3ms, at most one steady-state long task and none >100ms; five full journey cycles gate heap growth ≤32MiB. Record renderer/vendor and original timing/heap evidence. Software rendering or an unavailable renderer identity cannot accept hardware timing budgets. Device emulation cannot accept physical device performance. Check recovery for duplicate renderers, listeners, timers or animation loops.

## Native package acceptance

Android: use `distribution/android-shell/README.md`, `NATIVE_GOOGLE_AUTH.md`, `NATIVE_LINKS.md` and `AAB_TRANSPORT.md`. Download the exact candidate's native artifact and verify its transport/source hashes. Unsigned AAB preparation is not install, sign-in, Play delivery or signing custody. Before owner-authorized signing, confirm the existing upload certificate, durable key custody, canonical Firebase native configuration and current authenticated Play version/track state. Do not guess a successor version from an old release label. Test native sign-in/cancellation, restart/sign-out, private-route denial, permission denial, cold/warm app links and TalkBack on the resulting exact-source install. Store upload remains separately authorized.

iOS: use `distribution/ios-shell/README.md` to reconstruct and verify the complete source archive for the exact SHA. Unprovisioned compiler output has no Apple-team, device, TestFlight or App Store authority. A real build requires current enrollment/team authority, confirmed bundle identity, genuine Firebase Google/Apple configuration and signing/provisioning on an eligible Mac. Test native Google/Apple sign-in and cancellation, hidden-email account ownership, restart/account switch/sign-out, private-route denial, Apple revocation on account deletion, cold/warm Universal Links and VoiceOver. Do not relabel historical source preparation as this acceptance.

XR: execute only the adopted controller's applicable headset acceptance. `urai-tier1/scripts/xr/quest-device-validation.mjs` checks source/navmesh structure; its output is not measured headset input, frame rate or comfort. Bind the headset/browser/build identity and retain actual session entry/exit, recenter, supported input, locomotion, permission/recovery, UI containment and applicable performance evidence. Unavailable hardware remains an external dependency.

## Language review and admission

The governed launch list contains exactly 20 locales: en, zh-Hans, hi, es, fr, ar, bn, pt-BR, ru, ur, id, de, ja, sw, tr, vi, fil, ko, it, fa. At source `be452c594a3bdea5db8e9cf9f2df9ca22455041f`, all 20 registered catalogs contain 240 messages, but only English is native-reviewed and production-admitted. The scoped generator finds 232 wired registered IDs and explicitly records `wholeProductTranslated=false`. Catalog completeness does not certify whole-product translation or 20 production languages.

Generate successor evidence from the actual frozen checkout:

```sh
export URAI_EXACT_HEAD="$(git rev-parse HEAD)"
node --import tsx scripts/generate-localization-readiness.mjs
```

For each non-English locale, a qualified native reviewer must inspect the current registered catalog and actual supported route controls using the explicit working-preview setting in `/settings?lang=<locale>`. The preview is labelled pending review; unreviewed sensitive copy stays in reviewed English. Verify text meaning, terminology, placeholders, plural/number/date formatting, truncation, accessible pronunciation and speech selection. Review Arabic/Urdu/Persian RTL visual and reading order on actual route controls. Keep original-language memory content distinct from translated UI.

Record reviewed source/catalog identity, reviewer, coverage, issues and actual route/device evidence. Only after required review and current release-controller acceptance may an owner admit that locale through the existing `URAI_NATIVE_REVIEWED_LOCALES` mechanism. Do not add locales to that set merely to obtain a green test. Required product routes, policy copy and provider-generated language outside the registered core/geographic/founder scope still need their adopted coverage and real-provider evidence. Inert voice/conversation fixtures prove routing, not live language behavior.

## Reachable source verification on 2026-10-10

Accessibility donor #1783 (`3ef5d6e0ba717d63750eae58997c8bdc42dbe47d`) preserves the unique fallback, exact main role/name, route links, unique runtime-bound navigation owner, non-dominance flag and Orb accessible name. Native Accessibility Performance run `38016884472` passed at that donor SHA; its isolated cases and bounded archive transport are predecessor evidence until rerun on the integrated successor. Five local materialization tests passed after applying the same two-file donor to `be452c59`. The 129 localization/native-preparation/transport source tests passed on that local checkout. None of these source checks substitutes for the external review and devices above.
