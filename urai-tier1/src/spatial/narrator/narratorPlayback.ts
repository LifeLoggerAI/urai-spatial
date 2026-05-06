import type { NarratorLine } from "./narratorTypes";
import { requestNarratorAudio } from "./elevenlabsClient";

type Listener = (line: NarratorLine | null, visible: boolean) => void;

class NarratorPlaybackController {
  private audio: HTMLAudioElement | null = null;
  private activeObjectUrl: string | null = null;
  private aborter: AbortController | null = null;
  private delayTimer: ReturnType<typeof setTimeout> | null = null;
  private cutoffTimer: ReturnType<typeof setTimeout> | null = null;
  private lastSpokenId = "";
  private recentIds: string[] = [];
  private minimumSilenceMs = 1200; /* URAI_SILENCE_BREATH_V1 */
  private lastSpokenAt = 0;
  private listeners = new Set<Listener>();

  subscribe(listener: Listener) {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(line: NarratorLine | null, visible: boolean) {
    this.listeners.forEach((listener) => listener(line, visible));
  }

  stopLine(reason = "stop") {
    if (this.delayTimer) clearTimeout(this.delayTimer);
    if (this.cutoffTimer) clearTimeout(this.cutoffTimer);
    this.delayTimer = null;
    this.cutoffTimer = null;

    if (this.aborter) this.aborter.abort();
    this.aborter = null;

    if (this.audio) {
      console.info("[NARRATOR] interrupt:", reason);
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio.src = "";
      this.audio = null;
    }

    if (this.activeObjectUrl) {
      URL.revokeObjectURL(this.activeObjectUrl);
      this.activeObjectUrl = null;
    }

    this.emit(null, false);
  }

  async playLine(line: NarratorLine) {
    const now = Date.now();
    if (this.lastSpokenId === line.id && now - this.lastSpokenAt < 2600) {
      console.info("[NARRATOR] blocked duplicate:", line.id);
      return;
    }

    if (this.recentIds.includes(line.id)) {
      console.info("[NARRATOR] blocked recent repeat:", line.id);
      return;
    }

    
/* URAI_EMOTIONAL_SPACING_V1 */
if (now - this.lastSpokenAt < this.minimumSilenceMs && line.priority < 90) {
      console.info("[NARRATOR] blocked silence window:", line.id);
      return;
    }

    this.stopLine("new-line");
    this.lastSpokenId = line.id;
    this.lastSpokenAt = now;
    this.recentIds.push(line.id);
    while (this.recentIds.length > 8) this.recentIds.shift();
    this.recentIds.push(line.id);
    while (this.recentIds.length > 8) this.recentIds.shift();

    console.info("[NARRATOR] play:", line.id);
    this.emit(line, true);

    
/* URAI_MICRO_JITTER_V1 */
const jitter = Math.floor(Math.random() * 140);
this.delayTimer = setTimeout(async () => {
      this.aborter = new AbortController();
      const blob = await requestNarratorAudio(line, this.aborter.signal);

      if (!blob) {
        this.fallbackSpeech(line);
        return;
      }

      const url = URL.createObjectURL(blob);
      this.activeObjectUrl = url;
      const audio = new Audio(url);
      this.audio = audio;

      audio.onended = () => {
        if (this.activeObjectUrl) {
          URL.revokeObjectURL(this.activeObjectUrl);
          this.activeObjectUrl = null;
        }
        this.audio = null;
        this.emit(null, false);
      };

      audio.onerror = () => {
        if (this.activeObjectUrl) {
          URL.revokeObjectURL(this.activeObjectUrl);
          this.activeObjectUrl = null;
        }
        this.audio = null;
        this.fallbackSpeech(line);
      };

      this.cutoffTimer = setTimeout(() => this.stopLine("duration-cutoff"), line.durationMs);

      try {
        await audio.play();
      } catch {
        this.fallbackSpeech(line);
      }
    }, line.delayMs + jitter);
  }

  queueLine(line: NarratorLine) {
    void this.playLine(line);
  }

  interruptLine(line: NarratorLine) {
    this.stopLine("explicit-interrupt");
    void this.playLine(line);
  }

  private fallbackSpeech(line: NarratorLine) {
    const mode = process.env.NEXT_PUBLIC_URAI_NARRATOR_FALLBACK || "speech";
    if (mode === "silent" || typeof window === "undefined" || !("speechSynthesis" in window)) {
      this.emit(null, false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(line.text);
    utterance.rate = line.tone === "tension" ? 0.92 : 0.86;
    utterance.pitch = line.tone === "awe" ? 0.92 : 0.82;
    utterance.onend = () => this.emit(null, false);
    window.speechSynthesis.speak(utterance);
  }
}

export const narratorPlayback = new NarratorPlaybackController();
