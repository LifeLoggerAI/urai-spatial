import { createCognitiveKernel } from "./cognitiveBridge.core";

export type CognitiveState = {
  memory: any;
  insight: any;
};

export type ReasoningRule = {
  id: string;
  evaluate: (state: CognitiveState) => string | null;
};

export function createReasoningEngine(userId: string = "demo-user") {
  const kernel = createCognitiveKernel(userId);

  const rules: ReasoningRule[] = [];
  let interval: any = null;
  let running = false;

  function getState(): CognitiveState {
    return {
      memory: kernel.getMemory(),
      insight: kernel.getInsight()
    };
  }

  function addRule(rule: ReasoningRule) {
    rules.push(rule);
  }

  function reason() {
    const state = getState();

    const memoryText = state.memory?.content ?? "";
    const insightText = state.insight?.message ?? "";

    const outputs: string[] = [];

    for (const rule of rules) {
      try {
        const result = rule.evaluate(state);
        if (result) outputs.push(result);
      } catch {}
    }

    // simple deterministic synthesis layer
    if (memoryText && insightText) {
      outputs.push(`synthesis: ${memoryText.slice(0, 40)} | ${insightText.slice(0, 40)}`);
    }

    return outputs;
  }

  function start(intervalMs: number = 1000) {
    if (running) return stop;
    running = true;

    interval = setInterval(() => {
      const results = reason();

      // no side-effect persistence here (kept pure reasoning layer)
      if (results.length > 0) {
        // placeholder hook for stream/bridge integration
        console.log("[reasoning]", results);
      }
    }, intervalMs);

    return stop;
  }

  function stop() {
    if (interval) clearInterval(interval);
    interval = null;
    running = false;
  }

  return {
    kernel,
    addRule,
    reason,
    start,
    stop
  };
}
