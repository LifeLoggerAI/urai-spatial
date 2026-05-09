#!/usr/bin/env node

import process from 'node:process';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const userId = process.argv.find((arg) => arg.startsWith('--user='))?.slice('--user='.length)
  || process.env.URAI_SEED_USER_ID
  || 'demo-user';

const projectId = process.env.FIREBASE_PROJECT_ID
  || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  || 'urai';

function resolveCredential() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON));
  }
  return undefined;
}

if (!getApps().length) {
  initializeApp({
    projectId,
    credential: resolveCredential(),
  });
}

const db = getFirestore();

const now = Timestamp.fromDate(new Date('2026-05-09T12:00:00.000Z'));
const spring = Timestamp.fromDate(new Date('2026-04-01T12:00:00.000Z'));
const threshold = Timestamp.fromDate(new Date('2026-03-24T12:00:00.000Z'));
const recovery = Timestamp.fromDate(new Date('2026-03-30T12:00:00.000Z'));
const relationship = Timestamp.fromDate(new Date('2026-02-20T12:00:00.000Z'));
const legacy = Timestamp.fromDate(new Date('2025-12-21T12:00:00.000Z'));
const forecast = Timestamp.fromDate(new Date('2026-05-15T12:00:00.000Z'));

const events = [
  {
    id: 'memory-thread',
    title: 'Memory Thread',
    subtitle: 'A bright thread of remembered becoming',
    type: 'memory',
    sourceType: 'system_generated',
    summary: 'A central memory current where recent signals, emotional tone, and symbolic events begin to braid into a visible personal constellation.',
    intensity: 0.86,
    aura: '#8adfff',
    occurredAt: now,
    replayAvailable: true,
    connectedTo: ['seasonal-arc', 'ritual-marker', 'recovery-bloom'],
    eraId: 'spring-becoming',
    privacyLevel: 'private',
    narratorHint: 'This moment stayed with you longer than the day itself.',
  },
  {
    id: 'seasonal-arc',
    title: 'Seasonal Arc',
    subtitle: 'The larger weather pattern around the self',
    type: 'season',
    sourceType: 'system_generated',
    summary: 'A seasonal sweep of changes in energy, rhythm, reflection, and inner climate, shown as a high orbital node in the Life Map.',
    intensity: 0.78,
    aura: '#73e4ff',
    occurredAt: spring,
    replayAvailable: true,
    connectedTo: ['forecast-path', 'threshold-moment', 'legacy-thread'],
    eraId: 'spring-becoming',
    privacyLevel: 'private',
    narratorHint: 'The season is showing a larger weather pattern, not a fixed identity.',
  },
  {
    id: 'ritual-marker',
    title: 'Ritual Marker',
    subtitle: 'A chosen point of restoration',
    type: 'ritual',
    sourceType: 'ritual',
    summary: 'A small ritual anchor created by the system to help convert a hard signal into a calmer symbolic return path.',
    intensity: 0.62,
    aura: '#a980ff',
    occurredAt: Timestamp.fromDate(new Date('2026-04-19T12:00:00.000Z')),
    replayAvailable: false,
    connectedTo: ['threshold-moment', 'recovery-bloom'],
    eraId: 'spring-becoming',
    privacyLevel: 'private',
    narratorHint: 'This was a small return path, not a demand to fix everything.',
  },
  {
    id: 'forecast-path',
    title: 'Forecast Path',
    subtitle: 'The next emotional weather line',
    type: 'forecast',
    sourceType: 'forecast',
    summary: 'A forward-looking path that becomes clearer as URAI receives enough rhythm, context, and recovery evidence to render safely.',
    intensity: 0.56,
    aura: '#b68cff',
    occurredAt: forecast,
    replayAvailable: false,
    locked: true,
    connectedTo: ['relationship-echo', 'legacy-thread'],
    eraId: 'forward-weather',
    privacyLevel: 'hidden',
    narratorHint: 'This path is not fixed. It is only beginning to glow.',
  },
  {
    id: 'threshold-moment',
    title: 'Threshold Moment',
    subtitle: 'A passage where the old state released',
    type: 'threshold',
    sourceType: 'system_generated',
    summary: 'A high-intensity turning point where emotional pressure, decision, and identity shift converge into a single cinematic Life Map star.',
    intensity: 0.92,
    aura: '#ff7bd6',
    occurredAt: threshold,
    replayAvailable: true,
    connectedTo: ['relationship-echo', 'recovery-bloom'],
    eraId: 'threshold-return',
    privacyLevel: 'private',
    narratorHint: 'This was a crossing. Not an ending.',
  },
  {
    id: 'recovery-bloom',
    title: 'Recovery Bloom',
    subtitle: 'Evidence of nervous-system return',
    type: 'recovery',
    sourceType: 'recovery',
    summary: 'A soft recovery node showing rebound, stabilization, and a new pathway that appeared after a difficult emotional cluster.',
    intensity: 0.74,
    aura: '#7ddcff',
    occurredAt: recovery,
    replayAvailable: true,
    connectedTo: ['relationship-echo', 'legacy-thread'],
    eraId: 'threshold-return',
    privacyLevel: 'private',
    narratorHint: 'Here, something in you began returning.',
  },
  {
    id: 'relationship-echo',
    title: 'Relationship Echo',
    subtitle: 'A social signal with emotional gravity',
    type: 'relationship',
    sourceType: 'relationship',
    summary: 'A relationship echo that carries tone, distance, repair, and resonance into the spatial memory field without exposing raw private content.',
    intensity: 0.68,
    aura: '#d5eaff',
    occurredAt: relationship,
    replayAvailable: true,
    connectedTo: ['legacy-thread'],
    eraId: 'relationship-orbit',
    privacyLevel: 'private',
    narratorHint: 'This connection seemed to shift your emotional weather.',
  },
  {
    id: 'legacy-thread',
    title: 'Legacy Thread',
    subtitle: 'Deep-time continuity of the story',
    type: 'legacy',
    sourceType: 'legacy',
    summary: 'A distant legacy star holding the deeper pattern of what keeps repeating, evolving, and becoming meaningful across longer life arcs.',
    intensity: 0.5,
    aura: '#d1f5ff',
    occurredAt: legacy,
    replayAvailable: false,
    connectedTo: [],
    eraId: 'legacy-deep-time',
    privacyLevel: 'private',
    narratorHint: 'This thread reaches farther back than memory.',
  },
];

const eras = [
  {
    id: 'spring-becoming',
    title: 'Spring Becoming',
    subtitle: 'The recent arc where memory, ritual, and season braided together.',
    startLabel: 'Spring 2026',
    type: 'season',
    summary: 'A bright rebuilding season where recent memory and ritual signals begin forming a larger personal weather pattern.',
    dominantAura: '#8adfff',
    nodeIds: ['memory-thread', 'seasonal-arc', 'ritual-marker'],
  },
  {
    id: 'threshold-return',
    title: 'Threshold Return',
    subtitle: 'A difficult crossing followed by recovery evidence.',
    startLabel: 'Late March',
    type: 'threshold',
    summary: 'The emotional field tightens, crosses a threshold, and then begins showing recovery bloom evidence.',
    dominantAura: '#ff7bd6',
    nodeIds: ['threshold-moment', 'recovery-bloom'],
  },
  {
    id: 'relationship-orbit',
    title: 'Relationship Orbit',
    subtitle: 'A social signal with gravity around the wider Life Map.',
    startLabel: 'Social Cycle',
    type: 'relationship',
    summary: 'A relationship echo becomes visible as a gravitational influence without exposing private raw content.',
    dominantAura: '#d5eaff',
    nodeIds: ['relationship-echo'],
  },
  {
    id: 'legacy-deep-time',
    title: 'Legacy Deep Time',
    subtitle: 'The farther-back pattern beneath the present constellation.',
    startLabel: 'Deep Time',
    type: 'system_generated',
    summary: 'Deep continuity across older arcs, long-term meaning, and the larger Mirror of Becoming.',
    dominantAura: '#d1f5ff',
    nodeIds: ['legacy-thread'],
  },
  {
    id: 'forward-weather',
    title: 'Forward Weather',
    subtitle: 'The safe preview of what may be emerging next.',
    startLabel: 'Ahead',
    type: 'system_generated',
    summary: 'A future-facing forecast path that remains locked until enough evidence exists to render it safely.',
    dominantAura: '#b68cff',
    nodeIds: ['forecast-path'],
  },
];

async function seed() {
  const batch = db.batch();
  const userRef = db.collection('users').doc(userId);

  batch.set(userRef, { updatedAt: Timestamp.now(), lifeMapSeededAt: Timestamp.now() }, { merge: true });

  for (const event of events) {
    batch.set(userRef.collection('lifeMapEvents').doc(event.id), {
      ...event,
      userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }, { merge: true });
  }

  for (const era of eras) {
    batch.set(userRef.collection('lifeMapEras').doc(era.id), {
      ...era,
      userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }, { merge: true });
  }

  await batch.commit();
  console.log(`[urai] Seeded ${events.length} lifeMapEvents and ${eras.length} lifeMapEras for user ${userId} in project ${projectId}.`);
}

seed().catch((error) => {
  console.error('[urai] Life Map seed failed:', error);
  process.exitCode = 1;
});
