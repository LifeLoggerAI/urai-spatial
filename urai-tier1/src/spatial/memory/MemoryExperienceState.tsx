import type { ReactNode } from 'react'

/** Presentation for an existing admission state; authority and actions stay with the route. */
export default function MemoryExperienceState({ title, journey, message, guidance, children }: {
  title: string
  journey: string
  message: string
  guidance: string
  children: ReactNode
}) {
  return <section className="memoryExperienceState" aria-label={`${title} entry`}>
    <div className="memoryExperienceStateContent">
      <div className="memoryExperienceStateHorizon" aria-hidden="true"><span /><i /></div>
      <p className="memoryExperienceStateJourney">{journey}</p>
      <h1>{title}</h1>
      <p className="memoryExperienceStateMessage" role="status" aria-live="polite">{message}</p>
      <p className="memoryExperienceStateGuidance">{guidance}</p>
      <div className="memoryExperienceStateActions">{children}</div>
    </div>
    <style>{`
      .memoryExperienceState{position:relative;box-sizing:border-box;isolation:isolate;width:100%;height:100svh;min-height:100svh;overflow:auto;overscroll-behavior:contain;display:grid;align-items:center;padding:clamp(32px,7vh,84px) clamp(20px,6vw,88px) max(150px,calc(env(safe-area-inset-bottom) + 130px));color:#f1f8ff;background:radial-gradient(ellipse at 72% 30%,#17445055,transparent 48%),radial-gradient(ellipse at 18% 85%,#25224955,transparent 44%),#040a13;font-family:Inter,system-ui,sans-serif}
      .memoryExperienceStateContent{position:relative;width:min(100%,680px);margin-inline:auto;text-align:left}
      .memoryExperienceStateHorizon{position:relative;width:88px;height:66px;margin-bottom:28px;overflow:hidden;border-bottom:1px solid #b3e7ef70}
      .memoryExperienceStateHorizon span,.memoryExperienceStateHorizon i{position:absolute;left:10px;top:5px;width:66px;height:66px;border:1px solid #aceaff55;border-radius:50%;box-shadow:0 0 40px #76cde522,inset 0 0 24px #76cde522}
      .memoryExperienceStateHorizon i{inset:18px 23px;width:40px;height:40px;border-color:#dbf8ff8c}
      .memoryExperienceStateJourney{margin:0 0 14px;color:#b3e7ef;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;line-height:1.5}
      .memoryExperienceState h1{margin:0;max-width:14ch;font:500 clamp(2.5rem,6vw,5.4rem)/1.02 Georgia,serif;letter-spacing:-.035em;overflow-wrap:anywhere;text-wrap:balance}
      .memoryExperienceStateMessage{max-width:46ch;margin:24px 0 0;font-size:clamp(1rem,1.6vw,1.2rem);line-height:1.6;color:#f0f6fc}
      .memoryExperienceStateGuidance{max-width:52ch;margin:12px 0 0;font-size:14px;line-height:1.65;color:#b5c6d7}
      .memoryExperienceStateActions{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin-top:28px}
      .memoryExperienceStateActions>a,.memoryExperienceStateActions>button{display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;min-height:48px;max-width:100%;padding:12px 20px;border:1px solid #b3e7ef66;border-radius:999px;background:#102638;color:#eefbff;font:650 14px/1.3 Inter,system-ui,sans-serif;text-decoration:none;cursor:pointer;text-align:center}
      .memoryExperienceStateActions>a:first-child,.memoryExperienceStateActions>button:first-child{background:#d6f4fb;border-color:#d6f4fb;color:#071a28}
      .memoryExperienceStateActions>:is(a,button):focus-visible{outline:3px solid #fff;outline-offset:4px}
      @media(max-width:480px){.memoryExperienceState{align-items:start;padding-top:max(38px,env(safe-area-inset-top));}.memoryExperienceStateHorizon{margin-bottom:22px}.memoryExperienceStateActions{gap:10px}.memoryExperienceStateActions>a,.memoryExperienceStateActions>button{width:100%}}
      @media(max-height:500px) and (min-width:501px){.memoryExperienceState{padding-top:28px;padding-bottom:100px}.memoryExperienceStateHorizon{display:none}.memoryExperienceStateContent{margin:0;max-width:74%}.memoryExperienceState h1{font-size:2.5rem}.memoryExperienceStateMessage{margin-top:16px}}
      @media(forced-colors:active){.memoryExperienceStateActions>a,.memoryExperienceStateActions>button{border:2px solid CanvasText;background:Canvas;color:CanvasText}.memoryExperienceStateHorizon{display:none}}
    `}</style>
  </section>
}
