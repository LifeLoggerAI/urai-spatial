# URAI Spatial Asset Factory

This directory is the source of truth for launch-grade URAI spatial assets in the `urai-spatial` app.

No orphan assets. No loose paid files. Every generated model, texture, image, particle, or environment must map to a route, component, product moment, and launch purpose before it is integrated.

## Route asset rules

- `/` and `/home`: Home world, portals, cinematic loading
- `/ground`: ground terrain, portals, light trails
- `/life-map`: galaxy sky, memory stars, star feedback, light trails
- `/focus`: star-entry tunnel, memory chamber, selected star, light trails
- `/replay`: replay film object, memory chamber, light trails
- `/passport`: passport/status room layer, portals
- `/status`: passport/status room layer, cinematic loading

## Accepted formats

- Models: `.glb`, `.gltf`
- Textures: `.webp`, `.ktx2`, `.png` only when needed
- Procedural configs/fallbacks: `.json`

## Replacement workflow

1. Add the optimized final asset file under the matching route/category folder.
2. Update `manifest.json` with `file_path`, `status: ready`, `license`, `cost`, and `source`.
3. Keep fallback in place.
4. Run `npm run assets:audit`, `npm run assets:report`, `npm run assets:missing`, `npm run typecheck`, and `npm run build`.

## Experience rules

- Home is a 3D world.
- Ground is reachable from the default world.
- Life Map feels like looking up into a galaxy sky.
- Focus feels like flying into a selected star.
- Replay feels like opening a memory film inside that star.
- Passport and Status feel like rooms or control layers inside the world.
- Loading must feel cinematic, not blank.
- Mobile first-frame composition must look intentional and premium.
