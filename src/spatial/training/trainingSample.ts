export type TrainingSampleOutcome = {
  improved: boolean;
  intensityDelta: number;
  observedAt: string;
};

export type TrainingSample = {
  id: string;
  timestamp: string;
  features: {
    intensity: number;
    archetype: string;
    totalSignals: number;
    bloomRatio: number;
    whisperRatio: number;
    companionTrust: number;
    companionFamiliarity: number;
    dominantMode?: string;
    emotionalStabilityIndex?: number;
  };
  decision: {
    chosenAction: string;
    directiveMode?: string;
    regulationActive?: boolean;
    optimizationReason?: string;
  };
  outcome?: TrainingSampleOutcome;
};

const STORAGE_KEY = "urai.spatial.trainingSamples.v1";
const MAX_SAMPLES = 500;

function safeRead(): TrainingSample[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeWrite(samples: TrainingSample[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(samples.slice(-MAX_SAMPLES)));
  } catch {
    // Training capture is optional and must never break the app.
  }
}

function idForNow() {
  return `sample_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function captureTrainingSample(sample: Omit<TrainingSample, "id" | "timestamp">): TrainingSample {
  const next: TrainingSample = {
    id: idForNow(),
    timestamp: new Date().toISOString(),
    ...sample,
  };
  safeWrite([...safeRead(), next]);
  return next;
}

export function updateTrainingSampleOutcome(id: string, outcome: Omit<TrainingSampleOutcome, "observedAt">) {
  const samples = safeRead();
  safeWrite(
    samples.map((sample) =>
      sample.id === id
        ? {
            ...sample,
            outcome: {
              ...outcome,
              observedAt: new Date().toISOString(),
            },
          }
        : sample
    )
  );
}

export function exportTrainingSamples() {
  return JSON.stringify(
    {
      schema: "urai.spatial.trainingSamples.v1",
      exportedAt: new Date().toISOString(),
      samples: safeRead(),
    },
    null,
    2
  );
}

export function clearTrainingSamples() {
  safeWrite([]);
}
