import fs from "fs";
import path from "path";
import crypto from "crypto";

function sha256File(p) {
  const h = crypto.createHash("sha256");
  const s = fs.createReadStream(p);
  return new Promise((res, rej) => {
    s.on("data", (d) => h.update(d));
    s.on("end", () => res(h.digest("hex")));
    s.on("error", rej);
  });
}

function walk(dir, exts, out=[]) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, exts, out);
    else {
      const ext = path.extname(ent.name).toLowerCase();
      if (exts.includes(ext)) out.push(p);
    }
  }
  return out;
}

const inDir = process.argv[2] || "assets_in";
const outFile = process.argv[3] || "spatial_manifest.json";
const exts = [".glb", ".gltf", ".hdr", ".ktx2", ".bin", ".png", ".jpg", ".webp"];

if (!fs.existsSync(inDir)) {
  console.error(`ERROR: missing input dir: ${inDir}`);
  process.exit(1);
}

const files = walk(inDir, exts).sort();
const entries = [];
for (const f of files) {
  const rel = path.relative(inDir, f).replace(/\\/g, "/");
  const sha = await sha256File(f);
  const st = fs.statSync(f);
  entries.push({
    relPath: rel,
    sha256: sha,
    bytes: st.size
  });
}

const manifest = {
  version: 1,
  createdAt: new Date().toISOString(),
  inputDir: inDir,
  fileCount: entries.length,
  entries
};

fs.writeFileSync(outFile, JSON.stringify(manifest, null, 2));
console.log(`OK: wrote ${outFile} (${entries.length} files)`);
