# URAI External Action Register

Last verified: 2026-07-03

Only actions unavailable through current repository automation are listed here.

## Approved callback origin

Set the `asset-factory` secret named `URAI_JOBS_CALLBACK_ALLOWED_ORIGIN` to the exact approved HTTPS origin of the real Jobs callback service.

Reason: the approved production origin is not proven by current source, and a value must not be guessed.

## Legacy development Firebase mappings

Review `LifeLoggerAI/UrAi-Dev/.firebaserc`. Confirm the isolated staging project and remove historical mappings that reference canonical or old production targets. PR #5 blocks production use in the meantime.

Reason: sensitive Firebase configuration writes were blocked by the available repository write controls during this pass.

## Physical Quest verification

After an exact canonical deployment is proven, test `https://urai.app/spatial/ar-vr/` on real Quest hardware and record:

- headset and browser version;
- deployed commit;
- immersive entry and exit;
- head and controller input;
- movement, collision, teleport, snap turn, and portals;
- comfort and performance observations;
- timestamp and tester.

Reason: code and browser tests cannot certify physical hardware behavior.

## Paid provider authorization

Explicitly approve the provider, request scope, funded account, and cost ceiling before any paid image, narration, AI, billing, or other metered proof.

Reason: no paid work or billing change was authorized in this pass.

## DNS ownership

Use domain-owner access for any Foundation, Storytime, or other standalone-domain cutover and record the approved target and recovery records.

Reason: registrar and DNS ownership are external to repository authority.

## Professional approval

Obtain the appropriate written professional approval for child/family claims, regulated privacy claims, formal IP assignments or filings, investor representations, and corporate ownership statements.

Reason: repository automation cannot create professional or signed approval.

## Guarded production workflow dispatch

Only after all required checks are green and exact release and recovery commits are recorded, dispatch the canonical `urai-spatial` production workflow with its required acknowledgement.

Reason: the connected GitHub tool can inspect and rerun existing actions but did not expose a new workflow-dispatch operation in this session.
