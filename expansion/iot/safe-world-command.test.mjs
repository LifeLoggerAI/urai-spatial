import assert from "node:assert/strict";
import { classifyWorldCommand, authorizeSyntheticWorldCommand } from "./safe-world-command.mjs";

const light=classifyWorldCommand({
  commandId:"cmd-1",targetType:"home",targetId:"synthetic-light",action:"set_light",
});
assert.equal(light.realActuationAllowed,false);
assert.equal(authorizeSyntheticWorldCommand(light,{permission:"granted"}).allowed,true);

const door=classifyWorldCommand({
  commandId:"cmd-2",targetType:"home",targetId:"synthetic-door",action:"unlock_door",
});
assert.equal(authorizeSyntheticWorldCommand(door,{permission:"granted",confirmation:"pending"}).reason,"STRONG_CONFIRMATION_REQUIRED");
assert.equal(authorizeSyntheticWorldCommand(door,{permission:"granted",confirmation:"confirmed"}).allowed,true);

const vehicle=classifyWorldCommand({
  commandId:"cmd-3",targetType:"vehicle",targetId:"synthetic-car",action:"start_vehicle",
});
assert.equal(authorizeSyntheticWorldCommand(vehicle,{permission:"granted",confirmation:"confirmed"}).reason,"NEVER_AUTONOMOUS");

assert.equal(authorizeSyntheticWorldCommand(light,{permission:"granted",killed:true}).reason,"KILL_SWITCH_ACTIVE");

console.log("Vehicle/home/IoT safe command conformance: PASS");
