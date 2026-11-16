# Spatial local braces security fork

This is a local MIT-licensed derivative of npm braces 3.0.3, identified as 3.0.3-urai.spatial.1. It is not an upstream fixed release. LICENSE, the upstream README, and UPSTREAM-PROVENANCE.json preserve the original distribution evidence. The existing licensed Privacy fork at LifeLoggerAI/urai-privacy@6e924f765dba68b1c5ae768c74df0df7e066a2c6 is the immediate source; its earlier documented origin is LifeLoggerAI/urai-investors@1ecff671d6fd2eb095828e5ab47a4bf7726aeb33.

GHSA-vfj7-8cjw-p6xm/CVE-2026-93687 has no patched upstream version at the 2026-10-08 inspection. The current Spatial parent already guards compile/expand/stringify with a fixed 64-depth RangeError contract. This derivative preserves that ceiling and error class while adding early parser checks for both brace and parenthesis containers. All four paths are bounded; caller options cannot raise the depth ceiling. Compile/expand/stringify count traversal from the root, so a 63-container expression with its terminal leaf is supported; a 64-container parse is bounded but later traversal may reject at the fixed walker limit. Existing 10000-character and numeric expansion limits remain intact.

The root manifest and pnpm 10.0.0 lock bind direct braces, Firebase CLI 15.32.1/chokidar 3.6.0, and Next ESLint 15.5.27/fast-glob 3.3.1/micromatch 4.0.8 to this local source. Retained regression cases continue to require the 64-depth RangeError and ordinary patterns. Additional tests exercise parser bounds, caller ASTs, actual watcher/glob consumers and registry-vs-fork provenance.

Registry scanners may omit local file dependencies. A zero registry count therefore does not establish an upstream fix or waive the recorded original HIGH. This is a reviewed-source mitigation candidate; native/full installed graph, matcher/build and independent acceptance gates remain required on the integrated owner. No release/deployment approval is issued.

Sources:
- https://github.com/advisories/GHSA-vfj7-8cjw-p6xm
- https://github.com/micromatch/braces/issues/70
- https://registry.npmjs.org/braces/3.0.3
