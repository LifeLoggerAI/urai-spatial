# Replay renderer readiness lifecycle

Production Verify run36308605617 on5fa01009a15d2187c2c53218a3f7c74aef2fe581 failed because the corrected canvas probe found a lost WebGL context after the runtime reported render-ready. The browser gate correctly stayed red. Artifact10928771034 (10629935 bytes, SHA256a8eab41ed5696fcbb31d59ec4b7b4b348abcd7b3d83f04b666d582121bd7a120) retains diagnostics.

The previous runtime only checked the renderer's last draw-call count and left an unmanaged ready attribute on the parent. Nonzero historical counts could retain readiness through context loss; renderer removal had no reset. This bounded repair scopes readiness to a connected renderer, resets immediately on context-loss/restoration events and cleanup/texture change, checks current context health each frame, and still requires two rendered frames. The parent is retained for cleanup after canvas detachment. It does not request context loss, manufacture recovery or alter the browser's canvas/pixel assertions.

Six behavioral lifecycle tests and six Replay owner/contract tests pass; runtime TypeScript and whitespace checks pass. The existing source contract now checks the extracted lifecycle helper and unchanged two-frame threshold; behavioral tests cover loss with stopped frame loops, stale draw counts, restoration, texture replacement and unmount. The compact CI runner includes the new tests.

This corrects stale success reporting; it does not establish why the original GPU context was lost or certify a rendered scene. Fresh browser capture, context stability, pixel acceptance and independent review remain required. No deployment, private media change or provider execution occurred.
