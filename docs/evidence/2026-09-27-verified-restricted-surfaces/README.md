# Verified restricted surfaces — scoped evidence

Studio head b864ee48b1988e3a2af8105df612642c8cae2d76: seven returned workflow runs successful (six distinct workflows). Visual artifact 10929112342 / run 36311569261 ZIP digest independently matched 1b613344717e2dc2c7c1b68ea6be4eb44fbe1232ea9fa4990c50c898d185f7c9. Manifest covers six routes at desktop1440 and mobile430, 12 captures; all status200 and no reported fatal/overflow/errors.

B2B head 874d0ac3b33848a1fc4b4942f334d32772e9b83d: all three workflows successful. Visual artifact10928727700 / run36311581939 ZIP digest independently matched 2e05c29c3774aea0232869e3739f4f9fcef29307783cb0333a730a44727ecd90. Manifest covers seven routes at mobile390/tablet768/desktop1440, 21 captures; no reported browser/runtime/overflow findings.

Human-visible image inspection by this implementation assistant was limited to Studio /studio desktop+mobile and B2B / desktop+mobile. Layouts are readable and contained. Studio explicitly displays disabled action controls; B2B explicitly displays unavailable workspace pending authentication/production services. These captures certify neither authenticated workflows nor live provider execution. No independent reviewer acceptance or AAA+++ product certification claimed.

Replay lifecycle candidate PR1380, head992ace1b7c40a7388a6fb9b8b9907006064f3454, now contains internal asset-loading boundaries in both canvases. Twelve local contract/readiness tests and typecheck pass; rendered CI pending. Parent c406106dd10e90a92e7f4f0e72617ad6662c0487 still failed readiness with WebGL context loss. Assets, frame thresholds, pixel assertions and timeouts unchanged.
