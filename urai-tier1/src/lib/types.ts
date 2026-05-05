export type ConfidenceLevel = "low" | "medium" | "high";
export type EventSource = "seed" | "manual" | "device" | "integration";
export type MoodTone = "calm" | "focused" | "strained" | "reflective" | "energized";
export type ConsentStatus = "granted" | "denied" | "revoked" | "not_requested";
export type RequestStatus = "queued" | "processing" | "complete" | "failed";

export interface UserProfile {
  id: string;
  displayName: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
  tier: "tier1" | "tier2" | "tier3" | "tier4" | "tier5";
}

export interface UserSettings {
  userId: string;
  narratorEnabled: boolean;
  visualMode: "minimal" | "symbolic" | "spatial";
  notificationsEnabled: boolean;
  updatedAt: string;
}

export interface ConsentRecord {
  id: string;
  userId: string;
  scope: "profile" | "events" | "ai_enrichment" | "timeline" | "export" | "delete";
  status: ConsentStatus;
  updatedAt: string;
  notes?: string;
}

export interface RawEvent {
  id: string;
  userId: string;
  source: EventSource;
  occurredAt: string;
  title: string;
  description: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface EmotionSignal {
  mood: MoodTone;
  intensity: number;
  confidence: ConfidenceLevel;
}

export interface HabitSignal {
  label: string;
  direction: "supportive" | "neutral" | "strained";
  confidence: ConfidenceLevel;
}

export interface EnrichedEvent {
  id: string;
  rawEventId: string;
  userId: string;
  title: string;
  summary: string;
  emotion: EmotionSignal;
  habits: HabitSignal[];
  tags: string[];
  createdAt: string;
}

export interface DailySummary {
  id: string;
  userId: string;
  date: string;
  headline: string;
  mood: MoodTone;
  summary: string;
  eventIds: string[];
}

export interface WeeklySummary {
  id: string;
  userId: string;
  weekOf: string;
  headline: string;
  summary: string;
  dominantMood: MoodTone;
}

export interface NarratorInsight {
  id: string;
  userId: string;
  createdAt: string;
  title: string;
  body: string;
  sourceEventIds: string[];
  confidence: ConfidenceLevel;
  isMock: boolean;
}

export interface TimelineEvent {
  id: string;
  userId: string;
  occurredAt: string;
  title: string;
  body: string;
  mood: MoodTone;
  symbol: string;
  sourceEventId?: string;
}

export interface SymbolicEvent {
  id: string;
  userId: string;
  timelineEventId: string;
  glyph: string;
  aura: MoodTone;
  meaning: string;
}

export interface CompanionState {
  id: string;
  userId: string;
  updatedAt: string;
  mood: MoodTone;
  phrase: string;
  glowLevel: number;
}

export interface ExportRequest {
  id: string;
  userId: string;
  requestedAt: string;
  status: RequestStatus;
  format: "json" | "csv";
}

export interface DeleteRequest {
  id: string;
  userId: string;
  requestedAt: string;
  status: RequestStatus;
  scope: "all" | "events" | "insights";
}

export interface AuditLog {
  id: string;
  userId: string;
  createdAt: string;
  action: string;
  details: string;
}

export interface UraiSeedData {
  user: UserProfile;
  settings: UserSettings;
  consent: ConsentRecord[];
  rawEvents: RawEvent[];
  enrichedEvents: EnrichedEvent[];
  dailySummary: DailySummary;
  weeklySummary: WeeklySummary;
  narratorInsights: NarratorInsight[];
  timelineEvents: TimelineEvent[];
  symbolicEvents: SymbolicEvent[];
  companionState: CompanionState;
  exportRequests: ExportRequest[];
  deleteRequests: DeleteRequest[];
  auditLogs: AuditLog[];
}
