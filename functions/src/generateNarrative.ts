import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";

type StoryBeat = {
  atMs: number;
  narrator?: string;
  cameraPath?: string;
  pattern?: string;
  environmentCue?: string;
};

type StorySequence = {
  id: string;
  title: string;
  durationMs: number;
  beats: StoryBeat[];
};

type NarrativeRequest = {
  schema?: string;
  system?: string;
  user?: string;
  constraints?: {
    preserveTiming?: boolean;
    maxLineLength?: number;
    safeTone?: boolean;
    noMedicalAdvice?: boolean;
    noDiagnosis?: boolean;
  };
};

const openAiApiKey = defineSecret("OPENAI_API_KEY");

function parseBaseSequence(request: NarrativeRequest): StorySequence | null {
  try {
    const parsed = JSON.parse(request.user ?? "{}");
    return parsed.baseSequence ?? null;
  } catch {
    return null;
  }
}

function sanitizeLine(line: unknown, maxLineLength: number) {
  const text = String(line ?? "").replace(/\s+/g, " ").trim();
  return text.slice(0, maxLineLength);
}

function validateGeneratedSequence(base: StorySequence, generated: unknown, maxLineLength: number): StorySequence {
  const candidate = generated as Partial<StorySequence>;
  const candidateBeats = Array.isArray(candidate?.beats) ? candidate.beats : [];

  return {
    ...base,
    title: typeof candidate.title === "string" ? sanitizeLine(candidate.title, 80) : base.title,
    beats: base.beats.map((baseBeat, index) => {
      const generatedBeat = candidateBeats[index] as Partial<StoryBeat> | undefined;
      return {
        ...baseBeat,
        narrator: generatedBeat?.narrator ? sanitizeLine(generatedBeat.narrator, maxLineLength) : baseBeat.narrator,
      };
    }),
  };
}

async function callOpenAI(request: NarrativeRequest, apiKey: string) {
  const maxLineLength = request.constraints?.maxLineLength ?? 160;
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            request.system ??
            "Rewrite URAI spatial story narrator text only. Preserve all timing, camera, pattern, and environment fields.",
        },
        {
          role: "user",
          content: `${request.user}\n\nReturn ONLY valid JSON with shape {\"title\": string, \"beats\": [{\"narrator\": string}]}. Each narrator line must be <= ${maxLineLength} characters.`,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "urai_story_sequence_rewrite",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              beats: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    narrator: { type: "string" },
                  },
                  required: ["narrator"],
                },
              },
            },
            required: ["title", "beats"],
          },
        },
      },
      max_output_tokens: 900,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed: ${response.status}`);
  }

  const payload = await response.json();
  const text = payload.output_text ?? payload.output?.[0]?.content?.[0]?.text;
  if (!text) throw new Error("OpenAI response missing output text");
  return JSON.parse(text);
}

export const generateNarrative = onRequest(
  {
    secrets: [openAiApiKey],
    cors: true,
    timeoutSeconds: 30,
    memory: "256MiB",
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "method_not_allowed" });
      return;
    }

    const request = req.body as NarrativeRequest;
    const baseSequence = parseBaseSequence(request);
    if (!baseSequence?.beats?.length) {
      res.status(400).json({ error: "invalid_base_sequence" });
      return;
    }

    try {
      const generated = await callOpenAI(request, openAiApiKey.value());
      const sequence = validateGeneratedSequence(
        baseSequence,
        generated,
        request.constraints?.maxLineLength ?? 160
      );
      res.status(200).json({ sequence, source: "openai" });
    } catch (error) {
      res.status(200).json({ sequence: baseSequence, source: "fallback", error: "generation_failed" });
    }
  }
);
