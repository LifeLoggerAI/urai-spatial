# Native doorway keyboard failure diagnosis

Source: hosting candidate bd98ef76faea86864dd8cad6e2648df9c564c442. Workflow 36315686364, job 108609828764. Five of six interactions passed; desktop keyboard Home-to-Ground timed out at the unchanged 20-second limit. Artifact 10931466205; runner-reported SHA256 656f2fc09c91fe3e8639e5e303834781eeba3cfb4726a3b1e74fe02a112c3115 (not independently downloaded in this continuation).

Adds bounded synthetic-control event tracing, retained across page navigation via the browser context binding. Records focus, Enter/Space, click cancellation, destination request and route pathname; no text, credentials or private event payload. This does not establish the root cause or fix the navigation failure.

Validation: Node syntax check; injected event test confirms post-dispatch cancellation, target identity, travel dispatch, unrelated-target filtering and exclusion of private payload. Original navigation timeout, acceptance conditions and failing exit remain unchanged. Exact-head browser rerun and independent approval outstanding. No deployment.
