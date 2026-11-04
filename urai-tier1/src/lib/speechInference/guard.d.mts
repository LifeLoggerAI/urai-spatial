export type SpeechAuthority = Readonly<{
  owner_id:string; revision:number; active:boolean;
  transcription:boolean; inference:boolean; session_baseline:boolean;
}>
export type LanguageSpan = Readonly<{language:string;text:string}>
export type SpeechFeatureEnvelope = Readonly<{
  origin:'synthetic-feature-stub'|'recorded-feature'; reliability:number;
  mean_f0_hz:number|null; energy_dbfs:number|null;
  syllables_per_second:number|null; pause_ratio:number|null;
}>
export type SpeechCandidate = Readonly<{
  id:'candidate:acoustic'|'candidate:lexical'; label:string;
  truth_kind:'interpretation'; evidence_refs:readonly string[];
  origin?:string; uncalibrated_score?:number;
}>
export type SessionBaselineDescriptor = Readonly<{owner_id:string;speaker_key:string}>
export type SessionBaseline = SessionBaselineDescriptor & Readonly<{
  samples:number; median_f0_hz:number; scale_f0_hz:number;
}>
export type SpeechEvidenceRequest = Readonly<{
  owner_id:string; request_revision:number; async_reply_revision?:number;
  utterance:Readonly<{
    text:string; language_spans:readonly LanguageSpan[];
    transcript_quality:'clear'|'ambiguous'|'missing'; role:'owner'|'quoted-other';
    context:readonly Readonly<{speaker:string;text:string}>[];
    reported_emotion?:Readonly<{actor_id:string;label:string;source:'speaker-self-report';evidence_text:string}>|null;
  }>;
  speaker:Readonly<{status:'session-local'|'unknown'|'uncertain';session_key:string|null}>;
  baseline:SessionBaselineDescriptor|null; language_pair_supported:boolean;
  context_assessment?:Readonly<{ambiguous:boolean;evidence_refs:readonly string[]}>;
  acoustic_candidate?:SpeechCandidate|null; lexical_candidate?:SpeechCandidate|null;
  correction?:Readonly<{actor_id:string;target_claim_id:string;from_revision:number;to_revision:number;label:string;text:string}>|null;
  prior_inference?:Readonly<{owner_id:string;claim_id:string;label:string;revision:number}>|null;
}>
export type SpeechEvidencePorts = Readonly<{
  readAuthority:()=>Promise<SpeechAuthority>;
  readFeatures:()=>Promise<SpeechFeatureEnvelope|null>;
  readBaseline?:(ownerId:string,speakerKey:string)=>Promise<SessionBaseline|null>;
  purge:()=>Promise<void>;
}>
export type SpeechEvidenceOptions = Readonly<{
  processingEnabled?:boolean;
  manualReading?:Readonly<{
    source:'manual'|'disabled'|'inference';medicalDiagnosis:false;
    weather:'Calm'|'Reflective'|'Energized'|'Heavy'|'Uncertain'|'Hopeful'|null;
  }>;
}>
export type SpeechEvidenceDecision = {
  status:'unknown'|'disputed'|'reported'|'disabled'|'revoked';
  observations:ReadonlyArray<{feature:string;value:number;unit:string;truth_kind:'observation';origin:string;source_ref:string}>;
  assertions:ReadonlyArray<{label:string;attribution:'speaker-self-report'|'typed-owner-correction'|'manual-choice';source_ref:string;truth_kind:'user-assertion';actor_id:string;scope:string}>;
  interpretations:ReadonlyArray<{label:string;truth_kind:'interpretation';qualifier:'possible';scope:'utterance-style';evidence_refs:readonly string[]}>;
  language_spans:readonly LanguageSpan[];evidence_flags:readonly string[];conflict_refs:readonly string[];
  baseline:{scope:'none'|'session-only';speaker_key:string|null;z_f0:number|null};
  presentation:{key:string;qualifier:'you-said'|'uncertain'|'none';emotion_is_fact:false;inference_enabled:boolean;manual_weather:string|null};
  lifecycle:{source_unchanged:true;applied_revision:number;superseded_claim_ids:readonly string[];stale_reply_dropped:boolean};
}
export function assessSpeechEvidence(request:SpeechEvidenceRequest,ports:SpeechEvidencePorts,options?:SpeechEvidenceOptions):Promise<SpeechEvidenceDecision>
