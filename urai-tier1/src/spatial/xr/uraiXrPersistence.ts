import { createEmptyWorldSnapshot, type UraiXrPersistenceAdapter, type UraiXrSignalMessage, type UraiXrWorldSnapshot } from './uraiXrProductionRuntime'

export type UraiXrPersistenceDriver = 'memory' | 'redis' | 'postgres'

const memorySnapshots = new Map<string, UraiXrWorldSnapshot>()
const memoryLog = new Map<string, UraiXrSignalMessage[]>()

function key(roomId: string) {
  return `urai:xr:room:${roomId}`
}

export function createMemoryPersistence(): UraiXrPersistenceAdapter {
  return {
    name: 'memory',
    async get(roomId) {
      return memorySnapshots.get(roomId)
    },
    async set(roomId, snapshot) {
      memorySnapshots.set(roomId, snapshot)
    },
    async append(roomId, message) {
      memoryLog.set(roomId, [...(memoryLog.get(roomId) ?? []), message])
    },
  }
}

export function createRedisPersistence(redis: { get(k: string): Promise<string | null>; set(k: string, v: string): Promise<unknown>; rPush?(k: string, v: string): Promise<unknown> }): UraiXrPersistenceAdapter {
  return {
    name: 'redis',
    async get(roomId) {
      const raw = await redis.get(key(roomId))
      return raw ? JSON.parse(raw) : undefined
    },
    async set(roomId, snapshot) {
      await redis.set(key(roomId), JSON.stringify(snapshot))
    },
    async append(roomId, message) {
      await redis.rPush?.(`${key(roomId)}:log`, JSON.stringify(message))
    },
  }
}

export function createPostgresPersistence(db: { query(sql: string, values?: unknown[]): Promise<{ rows?: Array<{ snapshot?: UraiXrWorldSnapshot | string }> }> }): UraiXrPersistenceAdapter {
  return {
    name: 'postgres',
    async get(roomId) {
      const result = await db.query('select snapshot from urai_xr_room_snapshots where room_id = $1 limit 1', [roomId])
      const snapshot = result.rows?.[0]?.snapshot
      return typeof snapshot === 'string' ? JSON.parse(snapshot) : snapshot
    },
    async set(roomId, snapshot) {
      await db.query(
        'insert into urai_xr_room_snapshots(room_id, snapshot, updated_at) values($1, $2, now()) on conflict(room_id) do update set snapshot = excluded.snapshot, updated_at = now()',
        [roomId, JSON.stringify(snapshot)],
      )
    },
    async append(roomId, message) {
      await db.query('insert into urai_xr_room_events(room_id, event, created_at) values($1, $2, now())', [roomId, JSON.stringify(message)])
    },
  }
}

export async function getOrCreateXrSnapshot(adapter: UraiXrPersistenceAdapter, roomId: string) {
  const existing = await adapter.get(roomId)
  if (existing) return existing
  const snapshot = createEmptyWorldSnapshot(roomId)
  await adapter.set(roomId, snapshot)
  return snapshot
}

export const URAI_XR_POSTGRES_SCHEMA = `
create table if not exists urai_xr_room_snapshots (
  room_id text primary key,
  snapshot jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists urai_xr_room_events (
  id bigserial primary key,
  room_id text not null,
  event jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists urai_xr_room_events_room_created_idx on urai_xr_room_events(room_id, created_at desc);
`
