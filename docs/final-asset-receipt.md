# URAI Final Asset Receipt

Generated: 2026-06-30T23:59:43.340Z

Result: STALE — NOT RELEASE EVIDENCE

This committed receipt predates the provider handoff generated on July 3, 2026. Its former `GREEN` result only proved that expected paths existed and classified all 51 core launch assets as `placeholder-final`; it did not recalculate SHA-256 values, verify byte sizes or image dimensions, prove provider source records, or confirm runtime consumption.

Do not use this committed file as production certification.

The canonical release workflow regenerates the receipt from the exact checked-out release SHA by running:

```text
pnpm --dir urai-tier1 receipt:assets
```

That command now runs `scripts/verify-provider-asset-handoff.mjs` first. A release receipt is valid only when:

- every core provider asset exists at the exact case-sensitive canonical path;
- the committed binary SHA-256 and byte size match the provider handoff;
- the WebP dimensions match the handoff;
- the handoff contains producer, source-path, and prompt-version records;
- every core route/UI/avatar asset is consumed by `uraiAssets.ts`;
- the generated verification JSON reports `ok: true`;
- the exact-head workflow uploads both the regenerated Markdown receipt and `release-control-evidence/provider-asset-verification.json`.

Until that exact-head verification executes successfully, asset certification status is **PENDING**.
