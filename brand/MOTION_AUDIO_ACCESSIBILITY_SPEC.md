# UrAi Motion, Audio, Haptic, and Accessibility Specification

Status: implementation specification. No asset is production-approved until its manifest entry, source, rights, accessibility equivalent, validation evidence, and release status are complete.

## Governing rules

1. Motion must communicate state or spatial continuity; decorative motion cannot block input or obscure meaning.
2. Every meaningful animation has a reduced-motion equivalent and low-performance fallback.
3. Every meaningful sound has a visual or haptic equivalent.
4. Haptics never carry unique critical information without an equivalent visual or audio signal.
5. Audio candidates require documented source and rights evidence before production use.
6. Public examples must contain no private user data, memory content, names, faces, health details, or precise locations.
7. Sensory-safe mode disables nonessential flashes, pulses, ambient loops, layered effects, and surprise sounds.

## Motion inventory

| ID | Purpose | Default behavior | Reduced motion | Low-performance fallback |
|---|---|---|---|---|
| orb-idle | Show availability | Slow bounded luminance and scale breathing | Static glow | Static image |
| orb-listening | Confirm active capture initiated by the user | Directional pulse with visible text state | Static ring and text | Static ring |
| orb-thinking | Show bounded processing | Slow orbit or segmented progress | Determinate or indeterminate progress bar | Text state |
| orb-speaking | Associate output with companion speech | Amplitude-limited waveform | Caption highlight only | Text and icon |
| orb-event | Signal a new governed event | One short pulse sequence | Badge appearance | Badge only |
| orb-error | Explain recoverable failure | Single restrained state change | Static error mark and text | Text only |
| portal-transition | Preserve spatial continuity between worlds | Short depth transition | Crossfade | Immediate route change |
| sky-starfield | Enter the starfield from Home | Controlled zoom and opacity transition | Crossfade | Immediate state switch |
| constellation-draw | Reveal relationships between nodes | Progressive line reveal | Lines appear together | Static constellation |
| aura-pulse | Reflect an approved emotional state | Slow opacity breathing | Static aura | Static tint |
| recovery-bloom | Mark completion or recovery | Short non-flashing growth sequence | Final bloom appears | Static final frame |
| memory-selection | Confirm selected memory | Focus ring and bounded elevation | Focus ring only | Outline only |
| replay-entry-exit | Enter or leave replay | Short fade and camera settle | Crossfade | Immediate transition |
| companion-panel | Open and close companion UI | Slide and fade | Fade only | Immediate panel |

## Motion budgets

- No required interaction waits for animation completion.
- Default transitions target 150-400 ms; narrative transitions may be longer only when interruptible.
- Continuous idle motion must pause when hidden, backgrounded, low-power mode is active, or the user disables animation.
- Avoid rapid luminance changes and repetitive flashes.
- Runtime implementations must record frame budget, asset size, trigger, cancellation behavior, and route.

## Audio inventory

| ID | Meaning | Required equivalent | Rights gate |
|---|---|---|---|
| sonic-logo | UrAi identity | Visual logo reveal and optional haptic signature | Required |
| orb-activation | User-initiated companion activation | Visible active state and haptic confirmation | Required |
| insight | New non-urgent insight | Badge or visual indicator | Required |
| warning-soft | Recoverable warning | Warning text and optional haptic | Required |
| ritual-start | Ritual begins | Visual countdown or state label | Required |
| ritual-end | Ritual ends | Completion state and optional haptic | Required |
| portal-transition | World transition | Visual transition | Required |
| memory-transition | Memory entry or exit | Visual state change | Required |
| ambient-loop | Optional atmosphere | Silence is always valid | Required |

Audio manifests must record creator or provider, source URI or retained receipt, license, allowed uses, modifications, duration, sample rate, channels, loudness treatment, loop points, sensitivity classification, and SHA-256.

## Voice presets

Calm, supportive, neutral, and analytical presets describe pacing, emphasis, sentence length, and energy. They do not imply a diagnosis, clinical role, human identity, or guaranteed emotional outcome. Voice references containing a real person's likeness require explicit rights approval.

## Haptic vocabulary

| Pattern | Meaning | Constraint |
|---|---|---|
| confirm | User action accepted | Short and non-urgent |
| alert | Attention requested | Distinct from confirm; never used for marketing |
| urgent | Time-sensitive safety or account event | Requires visible and audible equivalent where permitted |
| navigation | Directional or route cue | Must not be the only navigation signal |
| social | Optional relationship cue | Off by default for sensitive contexts |
| mindfulness | User-started pacing rhythm | Interruptible and disabled in sensory-safe mode |
| morse | Explicitly enabled encoded cue | Must include readable decoded text |

## Accessibility verification

Each launch-relevant state requires evidence for:

- reduced motion
- keyboard navigation
- visible focus
- screen-reader name, role, state, and value
- captions for speech and meaningful audio
- audio description for major visual-only sequences
- 200 percent text resizing without loss of function
- high contrast and forced-colors behavior
- reduced transparency
- touch target sizing
- orientation behavior
- offline, permission-denied, unavailable, and low-power states

Manual review is required where automation cannot establish usability. A passing automated scan alone is not an accessibility approval.