// The UI talks to one interface. Live mode: the local API (FalkorDB + TrueForge/Bright Data).
// Cached mode (public site): the in-browser graph seeded from the labeled snapshot.
import { MemoryGraph, type MemoryState } from '../domain/memory-graph';
import type { Candidate, GraphPath, Meeting, MeetingInput, ProfileInput } from '../domain/graph-types';
import type { ConferenceId, RoleRecord } from '../domain/types';
import { ROLES, SESSIONS } from '../data/demo';
import { load, save } from './store';
import { observeBackend } from './sponsor-activity';

export interface Backend {
  mode: 'live' | 'cached';
  label: string;
  upsertProfile(p: ProfileInput): Promise<void>;
  candidates(profileId: string, c: ConferenceId): Promise<Candidate[]>;
  hiringPaths(c: ConferenceId): Promise<GraphPath[]>;
  /** Roles as last checked: rechecked by the local API, or the snapshot in cached mode. */
  roles(): Promise<RoleRecord[]>;
  recordMeeting(profileId: string, m: MeetingInput): Promise<{ created: boolean }>;
  removeMeeting(profileId: string, meetingId: string): Promise<{ removed: boolean }>;
  meetings(profileId: string): Promise<Meeting[]>;
  /** Drop and reopen the store (new DB connection, or re-read browser storage). */
  reopen(): Promise<void>;
  research?(kind: 'wad-session' | 'universe-catalog', url: string): Promise<ResearchResponse>;
}

export interface ResearchResponse {
  status: 'ok' | 'partial' | 'failed';
  error?: string;
  durationMs: number;
  model: string;
  retrievedAt: string;
  url: string;
  usage: { inputTokens: number; outputTokens: number };
  trace: Array<{ tool: string; args: unknown; responseChars: number }>;
  records: Array<{ title: string; start: string; end: string; location?: string; speakers: Array<{ name: string; title?: string; company?: string }> }>;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...init, headers: { 'content-type': 'application/json', ...init?.headers } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `request failed (${res.status})`);
  return data as T;
}

function liveBackend(graphHost: string): Backend {
  return {
    mode: 'live',
    label: `Live local · ${graphHost}`,
    upsertProfile: async (p) => void (await api('/api/profile', { method: 'POST', body: JSON.stringify(p) })),
    candidates: (id, c) => api(`/api/candidates?profile=${encodeURIComponent(id)}&conference=${c}`),
    hiringPaths: (c) => api(`/api/hiring-paths?conference=${c}`),
    roles: () => api('/api/roles'),
    recordMeeting: (profileId, meeting) => api('/api/meetings', { method: 'POST', body: JSON.stringify({ profileId, meeting }) }),
    removeMeeting: (id, mid) => api(`/api/meetings?profile=${encodeURIComponent(id)}&id=${encodeURIComponent(mid)}`, { method: 'DELETE' }),
    meetings: (id) => api(`/api/meetings?profile=${encodeURIComponent(id)}`),
    reopen: async () => void (await api('/api/reconnect', { method: 'POST' })),
    research: (kind, url) => api('/api/research', { method: 'POST', body: JSON.stringify({ kind, url }) }),
  };
}

const GRAPH_KEY = 'graph';

async function cachedBackend(): Promise<Backend> {
  const storage = { load: () => load<MemoryState>(GRAPH_KEY), save: (s: MemoryState) => save(GRAPH_KEY, s) };
  let g = new MemoryGraph(storage);
  await g.seedPublic([...SESSIONS.universe26, ...SESSIONS.wad26na]);
  await g.seedRoles(ROLES);
  return {
    mode: 'cached',
    label: 'Cached snapshot · Oct 24, 2026',
    upsertProfile: (p) => g.upsertProfile(p),
    candidates: (id, c) => g.candidates(id, c),
    hiringPaths: (c) => g.hiringPaths(c),
    roles: async () => ROLES,
    recordMeeting: (id, m) => g.recordMeeting(id, m),
    removeMeeting: (id, mid) => g.removeMeeting(id, mid),
    meetings: (id) => g.meetings(id),
    reopen: async () => {
      g = await g.reopen();
    },
  };
}

export async function connectBackend(): Promise<Backend> {
  if (import.meta.env.DEV) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 1500);
      const h = await fetch('/api/health', { signal: ctrl.signal });
      clearTimeout(t);
      if (h.ok) return observeBackend(liveBackend((await h.json()).graphHost));
    } catch {
      // API not running: fall back to the cached snapshot
    }
  }
  return cachedBackend();
}
