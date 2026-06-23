# URAI Launch Evidence

Date: 2026-06-23
Repository: LifeLoggerAI/urai-spatial
Canonical app: urai-tier1

## Commits confirmed from previous execution

- f68524381f76a78f9ade6091a83a6ab91d822f63 — added Home World controls
- 6cc264743135fdfc5e02ef3e99691472c48bfefa — added Home launch CSS module
- 9aabc442fe10ff93cd6f109a725f1d4735490635 — created initial launch evidence

## Commits from this execution

- 0dd42d61e729035f85187d18830da2b80183b8ed — wired Home launch CSS module into HomeWorldProduction
- 5a685657d411419fbdb6a8fd41aa653ce15a6060 — expanded Ground World workforce roles and inspectable real-life objects
- d14386b668855f8d0d823ad9dbf501787efc2b7f — added Replay proof layers and protected legacy safety copy

## Source inspection

The canonical public app is `urai-tier1`.

Primary routes inspected in source:

- `/`
- `/home`
- `/ground`
- `/life-map`
- `/focus`
- `/replay`
- `/mirror`
- `/passport`
- `/status`

## Source updates

- Wired `HomeWorldProductionLaunch.module.css` into `HomeWorldProduction.tsx`.
- Home controls now use `launchStyles` for orb panel, self/avatar panel, companion panel, links, and council/workforce hint.
- Ground World now includes eight visible role presences: Guide, Builder, Archivist, Operator, Strategist, Protector, Mirror, and Legacy.
- Ground World now includes nine inspectable operational objects: Calendar tower, Inbox lantern, Task forge, Decision table, Privacy vault, Memory archive, Health/status beacon, Relationship thread, and Replay projector.
- Ground route includes the required message: “This is where your private AI workforce helps organize real life.”
- Replay proof now includes explicit cinematic route language, play/pause/restart controls retained, required layers, and safe legacy copy: “Legacy stays protected. Presence requires permission.”

## Public checks

Browser tool checks that loaded during this execution:

- `https://urai.app/`
- `/life-map` via root link
- `/focus` via root link
- `/replay` via root link
- `/mirror` via root link
- `/passport` via root link
- `/status` via root link

Container curl route loop was attempted for:

- `/`
- `/home`
- `/ground`
- `/life-map`
- `/focus`
- `/replay`
- `/mirror`
- `/passport`
- `/status`

Result: all returned `000` from this container network, so curl verification could not be trusted from this environment.

## Local commands / checks

Attempted:

- `pwd; ls -la; find . -maxdepth 3 -type d -name urai-spatial -o -name urai-tier1 | head -20`
- `for p in / /home /ground /life-map /focus /replay /mirror /passport /status; do curl -L ... https://urai.app$p; done`

Could not run repo-local `pnpm` checks because this execution environment does not contain a checked-out `urai-spatial` repository. The repo was available through the GitHub connector only.

Not run in this environment:

- install/workspace check
- lint
- typecheck
- unit tests
- build
- static export
- route smoke checks

## Deploy result

Deploy was not run. Firebase/project deploy credentials and a local repo checkout were not available in this execution environment.

## Known limitations

- GitHub contents API commits file updates one file at a time, so this run produced multiple connector commits instead of one multi-file commit.
- Direct browser opens for `/home` and `/ground` were blocked by the browser tool safety/open rule unless reached from a discovered link.
- Fresh live `/ground` verification remains pending from a networked shell or browser session.

## Next blocker

Run the repo-local checks and live deploy from an environment with the repository checkout, package install, Firebase credentials, and working outbound network access.
