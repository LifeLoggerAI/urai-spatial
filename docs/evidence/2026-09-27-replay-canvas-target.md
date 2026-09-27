# Replay canvas targeting receipt

Production Verify run 36307244540 on exact head
443034df83b0f424c31f7f0b3706cd9e582ae8d7 failed with
`Replay spatial canvas is not visible` in job 108586177849.
Its retained diagnostics are artifact 10927194074:
https://github.com/LifeLoggerAI/urai-spatial/actions/runs/36307244540/artifacts/10927194074

The new pixel assertion selected `canvas.replaySpatialCanvas`, but installed
React Three Fiber 9.6.1 applies Canvas props to its outer div and renders an
unclassed canvas inside its measuring div. Rendering the installed Canvas with
React DOM server confirmed that wrapper/descendant structure. The selector now
targets `.replaySpatialCanvas canvas`, scoped to the cinematic Replay client.

The visible-canvas requirement, live WebGL-context check, 64x36 pixel sample,
24 coarse-color minimum, and all existing timing requirements are unchanged.
This fixes a targeting error; it does not establish visual acceptance or prove
the scene passes the pixel threshold.

Local checks: installed-component markup assertion, JavaScript syntax,
Replay memory-theater contract, and git diff whitespace check passed.
Fresh exact-head browser CI and independent acceptance remain required.
