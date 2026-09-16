# UrAi Spatial — Claude Code Operating Contract

This file is for Claude Code and other AI coding agents working in this repository.

## 1. Authority and freshness

- Never assume a remembered SHA, PR state, workflow result, deployment state, or visual approval is current.
- Before making claims about the active release candidate, fetch current GitHub metadata and verify the exact source head.
- Evidence is exact-head scoped. A workflow, review, screenshot, approval, governance receipt, or deployment proof from an older source head is historical only.
- Do not transfer Gold-Master, pixel, accessibility, review, or governance acceptance across a source-head move.

## 2. Current repository/runtime baseline

- Monorepo package manager: `pnpm@10.0.0`.
- Node engine: `>=22`.
- Primary app workspace: `urai-tier1`.
- Use repository scripts instead of bypassing their wrappers when a script already exists.
- Do not replace or weaken governance, privacy, accessibility, security, performance, or release checks just to make a lane green.

Useful root commands include:

- `pnpm doctor`
- `pnpm check:types`
- `pnpm test:canon`
- `pnpm test:unit`
- `pnpm test:integration`
- `pnpm test:e2e`
- `pnpm test:visual:spatial`
- `pnpm verify:release:critical`
- `pnpm verify:release`
- `pnpm verify:release:full`
- `pnpm runtime:authority`
- `pnpm home:invariant`

Run the narrowest relevant checks first. Escalate to broader verification only after the focused lane is clean.

## 3. Parallel-agent rule: Claude + Codex

Claude and Codex must not independently edit the same working tree or freely mutate the same branch at the same time.

For every Claude task:

1. Start from the explicitly identified current authority SHA or branch.
2. Create an isolated branch/worktree for the task.
3. Keep the task scope narrow and named.
4. Commit the result with a clear message.
5. Record the exact starting SHA and resulting SHA in the handoff.
6. Report files changed and tests actually run.
7. Hand the commit/branch back for independent Codex review and convergence.

Do not merge child lanes directly into production authority unless the user explicitly orders that exact merge after current-head review.

## 4. Git and shared-system safety

Encouraged without extra confirmation:

- read files;
- inspect history and diffs;
- create local/reversible edits in the assigned isolated branch/worktree;
- run targeted tests, typechecks, builds, and static analysis;
- create normal commits on the assigned branch.

Do not do these as shortcuts:

- `git push --force`;
- destructive `git reset --hard` against shared work;
- deleting branches, assets, evidence, or unfamiliar files merely to clear failures;
- bypassing hooks or checks with `--no-verify`;
- changing branch-protection/governance policy;
- merging or deploying without explicit authority;
- modifying secrets, provider credentials, billing, DNS, production databases, or live infrastructure unless the user explicitly assigns that action.

If blocked, preserve evidence and move to the next safe reversible action instead of weakening the gate.

## 5. Investigate before claiming

Never speculate about code that has not been opened.

When a task names a component, route, workflow, script, asset, PR, or file:

- inspect the actual source first;
- inspect relevant tests/contracts before changing behavior;
- check call sites when changing shared types or interfaces;
- distinguish source truth from generated evidence and documentation;
- distinguish observed runtime behavior from intended canon;
- state uncertainty when evidence is incomplete.

Do not claim a test passed unless it was actually run or a current exact-head CI result was actually inspected.
Do not claim literal-pixel acceptance from generated files that were not visually opened and inspected.

## 6. Locked Home / spatial canon currently governing convergence

Treat live GitHub authority as final when it is newer than this file. At the time this contract was created, the active convergence canon includes:

- Home presentation uses a visible user Avatar in cinematic third person.
- Activating/clicking the Avatar enters persistent walkable first-person Home.
- Normal desktop/mobile first-person does not invent floating player hands; tracked hands are an XR/VR concern.
- The broad visible Home sky owns Life Map ascent. Do not reintroduce a localized Life Map portal/ring/white-dot/doorway/ground hotspot.
- Ground is a distinct first-person lived world.
- Life Map is a layered explorable personal universe, not a dashboard, graph, timeline, generic solar system, or unexplained star wallpaper.
- Focus is the selected-memory approach/interior bridge into Replay.
- Replay is source-first spatial memory experience, not a generic video player, slideshow, HUD, or fabricated photoreal history.
- Replay must distinguish recorded evidence, supported context, interpretation, and unknown information.
- Canonical unwind remains `Replay -> Focus -> Life Map -> Home` with semantic Back/Escape ownership.
- Visual, accessibility, privacy, security, performance, review, and governance gates remain fail-closed.

If newer exact-head repository authority contradicts this section, stop treating this snapshot as current and reconcile the file before implementation.

## 7. Scope discipline

Avoid over-engineering.

- Make only changes directly required for the assigned task or clearly necessary for correctness.
- Do not perform opportunistic large refactors during a focused repair.
- Do not replace authored/governed assets with primitives or placeholders and call the task complete.
- Do not duplicate an existing authority when the correct action is to reconcile or reuse it.
- Do not create new canon casually. Recover and reconcile existing canon first.

## 8. Visual and spatial work

For visual acceptance work:

- verify the actual active renderer and route;
- verify governed assets are the runtime assets actually consumed;
- inspect loading, fallback, reduced-motion, accessibility, and no-WebGL states;
- preserve deterministic capture conditions when proof workflows depend on them;
- open generated screenshots/artifacts before describing them as accepted;
- treat a workflow marked skipped as not accepted unless the governing contract explicitly says otherwise.

## 9. Handoff format to Codex

End each coding lane with a compact handoff containing:

- task goal;
- starting authority SHA;
- branch/worktree name;
- resulting commit SHA;
- changed files;
- tests/checks actually run and their results;
- any failures or unresolved uncertainty;
- conflicts with newer authority, if discovered;
- explicit statement that no merge/deploy occurred unless one was specifically authorized and verified.

This handoff is evidence for review, not automatic approval.

## 10. Definition of done for a Claude lane

A Claude lane is done only when its assigned scope is implemented, relevant focused verification is complete, the changes are committed on the isolated branch, and the handoff is precise enough for Codex to review without guessing.

A Claude lane being done does **not** mean the UrAi release is merged, deployed, live, Gold Master, or independently approved.