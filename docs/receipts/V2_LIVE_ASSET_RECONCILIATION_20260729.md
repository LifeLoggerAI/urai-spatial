# URAI V2 Live Asset Reconciliation — 2026-07-29

Program tracker: issue `#206` in the generation repository.

This lane performs zero provider calls and zero spend. It verifies the current `urai-spatial` runtime registry and requires every one of the 80 canonical V2 living-system asset paths to exist under `urai-tier1/public/assets/urai/v2`.

The verifier emits `urai-tier1/v2-asset-proof.json` containing expected, present, missing, and exact missing paths. The workflow receives no OpenAI secret, no provider authorization, no Firebase deployment credential, no runtime promotion permission, and no production deployment authority.

A passing artifact classifies the runtime files as existing candidates only. Visual quality, source rights, provider receipts, SHA inventory, and independent acceptance remain separate certification gates before they can be treated as fully accepted production assets.
