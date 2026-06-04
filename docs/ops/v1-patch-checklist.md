# V1 Patch Checklist

Run this checklist before every Genesis V1 patch.

- Confirm no sensitive defaults changed.
- Run privacy tests.
- Run AI boundary tests.
- Run demo mode test.
- Run build.
- Run smoke test.
- Verify `/demo`.
- Verify `/u/adamclamp`.
- Verify waitlist.
- Verify admin denied when signed out.
- Verify Passport still controls layers.
- Verify Shadow/Legacy/Export off by default.
- Update changelog.
- Update version if needed.
- Review `docs/prelaunch/launch-decision.md` before public launch.
- Do not launch while final decision is `NO-GO`.

## Notes

- Use `pnpm patch:check` as the lightweight default check.
- Add targeted tests when the patch touches auth, Passport, AI, exports, or Firestore rules.
- Do not ship when a P0 privacy or safety issue remains unresolved.
- For the final public demo launch, complete the full prelaunch package in `docs/prelaunch/` before changing the decision to GO.