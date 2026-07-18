import fs from 'node:fs'
const canonical='urai-tier1/src/spatial/lifemap/SpatialLifeMapCanonical.tsx'
const css='urai-tier1/src/app/continuous-spatial-proof-defects.css'
const read=(p)=>fs.readFileSync(p,'utf8'),write=(p,v)=>fs.writeFileSync(p,v)
function once(p,a,b){const s=read(p),i=s.indexOf(a);if(i<0||s.indexOf(a,i+a.length)>=0)throw new Error(`source ${a}`);write(p,s.slice(0,i)+b+s.slice(i+a.length))}
function between(p,a,b,v){const s=read(p),i=s.indexOf(a),j=s.indexOf(b,i);if(i<0||j<0||s.indexOf(a,i+a.length)>=0)throw new Error(`marker ${a}`);write(p,s.slice(0,i)+v+s.slice(j))}

once(canonical,'<picture aria-hidden="true" data-life-map-authored-universe="primary" style={{ position: "absolute", inset: 0, zIndex: 60, pointerEvents: "none", mixBlendMode: "screen", opacity: .78 }}>','<picture aria-hidden="true" data-life-map-authored-universe="atmospheric" style={{ position: "absolute", inset: 0, zIndex: 60, pointerEvents: "none", mixBlendMode: "screen", opacity: .22, maskImage: "radial-gradient(ellipse at 50% 48%, rgba(0,0,0,.72) 0%, rgba(0,0,0,.48) 48%, rgba(0,0,0,.18) 82%, transparent 100%)", WebkitMaskImage: "radial-gradient(ellipse at 50% 48%, rgba(0,0,0,.72) 0%, rgba(0,0,0,.48) 48%, rgba(0,0,0,.18) 82%, transparent 100%)" }}>')
once(canonical,'style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", filter: "saturate(1.12) contrast(1.06) brightness(.9)" }}','style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", transform: "scale(1.035)", filter: "saturate(.84) contrast(1.04) brightness(.68) blur(.35px)" }}')

between(css,'.urai-lifemap-deep-link-controls {','\n\n.urai-lifemap-deep-link-controls__eyebrow {',`.urai-lifemap-deep-link-controls {
  position: absolute;
  left: 50%;
  top: max(20px, env(safe-area-inset-top));
  right: auto;
  z-index: 80;
  width: min(820px, calc(100vw - 300px));
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  transform: translateX(-50%);
  border: 1px solid rgba(177, 244, 255, 0.2);
  border-radius: 999px;
  color: #effdff;
  background: linear-gradient(90deg, rgba(3, 12, 29, 0.58), rgba(18, 8, 39, 0.42));
  box-shadow: 0 14px 48px rgba(0, 0, 0, 0.34), 0 0 36px rgba(87, 224, 255, 0.08);
  backdrop-filter: blur(14px);
}
`)
once(css,`.urai-lifemap-deep-link-controls__eyebrow {
  margin: 0;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(173, 244, 255, 0.82);
}`,`.urai-lifemap-deep-link-controls__eyebrow {
  display: none;
}`)
once(css,`.urai-lifemap-deep-link-controls__title {
  font-size: clamp(20px, 2.6vw, 30px);
  line-height: 1;
  letter-spacing: -0.04em;
}`,`.urai-lifemap-deep-link-controls__title {
  flex: 0 0 auto;
  max-width: 220px;
  overflow: hidden;
  font-size: clamp(16px, 1.7vw, 22px);
  line-height: 1;
  letter-spacing: -0.035em;
  text-overflow: ellipsis;
  white-space: nowrap;
}`)
once(css,`.urai-lifemap-deep-link-controls__detail {
  font-size: 12px;
  line-height: 1.5;
  color: rgba(231, 250, 255, 0.72);
}`,`.urai-lifemap-deep-link-controls__detail {
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
  font-size: 11px;
  line-height: 1.35;
  color: rgba(231, 250, 255, 0.68);
  text-overflow: ellipsis;
  white-space: nowrap;
}`)
once(css,`.urai-lifemap-deep-link-controls__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}`,`.urai-lifemap-deep-link-controls__actions {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: nowrap;
  gap: 8px;
  margin: 0;
}`)
once(css,'  min-height: 38px;','  min-height: 48px;')
once(css,`  .urai-lifemap-deep-link-controls {
    top: 230px;
    right: 14px;
    width: min(330px, calc(100vw - 28px));
    padding: 14px;
  }`,`  .urai-lifemap-deep-link-controls {
    left: 14px;
    right: 14px;
    top: max(66px, calc(env(safe-area-inset-top) + 52px));
    width: auto;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 7px 10px;
    padding: 10px 12px;
    transform: none;
    border-radius: 22px;
  }

  .urai-lifemap-deep-link-controls__title { max-width: none; }
  .urai-lifemap-deep-link-controls__detail { display: none; }
  .urai-lifemap-deep-link-controls__actions { grid-column: 2; grid-row: 1; }`)
