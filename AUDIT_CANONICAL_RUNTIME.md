
# AUDIT_CANONICAL_RUNTIME.md

## Root command chain

The root `package.json` delegates all primary scripts to the `urai-tier1` package using `pnpm --filter`.

- **dev:** `pnpm --filter urai-tier1 dev`
- **build:** `pnpm --filter urai-tier1 build`
- **start:** `pnpm --filter urai-tier1 start`

## Workspace routing

The `pnpm-workspace.yaml` file was not found. This indicates that the project is not a formal pnpm workspace, but the `--filter` command still effectively directs execution to the `urai-tier1` directory.

## Active package

The only active package is `urai-tier1`.

## Active page entrypoint

The verified entrypoint for the application is `urai-tier1/src/app/page.tsx`.

## Imported render tree

The runtime render tree is composed of the following components:

- `div`
  - `Canvas`
    - `ambientLight`
    - `CameraRig` (from `urai-tier1/src/engine/camera/CameraRig.tsx`)
    - `Starfield` (from `urai-tier1/src/engine/space/Starfield.tsx`)

## Build result

Attempting to build the `urai-tier1` package now.

## Runtime screenshot evidence

This will be provided after a successful build and run.

## Unverified areas

- The lack of a `pnpm-workspace.yaml` file means workspace package relationships are informal.
- The actual runtime behavior and appearance require a successful build and execution.
