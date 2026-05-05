import { companionExpressionFor, emotionalizeCompanionLine } from "./CompanionEmotionEngine";
import { buildCompanionCadencePlan, humanizeCompanionText } from "./CompanionHumanCadenceEngine";
import { decideCompanionPresence, applyCompanionDecision, defaultCompanionState } from "./CompanionPresenceEngine";
import { buildCompanionSpeechPayload } from "./CompanionVoiceEngine";
import { buildCompanionContinuityCue, applyContinuityToLine, updateContinuityMemory } from "./CompanionContinuityEngine";
import { chooseSignatureMoment, applySignatureMoment, rememberSignatureMoment, signatureMomentTiming } from "./CompanionSignatureMomentEngine";
import { chooseRitualMoment, applyRitualMomentLine, rememberRitualMoment } from "./CompanionRitualTimingEngine";
import type { CompanionMemorySignal, CompanionSceneInput, CompanionState } from "./companionTypes";
import type { CompanionVoiceMode } from "./CompanionVoiceEngine";

export type CompanionPipelineInput = CompanionSceneInput & {
  state?: CompanionState;
  memorySignals?: CompanionMemorySignal[];
  voiceMode?: CompanionVoiceMode;
  userGesture?: boolean;
  daysSinceLastSignature?: number;
  daysSinceLastRitual?: number;
};

export type CompanionPipelineOutput = {
  line: string;
  state: CompanionState;
  shouldSpeak: boolean;
  totalDelayMs: number;
  expression: ReturnType<typeof companionExpressionFor>;
  decision: ReturnType<typeof decideCompanionPresence>;
  cadence: ReturnType<typeof buildCompanionCadencePlan>;
  speechPayload: ReturnType<typeof buildCompanionSpeechPayload>;
  metadata: {
    continuityId: string;
    signatureId?: string | null;
    ritualId?: string | null;
    voiceReason: string;
  };
};

export function runCompanionPipeline(input: CompanionPipelineInput): CompanionPipelineOutput {
  const baseState = input.state ?? defaultCompanionState;
  const decision = decideCompanionPresence(input, baseState);
  const expression = companionExpressionFor(decision.context, baseState);
  const emotionalLine = emotionalizeCompanionLine(decision.line.text, expression);

  const cue = buildCompanionContinuityCue({
    context: decision.context,
    state: baseState,
    memorySignals: input.memorySignals,
    expression,
    now: input.now,
  });

  const continuityLine = applyContinuityToLine(emotionalLine, cue);

  const signature = chooseSignatureMoment({
    context: decision.context,
    state: baseState,
    expression,
    memorySignals: input.memorySignals,
    daysSinceLastSignature: input.daysSinceLastSignature,
    isUserInitiated: input.userGesture,
  });

  const signatureLine = applySignatureMoment(continuityLine, signature);

  const ritual = chooseRitualMoment({
    context: decision.context,
    state: baseState,
    memorySignals: input.memorySignals,
    now: input.now,
    daysSinceLastRitual: input.daysSinceLastRitual,
  });

  const sacredLine = applyRitualMomentLine(signatureLine, ritual);
  const finalLine = humanizeCompanionText(sacredLine, decision.context);

  const decisionState = applyCompanionDecision(baseState, decision, input.now ?? new Date());
  const continuityState = updateContinuityMemory(decisionState, cue);
  const signatureState = rememberSignatureMoment(continuityState, signature);
  const nextState = rememberRitualMoment(signatureState, ritual);

  const speechPayload = buildCompanionSpeechPayload({
    text: finalLine,
    context: decision.context,
    state: nextState,
    expression,
    mode: input.voiceMode,
    userGesture: input.userGesture,
  });

  const cadence = buildCompanionCadencePlan({
    text: speechPayload.text,
    context: decision.context,
    expression,
    state: nextState,
  });

  const timing = signatureMomentTiming(signature);
  const ritualDelay = ritual?.silenceBeforeMs ?? 0;

  return {
    line: finalLine,
    state: nextState,
    shouldSpeak: decision.shouldSpeak,
    totalDelayMs: cue.anticipationPauseMs + timing.silenceBeforeMs + ritualDelay,
    expression,
    decision,
    cadence,
    speechPayload,
    metadata: {
      continuityId: cue.id,
      signatureId: signature?.id ?? null,
      ritualId: ritual?.id ?? null,
      voiceReason: speechPayload.reason,
    },
  };
}
