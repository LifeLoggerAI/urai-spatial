You have full repo/GitHub access, terminal access, browser access, screenshot access, and permission to inspect, run, patch, test, visually audit, document, commit, and deploy URAI Spatial.

MISSION:
Fully fix `/` and `/home` into a production-launch AAA+++ Home World experience.

Use the attached screenshot as the visual truth. Do not give advice only. Do not stop at analysis. Inspect the actual repo, identify every issue, make a complete fix plan, then implement the fixes directly.

PRIMARY OUTCOME:
Make `/` and `/home` feel like:

“I am standing inside my private living world, at the threshold between my grounded life and my sky/galaxy memory universe.”

Not:

“A landing page with big text over a cool space background.”

CURRENT SCREENSHOT TRUTH:
The page currently has a good visual direction, but it is not finished. It still feels like a flat hero page. The text is too dominant, the ground is not embodied enough, the sky is not a real ascent layer, the orb feels like a decorative logo object, the horizon is too obviously a UI divider, the avatar/council presence is missing or weak, and the clickable ground/sky affordances are not production-grade.

FIX EVERYTHING:
- Consolidate `/` and `/home` so they share one production Home World component.
- Reduce the giant headline so the world becomes the main character.
- Replace placeholder boxes and dashboard-feeling cards with environmental objects.
- Make the ground feel walkable, embodied, dimensional, and clickable.
- Add real-life artifacts/objects placed in the ground world with shadows and inspectable affordances.
- Add calm council/avatar presence in the ground world.
- Make the orb feel physically planted, glowing, breathing, and acting as the threshold between ground and sky.
- Soften the hard horizon line into a cinematic atmosphere transition.
- Make the sky feel alive, clickable, and connected to `/life-map`.
- Add semantic click/tap/keyboard access for sky ascent and ground entry.
- Wire sky click to `/life-map`.
- Wire ground click to `/ground` if it exists; otherwise implement the best existing embodied-world route.
- Add hover/focus states, accessible labels, reduced-motion support, responsive layout, and production polish.
- Remove prototype language, empty bordered boxes, generic HUD panels, and anything unfinished.
- Make desktop, laptop short-height, tablet, and mobile all work without clipping or overlap.

IMPLEMENTATION STEPS:
1. Inspect the repo structure for `/`, `/home`, Home World components, shared CSS, route wiring, `/ground`, `/ascent`, and `/life-map`.
2. Identify all current implementation files.
3. Write a concise fix plan.
4. Patch the code directly.
5. Consolidate duplicated route/component logic.
6. Upgrade the Home World scene visually and interactively.
7. Add embodied ground, sky ascent, orb threshold, council/avatar presence, and life artifacts.
8. Run lint/typecheck/build/tests available in the repo.
9. Start local dev server.
10. Visually audit `/` and `/home`.
11. Iterate until the screenshot no longer feels like a landing page.
12. Document files changed, commands run, test/build results, screenshots/visual notes, commit hash if committed, and deploy status.

QUALITY BAR:
Do not stop when it is merely better.
Stop only when `/` and `/home` feel like a finished threshold world:
ground below, memory above, avatar/council presence alive, orb as portal, sky as ascent, and the user immediately knows they can click down into their embodied world or up into their Life Map.

FINAL RESPONSE FORMAT:
Return:
- Brutal screenshot audit summary
- Implementation plan
- Files changed
- Commands run
- Test/build results
- Screenshots/visual audit notes
- Commit hash if committed
- Deploy status or exact deploy blocker
- Remaining issues, only if truly blocked
