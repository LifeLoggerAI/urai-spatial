import type { LifeMapMode, LifeMapNode } from "./lifeMapModel";

export type NarratorSignal = {
  type:
    | "ambient"
    | "star-focus"
    | "star-glow"
    | "recovery"
    | "shadow"
    | "dream"
    | "relationship"
    | "mirror"
    | "user-message";
  mode: LifeMapMode;
  selectedNode: LifeMapNode | null;
  userText?: string;
};

export type NarratorInsight = {
  id: string;
  text: string;
  tone: "gentle" | "reflective" | "protective" | "mythic" | "clarifying";
  priority: number;
  speak: boolean;
};

function modeTone(mode: LifeMapMode): NarratorInsight["tone"] {
  if (mode === "shadow") return "protective";
  if (mode === "recovery") return "gentle";
  if (mode === "dream") return "mythic";
  if (mode === "mirror") return "reflective";
  return "clarifying";
}

export function createNarratorInsight(signal: NarratorSignal): NarratorInsight {
  const node = signal.selectedNode;
  const tone = modeTone(signal.mode);

  if (signal.type === "user-message") {
    return {
      id: `narrator-${Date.now()}`,
      tone,
      priority: 7,
      speak: true,
      text: node
        ? `I hear you. I am connecting that to ${node.title}: ${node.emotionalTone} emotion, ${node.nodeType} signal, and the larger ${node.season} chapter.`
        : "I hear you. I am holding this as a reflection thread and looking for the pattern beneath the words.",
    };
  }

  if (node?.isRecovery || signal.mode === "recovery") {
    return {
      id: `narrator-${Date.now()}`,
      tone: "gentle",
      priority: 8,
      speak: true,
      text: node
        ? `This looks like a recovery bloom. The important signal is not that pressure happened, but that your system found a way back.`
        : "A recovery pattern is nearby. Look for the place where the sky brightens after strain.",
    };
  }

  if (node?.isShadow || signal.mode === "shadow") {
    return {
      id: `narrator-${Date.now()}`,
      tone: "protective",
      priority: 9,
      speak: true,
      text: node
        ? `I will keep this gentle. ${node.title} may be a shadow signal, but it is not a verdict. It is a pattern asking for care.`
        : "Shadow mode is for visibility, not judgment. We can look without turning the pattern against you.",
    };
  }

  if (node?.isDream || signal.mode === "dream") {
    return {
      id: `narrator-${Date.now()}`,
      tone: "mythic",
      priority: 6,
      speak: true,
      text: node
        ? `This dream star is symbolic first. Treat the image as a messenger before treating it as an answer.`
        : "Dream mode is open. I will listen for symbols, repetitions, and emotional weather.",
    };
  }

  if (signal.mode === "mirror") {
    return {
      id: `narrator-${Date.now()}`,
      tone: "reflective",
      priority: 8,
      speak: true,
      text: "Zoom out. The mirror is not asking who you were for one day; it is showing the arc of who you are becoming.",
    };
  }

  return {
    id: `narrator-${Date.now()}`,
    tone,
    priority: 5,
    speak: false,
    text: node
      ? `This star belongs to ${node.title}. Its signal is ${node.emotionalTone}, and it may connect to ${node.sourceSignals.join(", ")}.`
      : "Your sky is quiet, but not empty. I am watching for the next pattern that wants to be translated.",
  };
}

export function speakNarrator(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.92;
  utterance.pitch = 0.88;
  utterance.volume = 0.82;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}
