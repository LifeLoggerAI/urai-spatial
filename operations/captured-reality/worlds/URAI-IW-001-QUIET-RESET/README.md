# URAI Interpretive World 001 — Quiet Reset Sanctuary

This directory is the governed production authority for the first synthetic Gaussian-reconstruction pilot.

## Truth boundary

- Truth class: `INTERPRETIVE`
- Autobiographical: `false`
- Generated-only: `true`
- Source-truth eligible: `false`
- Runtime truth label: **Interpretive generated world — not camera-recorded history.**

No generated image, video, camera solve, Gaussian reconstruction, mesh, depth proxy, or derived asset from this lane may be reclassified as recorded-source truth or spatially reconstructable autobiography.

## Current state

The canonical hero and three anchor images exist. Eight survey passes have been submitted/generated. **None are visually accepted yet.**

That is intentional. The Runway-hosted media can be generated and tracked through the connected provider, but this execution runtime cannot ingest the provider's signed media bytes for literal visual inspection. Therefore all visual acceptance fields remain `pending`.

Do not feed any survey pass into COLMAP until a human or supported visual-review runtime explicitly accepts it.

## Rejection conditions

Reject a generated anchor or pass if any of these occur:

- landmark tree identity/shape changes materially;
- opening/door/ledge geometry moves or resizes;
- bench/cup/book/blanket appears, disappears, moves, or morphs;
- sun direction, exposure, or weather changes;
- camera cuts, teleports, zooms, rolls, or changes lens character;
- surfaces melt, crawl, duplicate, or change material;
- distant ridge/topology swaps;
- world scale changes;
- pass cannot maintain stable feature correspondences.

Rejected media must not enter reconstruction.

## Reconstruction gate

Accepted frames only:

1. extract at approximately 4 fps;
2. reject blur, temporal morphs, and near duplicates;
3. run COLMAP/SfM;
4. hard floor: 70% registered images;
5. target: 85% registered images;
6. mean reprojection error <= 1.5 px;
7. fixed-lens focal spread <= 5%;
8. camera path must be topologically coherent;
9. then train 3DGS;
10. hold out 10% of frames for validation.

Target held-out render metrics:
- PSNR >= 24 dB;
- SSIM >= 0.85;
- LPIPS <= 0.25.

These metrics do not replace literal visual review.

## Runtime gate

The feature remains hard-off behind `URAI_ENABLE_CAPTURED_REALITY`.

Current code budgets remain authoritative:
- mobile <= 64 MiB and >= 30 fps;
- desktop <= 160 MiB and >= 45 fps;
- XR <= 96 MiB and >= 72 fps.

XR requires separate physical-device proof and never inherits browser certification.

## Related authorities

- Parent release PR: #1462
- Tracking issue: #1472
- Production packet: Google Doc id `1NI_3TEhjhJPmscVUJ-Vd6Cc3feBvLMbETxRlZkasAy8`

This child lane is intentionally non-colliding with #1462. It does not authorize merge, production deployment, store release, or launch certification.

## Reconstruction receipt gate

The checked-in `reconstruction-receipt.pending.json` is intentionally classified `PRE_RECONSTRUCTION` and must remain so until literal visual review accepts the generated survey set.

Validate any promotion receipt with:

`node scripts/validate-interpretive-world-receipt.mjs <receipt.json>`

Promotion is progressive: visual/frame/camera/training/held-out QA establish reconstruction acceptance; browser, mobile, and XR each require their own runtime/performance evidence. XR never inherits browser/mobile readiness.
