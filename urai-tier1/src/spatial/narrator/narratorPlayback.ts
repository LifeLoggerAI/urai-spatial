import type { NarratorLine } from "./narratorTypes";
import { requestNarratorAudio } from "./elevenlabsClient";

type Listener = (line: NarratorLine | null, visible: boolean) => void;

class NarratorPlaybackController {
  private audio: HTMLAudioElement | null = null;
  private activeObjectUrl: string | null = null;
  private aborter: AbortController | null = null;
  private delayTimer: ReturnType<typeof setTimeout> | null = null;
  private cutoffTimer: ReturnType<typeof setTimeout> | null = null;
  private utterance: SpeechSynthesisUtterance | null = null;
  private generation = 0;
  private externalLine = false;
  private lastSpokenId = "";
  private recentIds: string[] = [];
  private minimumSilenceMs = 1200;
  private lastSpokenAt = 0;
  private listeners = new Set<Listener>();
  private externalVoiceConsent = false;

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setExternalVoiceConsent(allowed: boolean) {
    this.externalVoiceConsent = allowed === true;
    if (!this.externalVoiceConsent && this.externalLine) this.stopLine("external-consent-withdrawn");
  }

  private emit(line: NarratorLine | null, visible: boolean) {
    this.listeners.forEach((listener) => listener(line, visible));
  }

  stopLine(reason = "stop") {
    this.generation += 1;
    if (this.delayTimer) clearTimeout(this.delayTimer);
    if (this.cutoffTimer) clearTimeout(this.cutoffTimer);
    this.delayTimer = null;
    this.cutoffTimer = null;
    if (this.aborter) this.aborter.abort();
    this.aborter = null;
    if (this.audio || this.utterance) console.info("[NARRATOR] interrupt:", reason);
    this.clearAudio();
    this.clearUtterance(true);
    this.externalLine = false;
    this.emit(null, false);
  }

  async playLine(line: NarratorLine) {
    const now = Date.now();
    if (this.lastSpokenId === line.id && now - this.lastSpokenAt < 2600) return;
    if (this.recentIds.includes(line.id)) return;
    if (now - this.lastSpokenAt < this.minimumSilenceMs && line.priority < 90) return;

    this.stopLine("new-line");
    const generation = this.generation;
    const controller = new AbortController();
    const externalProcessingConsent = this.externalVoiceConsent;
    this.aborter = controller;
    this.externalLine = externalProcessingConsent;
    this.lastSpokenId = line.id;
    this.lastSpokenAt = now;
    this.recentIds.push(line.id);
    while (this.recentIds.length > 8) this.recentIds.shift();
    this.emit(line, true);

    const jitter = Math.floor(Math.random() * 140);
    this.delayTimer = setTimeout(async () => {
      if (!this.owns(generation, controller)) return;
      this.delayTimer = null;
      let blob: Blob | null = null;
      try {
        if (externalProcessingConsent) blob = await requestNarratorAudio(line, controller.signal, true);
      } catch { /* retain the readable line and consider a local voice */ }
      if (!this.owns(generation, controller)) return;
      this.cutoffTimer = setTimeout(() => this.stopLine("duration-cutoff"), line.durationMs);
      if (!blob?.size) {
        void this.fallbackSpeech(line, generation, controller);
        return;
      }

      let audio: HTMLAudioElement | null = null;
      try {
        const url = URL.createObjectURL(blob);
        this.activeObjectUrl = url;
        audio = new Audio(url);
        this.audio = audio;
        const ownsAudio = () => this.owns(generation, controller) && this.audio === audio;
        audio.onended = () => { if (ownsAudio()) this.finishLine(generation, controller); };
        audio.onerror = () => {
          if (!ownsAudio()) return;
          this.clearAudio();
          void this.fallbackSpeech(line, generation, controller);
        };
        await audio.play();
      } catch {
        if (!this.owns(generation, controller)) return;
        // An error event may already have transferred this line to native voice.
        if (audio && this.audio !== audio) return;
        this.clearAudio();
        void this.fallbackSpeech(line, generation, controller);
      }
    }, line.delayMs + jitter);
  }

  queueLine(line: NarratorLine) { void this.playLine(line); }
  interruptLine(line: NarratorLine) { this.stopLine("explicit-interrupt"); void this.playLine(line); }

  private owns(generation: number, controller: AbortController) {
    return this.generation === generation && this.aborter === controller && !controller.signal.aborted;
  }

  private clearAudio() {
    const audio = this.audio;
    this.audio = null;
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.currentTime = 0;
      audio.src = "";
    }
    if (this.activeObjectUrl) URL.revokeObjectURL(this.activeObjectUrl);
    this.activeObjectUrl = null;
  }

  private clearUtterance(cancel: boolean) {
    const utterance = this.utterance;
    this.utterance = null;
    if (!utterance) return;
    utterance.onend = null;
    utterance.onerror = null;
    if (cancel && typeof window !== "undefined") window.speechSynthesis?.cancel();
  }

  private localVoice() {
    const voices = window.speechSynthesis.getVoices().filter((voice) => voice.localService);
    const language = typeof navigator === "undefined" ? "en-US" : navigator.language.toLowerCase();
    return voices.find((voice) => voice.lang.toLowerCase() === language)
      ?? voices.find((voice) => voice.lang.toLowerCase().split("-")[0] === language.split("-")[0])
      ?? voices[0]
      ?? null;
  }

  private async waitForLocalVoice(signal: AbortSignal) {
    const available = this.localVoice();
    if (available || signal.aborted) return available;
    const speech = window.speechSynthesis;
    return new Promise<SpeechSynthesisVoice | null>((resolve) => {
      let finished = false;
      const finish = (voice: SpeechSynthesisVoice | null) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        speech.removeEventListener("voiceschanged", onVoices);
        signal.removeEventListener("abort", onAbort);
        resolve(voice);
      };
      const onVoices = () => { const voice = this.localVoice(); if (voice) finish(voice); };
      const onAbort = () => finish(null);
      const timer = setTimeout(() => finish(null), 1500);
      speech.addEventListener("voiceschanged", onVoices);
      signal.addEventListener("abort", onAbort, { once: true });
      onVoices();
      if (signal.aborted) finish(null);
    });
  }

  private finishLine(generation: number, controller: AbortController) {
    if (!this.owns(generation, controller)) return;
    if (this.cutoffTimer) clearTimeout(this.cutoffTimer);
    this.cutoffTimer = null;
    this.clearAudio();
    this.clearUtterance(false);
    this.aborter = null;
    this.externalLine = false;
    this.emit(null, false);
  }

  private async fallbackSpeech(line: NarratorLine, generation: number, controller: AbortController) {
    if (!this.owns(generation, controller)) return;
    const mode = process.env.NEXT_PUBLIC_URAI_NARRATOR_FALLBACK || "speech";
    if (mode === "silent" || typeof window === "undefined" || !("speechSynthesis" in window)) {
      this.finishLine(generation, controller);
      return;
    }
    try {
      const voice = await this.waitForLocalVoice(controller.signal);
      if (!this.owns(generation, controller)) return;
      if (!voice) { this.finishLine(generation, controller); return; }
      const utterance = new SpeechSynthesisUtterance(line.text);
      this.utterance = utterance;
      utterance.voice = voice;
      utterance.lang = voice.lang;
      utterance.rate = line.tone === "tension" ? 0.92 : 0.86;
      utterance.pitch = line.tone === "awe" ? 0.92 : 0.82;
      const ended = () => {
        if (this.owns(generation, controller) && this.utterance === utterance) this.finishLine(generation, controller);
      };
      utterance.onend = ended;
      utterance.onerror = ended;
      window.speechSynthesis.speak(utterance);
    } catch {
      if (!this.owns(generation, controller)) return;
      this.clearUtterance(true);
      this.finishLine(generation, controller);
    }
  }
}

export const narratorPlayback = new NarratorPlaybackController();
