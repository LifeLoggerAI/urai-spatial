export interface AdamFounderVoicePlaybackEvidence {
  audioSha256: string
  voiceId: string
  voiceApprovalSha256: string
  providerReceipt: unknown
}
export interface AdamFounderVoicePlaybackBridgeOptions {
  ownerAccountId?: string
  getAuthority?: () => import('../digital-human/founderCharacterPlaybackGate.mjs').FounderPlaybackAuthority | null
  verifyAuthorizedVoice?: (input: {
    accountId: string; subjectId: 'adam'; actorEpoch: string; turnId: number;
    audioSha256: string; voiceId: string; voiceApprovalSha256: string; providerReceipt: unknown
  }) => Promise<boolean>
  createAudio?: (url: string, locale?: string) => HTMLAudioElement
  createObjectURL?: (blob: Blob) => string
  revokeObjectURL?: (url: string) => void
  requestFrame?: (callback: FrameRequestCallback) => number
  cancelFrame?: (id: number) => void
  onFaceFrame?: (frame: import('../digital-human/founderCharacterPlaybackGate.mjs').FounderFaceFrame) => void
  onNeutral?: (reason: string) => void
  abortConversation?: (reason: string) => void
  digestSha256?: (blob: Blob) => Promise<string>
}
export interface AdamFounderVoicePlaybackBridge {
  ready(): boolean
  isPlaying(): boolean
  interrupt(reason?: string): void
  dispose(): void
  start(input: { blob: Blob; evidence?: AdamFounderVoicePlaybackEvidence | null;
    signal?: AbortSignal; locale?: string }): Promise<boolean>
}
export function createAdamFounderVoicePlaybackBridge(options?: AdamFounderVoicePlaybackBridgeOptions): AdamFounderVoicePlaybackBridge
