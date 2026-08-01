# UrAi Twenty-Language Localization Readiness

Status: source-language and engineering readiness authority. Machine-prepared text is not human-approved translation.

## Launch locale set

The governed initial preparation set is:

1. English (`en`)
2. Simplified Chinese (`zh-Hans`)
3. Hindi (`hi`)
4. Spanish (`es`)
5. French (`fr`)
6. Modern Standard Arabic (`ar`)
7. Bengali (`bn`)
8. Brazilian Portuguese (`pt-BR`)
9. Russian (`ru`)
10. Urdu (`ur`)
11. Indonesian (`id`)
12. German (`de`)
13. Japanese (`ja`)
14. Swahili (`sw`)
15. Turkish (`tr`)
16. Vietnamese (`vi`)
17. Filipino (`fil`)
18. Korean (`ko`)
19. Italian (`it`)
20. Persian / Farsi (`fa`)

This list is a preparation target, not a claim that all locales are translated, reviewed, supported in production, or available at launch. Dutch, Polish, Hebrew, Traditional Chinese, and Thai are not launch-authority locales in this revision and may be added only by a later approved expansion.

## Canonical string rules

- English source strings use stable semantic IDs rather than copied UI text as keys.
- Product names remain `UrAi` and `RuAi` in every locale unless legal review authorizes a localized mark.
- Organization names remain `URAI Labs`, `URAI Foundation`, and `URAI IP Holdings`.
- Strings must identify context, screen, character limits, placeholders, plural behavior, and accessibility use.
- No sentence is assembled by concatenating translated fragments.
- Variables use named placeholders and provide translator descriptions.
- Medical, legal, privacy, security, financial, and clinical wording requires specialist review in each locale.
- Locale codes, translation memories, screenshots, captions, voice assets, and review receipts must use the exact governed locale IDs above.

## Fallback policy

1. Requested locale and region variant.
2. Base language where available.
3. English source.
4. A safe unavailable-state message rather than missing, malformed, or mixed-language critical instructions.

Critical consent, privacy, payment, account, and safety surfaces must not silently fall back where local law or product policy requires reviewed localized text.

## Layout readiness

Every launch template must support at least 35 percent text expansion. Components must avoid fixed text heights, clipped buttons, image-baked English, and direction-dependent icons.

Arabic, Urdu, and Persian / Farsi require:

- `dir=rtl` at the document or bounded surface level;
- mirrored reading order and directional navigation where appropriate;
- non-mirrored UrAi and RuAi marks;
- correct treatment of numbers, URLs, email addresses, and mixed-script content;
- visual QA by a fluent reviewer.

Simplified Chinese, Japanese, Korean, Bengali, Hindi, Arabic, Urdu, and Persian / Farsi require verified font fallback and glyph coverage before approval. Font choices must preserve readability, licensing, and platform availability.

## Formatting readiness

Use locale-aware APIs for:

- dates and times;
- time zones;
- relative time;
- decimal and grouping separators;
- percentages;
- currencies;
- units;
- plural and select rules;
- list formatting.

Do not store display-formatted dates, times, numbers, or currencies as canonical data. Brazilian Portuguese must use `pt-BR` rather than an unspecified Portuguese locale for launch assets and review records.

## Screenshot and marketing masters

- All text remains replaceable in the source template.
- Each export records locale, direction, source-template version, copy revision, reviewer state, and SHA-256.
- Certified runtime captures remain unchanged; localized framing panels may surround them without falsifying the captured UI.
- `Now live` remains blocked until issue #999 has terminal production proof.
- Machine-prepared locale exports are watermarked or metadata-labeled `native review required` and cannot be used as approved store listings.
- RTL screenshot reviews must cover Arabic, Urdu, and Persian / Farsi independently; one RTL approval does not authorize the other two.

## Captions and audio descriptions

Caption masters must include speaker identity where needed, meaningful non-speech audio, timing, and reading-speed review. Audio descriptions must describe essential visual information without making emotional, clinical, or personal inferences unsupported by the scene.

## Verification matrix

Each locale must eventually record:

- translation source and revision;
- native reviewer and date;
- legal or specialist review where applicable;
- automated placeholder and missing-key checks;
- text-expansion result;
- RTL result where applicable;
- font and glyph coverage;
- keyboard and screen-reader behavior;
- captions and audio-description status;
- store screenshot status;
- production admission and rollback identity.

Until those fields are complete, the locale remains preparation-only.
