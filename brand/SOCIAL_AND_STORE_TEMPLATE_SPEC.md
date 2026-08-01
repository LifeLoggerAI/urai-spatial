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
