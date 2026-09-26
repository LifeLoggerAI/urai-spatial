# UrAi Social and Store Template Specification

Status: implementation-ready specification; visual master and legal approvals remain external gates.

## Rules

1. Every template derives from the approved UrAi or RuAi master mark.
2. Text remains replaceable and localization-safe. Do not bake English copy into the only source.
3. Runtime screenshots must come from retained certified captures or a newly validated preview build.
4. Every export records source template, version, dimensions, locale, SHA-256, and approval state.
5. `Now live` exports remain disabled until protected production proof passes issue #999.
6. User data, private memories, names, faces, locations, and health details may not appear in public examples.

## Social templates

| ID | Canvas | Safe area | Purpose |
|---|---:|---:|---|
| social-og | 1200 x 630 | 96 px | Open Graph and general link preview |
| social-x | 1200 x 675 | 96 px | X large-image card |
| social-linkedin | 1200 x 627 | 96 px | LinkedIn share |
| social-square | 1080 x 1080 | 96 px | Product Hunt, press, profile campaigns |
| social-story | 1080 x 1920 | 120 px sides, 240 px top/bottom | TikTok, Reels, Shorts, Stories |
| youtube-banner | 2560 x 1440 | central 1546 x 423 | YouTube channel banner |
| youtube-thumb | 1280 x 720 | 64 px | YouTube thumbnail |
| crowdfunding-hero | 1600 x 900 | 96 px | Kickstarter and GoFundMe hero |

Required structured layers:

- background treatment
- environment or certified product capture
- contrast scrim
- approved logo lockup
- eyebrow
- headline
- supporting line
- state badge (`Private beta`, `Coming soon`, `Preview`; `Now live` gated)
- accessibility description
- locale and text-direction metadata

## Store masters

### Apple

- App icon master: 1024 x 1024, opaque, no rounded-corner baking.
- Phone screenshot source: highest certified portrait viewport available; crop only from real captures.
- Tablet screenshot source: certified tablet viewport where available.
- Promotional copy and screenshots must avoid unsupported medical, compliance, security, or outcome claims.

### Google Play

- App icon master: 512 x 512.
- Feature graphic: 1024 x 500.
- Phone and tablet screenshots must originate from certified runtime states.
- Maskable-safe icon zone must preserve the entire essential orb geometry within the central safe region.

## Required store panels

1. Private, permission-bound life replay.
2. UrAi Orb and companion interaction.
3. Life Map and memory replay.
4. Accessibility-aware experience.
5. User control, consent, and data choices.
6. Passive capture explanation without claiming invisible, unlimited, or background collection.

## Copy foundations

Approved headline directions:

- Your life, reflected with permission.
- Private life replay, built around your choices.
- Notice the moments that shaped your day.
- A companion for remembering, reflecting, and reconnecting.

RuAi headline directions:

- Authorized data workflows with visible consent and provenance.
- Research and clinician access only within granted permissions.

Disallowed without retained evidence and approval:

- Diagnoses you early.
- Prevents suicide, PTSD, relapse, or disease.
- Fully anonymous.
- HIPAA compliant.
- End-to-end encrypted.
- Clinically proven.
- Pays every user.
- Now live globally.

## Veteran-led and steward story

The product-led story does not require a face. Approved factual framing may identify URAI Labs as veteran-led. It must not imply endorsement by the Department of Veterans Affairs, Department of Defense, or any military branch.

## Localization

All masters must support at least 35 percent text expansion. RTL layouts mirror reading order but do not mirror the UrAi or RuAi marks. Machine-prepared translations are labeled `native review required` until approved.

## 2026 provider submission gates

Verified against current Apple App Store Connect Help and Google Play Console Help on 2026-09-25. These are provider gates, not source-only claims.

### Google Play

- Store app icon: 512 x 512 px, 32-bit PNG with alpha, maximum 1024 KB.
- Feature graphic: 1024 x 500 px, JPEG or 24-bit PNG with no alpha.
- Store listing assets must accurately reflect functionality present in the submitted build.
- The Play Data safety form and privacy policy must accurately cover the app and integrated SDK/provider behavior for every published testing/production app where required.
- If the app enables account creation, the release package must expose the applicable account/data deletion request path and the Play Data safety deletion answers must match runtime behavior.
- Gated/private functionality requires valid review access instructions or credentials in Play Console.
- Android developer/app registration and verification requirements effective 2026-09-30 are a release gate; source code cannot satisfy that account-holder step.
- The Health apps declaration is required in Play Console; wearables/health capabilities must be declared according to the actual submitted build, not roadmap intent.
- Target API, sensitive-permission and contacts/location declarations must be re-verified immediately before submission.

### Apple App Store

- App icon submission follows the native app build/asset catalog or current Apple icon tooling; a source 1024 px master remains a design source, not evidence of an accepted App Store build.
- App Store screenshots must use accepted App Store Connect screenshot dimensions/formats and show the real submitted experience. Apple currently accepts 1 to 10 screenshots per required device family; uploaded screenshots cannot contain alpha/transparency.
- If the app runs on iPad, the required iPad screenshot family must be supplied.
- App Privacy information and the iOS privacy policy URL must be completed accurately before submission/update.
- Privacy answers must describe actual collection, linkage, tracking and provider behavior across the submitted app platforms.
- Signing, agreements, App Store Connect roles, build upload, export/privacy declarations and App Review remain account-holder/provider gates.

### Cross-store truth rule

No store copy or screenshot may advertise a provider, wearable, health, social import, phone agent, XR device, locale, privacy/security property or other feature that is not enabled and verified in the exact submitted build.

Store-ready means all of: admitted brand master, correct derivatives, certified runtime captures, localized copy for each claimed locale, accessibility review, privacy/data-safety mapping, support/contact/account-deletion paths, package/signing identity, provider review metadata and a retained submission receipt.
