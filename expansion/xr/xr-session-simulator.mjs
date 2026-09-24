const INPUT_MODES = new Set(["controller","hand","gaze","keyboard","touch"]);
const SESSION_STATES = new Set(["idle","requesting","active","interrupted","recovering","ended"]);

export class XrSessionSimulator {
  synthetic=true;
  physicalCertification=false;
  state="idle";

  constructor({ capabilities = {} } = {}) {
    this.capabilities={
      immersiveVr:Boolean(capabilities.immersiveVr),
      immersiveAr:Boolean(capabilities.immersiveAr),
      handTracking:Boolean(capabilities.handTracking),
      gaze:Boolean(capabilities.gaze),
      controller:Boolean(capabilities.controller),
    };
  }

  transition(event) {
    const legal={
      idle:{REQUEST:"requesting"},
      requesting:{GRANTED:"active",DENIED:"ended"},
      active:{INTERRUPT:"interrupted",END:"ended"},
      interrupted:{RECOVER:"recovering",END:"ended"},
      recovering:{RESTORED:"active",FAIL:"ended"},
      ended:{RESET:"idle"},
    };
    const next=legal[this.state]?.[event];
    if(!next) throw new Error("illegal XR session transition");
    this.state=next;
    return this.state;
  }

  input(mode,payload={}) {
    if(this.state!=="active") return {accepted:false,reason:"XR_SESSION_NOT_ACTIVE"};
    if(!INPUT_MODES.has(mode)) return {accepted:false,reason:"UNSUPPORTED_INPUT_MODE"};
    const capability={
      controller:"controller",
      hand:"handTracking",
      gaze:"gaze",
    }[mode];
    if(capability && !this.capabilities[capability]) return {accepted:false,reason:"CAPABILITY_UNAVAILABLE"};
    return {accepted:true,synthetic:true,mode,payload:structuredClone(payload)};
  }
}

export function comfortProfile({ reducedMotion=false, seated=false, stimulation="standard" }={}) {
  return {
    locomotion: reducedMotion ? "teleport_or_stationary" : "smooth_optional",
    snapTurn: reducedMotion,
    vignette: reducedMotion,
    seated,
    stimulation,
    autoplayMotion:false,
    recoveryPromptRequired:true,
  };
}
