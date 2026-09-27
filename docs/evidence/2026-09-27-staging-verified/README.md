# Staging source verification

Candidate: LifeLoggerAI/urai-staging PR48, c38c9bc9fc9f3d9c074bbe72a13402eefb2a1bbf.
Run: https://github.com/LifeLoggerAI/urai-staging/actions/runs/36314127277
Artifact: 10929882845, 1918 bytes; independently verified archive SHA-256 eee0e42bae559a558e724382de112b3eabd9204b97d2fbcdd118fded7922be97.

All 12 bootstrap commands pass, including types, lint, 25 unit tests, 14 emulator rule tests and build. Six additional local workflow/WIF/private-ref/IAM/billing contract checks pass against the same source configuration. Local checks validate source contracts only, not cloud IAM state or private-ref execution.

Source readiness is verified within this scope. Production allowed=false; cloud deployment, live smoke and provider mutation all false. Separate CI was queued at receipt time. Independent review and protected provider proof remain outstanding. The numeric bootstrap score is not whole-system certification.
