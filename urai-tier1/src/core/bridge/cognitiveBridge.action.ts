import { createCognitiveKernel } from "./cognitiveBridge.core";
import { createReasoningEngine } from "./cognitiveBridge.reasoning";
import { processMemory } from "../pipeline/processMemory";

export type Action = {
  id: string;
  execute: (input: {
    memory: any;
    insight: any;
    reasoning: string[];
  }) => void;
};

export function createActionLayer(userId: string = "demo-user") {
  const kernel = createCognitiveKernel(userId);
  const reasoning = createReasoningEngine(userId);

  const actions: Action[] = [];

  function getState() {
    return {
      memory: kernel.getMemory(),
      insight: kernel.getInsight(),
      reasoning: reasoning.reason()
    };
  }

  function registerAction(action: Action) {
    actions.push(action);
  }

  function act() {
    const state = getState();

    // default action: persist reasoning back into memory loop
    const synthesis = state.reasoning.join(" |");

    if (synthesis && synthesis.length > 0) {
      processMemory(userId, "action: " + synthesis);
    }

    // run custom actions
    for (const action of actions) {
      try {
        action.execute(state);
      } catch {}
    }

    return state;
  }

  function start(intervalMs: number = 1500) {
    const id = setInterval(() => {
      act();
    }, intervalMs);

    return () => clearInterval(id);
  }

  return {
    kernel,
    reasoning,
    registerAction,
    act,
    start
  };
}
