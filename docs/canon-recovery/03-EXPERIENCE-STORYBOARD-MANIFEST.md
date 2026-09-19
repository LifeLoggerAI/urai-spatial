# URAI Experience and Storyboard Manifest

Status: PARTIAL / SOURCE-BACKED

Legend:
- VERIFIED = source/story behavior exists
- PARTIAL = behavior exists but storyboard coverage is incomplete
- MISSING = no sufficient storyboard artifact yet located
- FUTURE = established future concept, not current launch requirement

| Experience | Start -> End | Storyboard status | Required coverage |
|---|---|---|---|
| First launch | darkness -> life-core/world formation | PARTIAL | desktop, mobile, reduced motion, privacy explanation |
| Home | arrival -> world-ready | VERIFIED/PARTIAL | literal accepted frame set + alternate states |
| Ascent | Home -> Life Map | VERIFIED | transition timing, camera, reduced motion |
| Ground | Home/Ground entry -> grounded exploration | PARTIAL | mobile + reduced motion + return |
| Life Map | overview -> selected star | VERIFIED/PARTIAL | overview, regional, intimate scales |
| Focus | selected star -> intimate memory arrival | VERIFIED | selection handoff, camera, context UI |
| Replay | Focus -> cinematic reconstruction -> unwind | VERIFIED | playback, pause, exit, reduced motion |
| ESC unwind | Replay -> Focus -> Life Map -> Home | VERIFIED | keyboard/controller/touch equivalents |
| Orb interaction | idle -> activated/reflective state | PARTIAL | all canonical Orb states |
| Mirror | permission gate -> reflection -> accept/edit/reject | PARTIAL | sensitive-state variants |
| Shadow | gate -> safe exploration -> exit/integration | PARTIAL | trauma-safe/no-forced-entry variants |
| Legacy | archive entry -> item/thread -> export/share boundary | PARTIAL | long-term continuity and permissions |
| Council | question/context -> role deliberation -> suggestions | PARTIAL | consent/context scope + no-authority over user |
| Passport | identity/context -> permission configuration | PARTIAL | onboarding + later edits |
| Rituals | trigger -> practice -> completion/reflection | MISSING/PARTIAL | ritual library, audio/haptic, accessibility |
| Emotional Weather | observation -> weather field -> explanation/reflection | PARTIAL | evidence display + manual correction |
| Mood Forecast | history -> scenario/forecast -> user interpretation | FUTURE/PARTIAL | non-prediction labeling |
| Memory capture | signal/manual input -> review -> memory object | PARTIAL | consent and data-source states |
| Memory exploration | query/selection -> context -> links | PARTIAL | search jump, semantic zoom |
| Relationship constellation | person star -> shared memories | FUTURE/PARTIAL | consent/sharing boundaries |
| Goal journey | memory/reflection -> goal -> milestones/actions | FUTURE/PARTIAL | build-state progression |
| Future simulation | present -> branching paths -> editable scenarios | FUTURE | explicit uncertainty |
| Dream Planetarium | spatial entry -> dream star interaction | FUTURE/PARTIAL | AR/VR variants |
| Life Museum | entry -> era/memory room | FUTURE/PARTIAL | VR/spatial variants |
| Companion manifestation | summon -> interact -> dismiss | FUTURE/PARTIAL | safety + silence rules |
| Private vault | visible sealed region -> consent unlock -> re-seal | PARTIAL | strongest privacy proof |
| Offline/edge | connected -> disconnected -> local continuity -> resync | MISSING | conflict/resync states |
| Permission denied | action -> blocked state -> explanation | MISSING/PARTIAL | every sensitive capability |
| Empty state | no personal data -> meaningful starter world | MISSING/PARTIAL | no fake-personalization rule |

## Frame specification required for every completed storyboard

Each frame must record:
- user state
- visual composition
- user action
- system reaction
- camera/transition
- sound
- haptic behavior if applicable
- accessibility behavior
- privacy/consent state
- resulting state
- source authority
- accepted reference image IDs

## Canonical flow note

Two related flow records coexist:
1. design phase chain: `Home -> Ascent -> LifeMap -> Focus -> Replay`
2. current public route contract: `/ -> /home -> /ground or /life-map -> /focus -> /replay`

The final storyboard set must show where Ground branches and how Ascent functions as a transition rather than treating these as competing product identities.
