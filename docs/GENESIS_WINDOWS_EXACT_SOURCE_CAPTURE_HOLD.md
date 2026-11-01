# URAI Genesis: Windows exact-source build and original-product Ascent review (HOLD)

**No public deployment or publishing. No private customer media. No paid runners.**

## Starting authority and identity

- Capture draft: `LifeLoggerAI/urai-spatial` PR #1850, branch `parallel/digital-human-performance-20261018`.
- This handoff is pinned to corrected source commit `ae6e8bcf75f5d1804c78afea40e586afaadae10d`.
- Original compiled static application source `94c8a2cf68a436a0c49e80b3a09578935df12d48` is *not* this corrected build.
- The source tree contains literal Windows-invalid `*audit` folder names. Do **not** run an unrestricted checkout. The script uses Git's supported cone sparse checkout and preflights selected files before checkout.
- This is an executable local handoff, *not* a claim that the Windows build or native recording has been run.

## Owner computer prerequisites (run in Git Bash on Windows)

1. Installed Git for Windows with **Git Bash** (`git --version`). Keep Git's Windows/NTFS safety protections enabled.
2. Node.js 22 with Corepack (`node -v` and `corepack --version`). Supported workspace uses pnpm 10.0.0.
3. Existing Chrome installed locally, normally `C:\Program Files\Google\Chrome\Application\chrome.exe`.
4. Python 3 with Windows `py -3 --version` and FFmpeg/FFprobe on PATH (`ffmpeg -version`, `ffprobe -version`) before native capture.
5. Enough local disk space for the selected source tree, dependencies, Next.js build, and private recordings. Use a **short path**, for example `C:\ur\g` for source, `C:\ur\genesis-private-HOLD` for captures. Do not put captures inside any Git checkout or automatic cloud-sync folder.

## Step 1: clone pinned source and preflight Windows filenames

Extract this handoff ZIP into a folder on the local computer. From **Git Bash**, `cd` to that extracted folder, then execute:

```bash
bash scripts/genesis-windows-exact-checkout.sh /c/ur/g --build
```

The script performs an authorized Git public-repository clone **without checkout**, verifies the pinned commit (which includes the Windows `py -3` video pixel-gate invocation), scans NUL-separated Git tree names for Windows-invalid selected paths, installs only the specified sparse cone, checks out exactly the pinned SHA, verifies five source blobs, then runs the locked pnpm install, runtime typecheck and `next build`.

If any source path is invalid or build command fails, it stops. **Do not** disable Git NTFS protections, force checkout, rename historical repository files, or call a failed build successful. The local preflight JSON appears beside the checkout directory.

This exact-SHA checkout is independent of GitHub Actions runner admission. It still requires ordinary authorized network access to the public repository and package registries.

## Step 2: inspect local exact-source tests

From a **new Git Bash** session:

```bash
cd /c/ur/g
node --test tests/genesis-windows-path-preflight.test.mjs tests/genesis-windows-python-invocation.test.mjs tests/genesis-ascent-patched-review-capture.test.mjs
node --test urai-tier1/tests/home-ascent-combined-source.test.mjs urai-tier1/tests/home-ascent-cinematic-path.test.mjs urai-tier1/tests/home-ascent-sky-fade-contract.test.mjs
py -3 -m unittest discover -s tests -p test_genesis_ascent_pixel_gate.py
```

These tests are independent checks; some may rely on a complete installation. Check exit status, and do not substitute historical results for local results.

## Step 3: start corrected application locally

From the **source checkout** in another Git Bash terminal:

```bash
cd /c/ur/g
corepack pnpm --dir urai-tier1 exec next dev --hostname 127.0.0.1 --port 4173
```

The local URL must return the actual corrected application Home in disclosed sample mode: `http://127.0.0.1:4173/home/?demo=1`. The browser recording tool itself enforces this URL and the exact Git checkout commit.

## Step 4: record genuine corrected Ascent (private local only)

In another Git Bash terminal, after the local app is ready:

```bash
cd /c/ur/g
CHROME="$(cygpath -w '/c/Program Files/Google/Chrome/Application/chrome.exe')"
CAPTURE="$(cygpath -w '/c/ur/genesis-private-HOLD')"
node scripts/genesis-ascent-patched-review-capture.mjs \
  --url 'http://127.0.0.1:4173/home/?demo=1' \
  --source-sha 'ae6e8bcf75f5d1804c78afea40e586afaadae10d' \
  --output "$CAPTURE" \
  --chromium "$CHROME"
```

The recorder must verify real Home sky activation, LifeMap arrival, actual camera sample telemetry, and **decoded original-product video pixels** via `genesis-ascent-pixel-gate.py`. The test gate uses `py -3` on Windows. If the local Chrome executable lives elsewhere, substitute its actual absolute local path. Never change the local-only URL gate to an outside site.

Read the recorded private receipt and pixel preflight JSON. Physically inspect the WebM under local owner control. No source, FFmpeg, telemetry, or pixel test grants independent human approval; the receipt continues to mark human visual approval false.

## What remains after this handoff

This is **Ascent proof only**, not completion of the seven-scene canonical film. Even if this local recording passes, the continuous native Home -> Ascent -> LifeMap -> Focus -> Replay -> Return journey and all seven source clips must still be captured and accepted. The committed final renderer requires its exact original-source sealed-clip receipt: it cannot accept a corrected-source Ascent clip while pretending that clip came from the unchanged October 18 static archive.

The true 30-second film still requires the continuous source, authentic source attribution, edited master, independent motion inspection, SHA-256 manifests, protected private custody, and release acceptance. Public publishing, production deployment, customer media, financial changes, and protected merges remain unauthorized.
