const RISK = Object.freeze({
  read_state:"read_only",
  set_light:"reversible_low_risk",
  set_thermostat:"reversible_low_risk",
  media_control:"reversible_low_risk",
  unlock_door:"strong_confirmation",
  start_vehicle:"never_autonomous",
  stop_vehicle:"never_autonomous",
  security_disarm:"never_autonomous",
  purchase:"never_autonomous",
});

export function classifyWorldCommand(command) {
  const risk = RISK[command?.action];
  if (!risk) throw new Error("unknown world command");
  return {
    version:"1.0.0",
    commandId:command.commandId,
    targetType:command.targetType,
    targetId:command.targetId,
    action:command.action,
    risk,
    synthetic:true,
    realActuationAllowed:false,
    requiredConfirmation:
      risk === "strong_confirmation" ? "strong_confirmation" :
      risk === "never_autonomous" ? "human_manual_only" :
      "policy_dependent",
  };
}

export function authorizeSyntheticWorldCommand(classified, { permission, confirmation, killed }) {
  if (killed) return {allowed:false,reason:"KILL_SWITCH_ACTIVE"};
  if (permission !== "granted") return {allowed:false,reason:"PERMISSION_REQUIRED"};
  if (classified.risk === "never_autonomous") return {allowed:false,reason:"NEVER_AUTONOMOUS"};
  if (classified.risk === "strong_confirmation" && confirmation !== "confirmed") {
    return {allowed:false,reason:"STRONG_CONFIRMATION_REQUIRED"};
  }
  return {allowed:true,reason:"SYNTHETIC_SIMULATION_ONLY",realActuationAllowed:false};
}
