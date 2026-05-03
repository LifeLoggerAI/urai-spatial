import type { CSSProperties } from "react";

type Props = { phaseLabel: string; starCount: number; memoryTitle: string; source: string; canReplay: boolean; onOpen:()=>void; onBack:()=>void; onReplay:()=>void };

export default function SpatialHUD({ phaseLabel, starCount, memoryTitle, source, canReplay, onOpen, onBack, onReplay }: Props) {
  return <div style={{position:"absolute", inset:0, pointerEvents:"none", zIndex:20}}>
    <div style={panelTopLeft}><div style={{fontSize:11,letterSpacing:".14em",textTransform:"uppercase",color:"#b9e7ff"}}>URAI Spatial OS</div><div style={{fontSize:13,color:"#eaf2ff",marginTop:4}}>{phaseLabel}</div></div>
    <div style={panelTopRight}><div style={{fontSize:12}}>Stars: {starCount}</div><div style={{fontSize:12}}>Memory: {memoryTitle}</div><div style={{fontSize:12}}>Source: {source}</div></div>
    <div style={panelBottom}><button aria-label="Open LifeMap" style={btn} onClick={onOpen}>Open LifeMap</button><button aria-label="Go Back" style={btn} onClick={onBack}>Back / Escape</button>{canReplay ? <button aria-label="Enter Replay" style={btn} onClick={onReplay}>Enter Replay</button> : null}<span style={{fontSize:11,opacity:.82}}>ESC to return</span></div>
  </div>
}

const glass: CSSProperties = {backdropFilter:"blur(18px)", background:"rgba(8,12,28,.52)", border:"1px solid rgba(170,190,255,.22)", boxShadow:"0 18px 60px rgba(0,0,0,.36)", borderRadius:20, pointerEvents:"auto"};
const panelTopLeft: CSSProperties = { ...glass, position:"absolute", left:16, top:16, padding:"10px 12px", minWidth:170 };
const panelTopRight: CSSProperties = { ...glass, position:"absolute", right:16, top:16, padding:"10px 12px", minWidth:170 };
const panelBottom: CSSProperties = { ...glass, position:"absolute", left:16, bottom:16, padding:"10px 12px", display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" };
const btn: CSSProperties = { border:"1px solid rgba(190,210,255,.28)", background:"linear-gradient(135deg, rgba(120,150,255,.24), rgba(120,210,255,.12))", color:"#eef4ff", borderRadius:999, padding:"9px 14px", fontWeight:600, cursor:"pointer" };
