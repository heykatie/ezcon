// Local ezcon API. Binds to loopback only; there is no authentication, so it must never be
// exposed publicly. Credentials stay in .env and never reach the browser.
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { FalkorDB } from 'falkordb';
import { z } from 'zod';
import { FalkorGraph } from './graph';
import { runResearch } from './research';
import { describeError } from '../scripts/check-falkordb-lib.mjs';
import { SESSIONS, ROLES } from '../src/data/demo';
import type { ConferenceId } from '../src/domain/types';

const PORT = Number(process.env.EZCON_API_PORT ?? 8787);
const GRAPH = process.env.EZCON_GRAPH ?? 'ezcon';
const url = process.env.FALKORDB_URL;
if (!url) throw new Error('FALKORDB_URL is required (see .env.example)');

const connect = () => FalkorDB.connect({ url, socket: { connectTimeout: 10_000, reconnectStrategy: (n: number) => (n > 3 ? false : 500) } });
let graph = new FalkorGraph(await connect(), GRAPH, connect);
await graph.seedPublic([...SESSIONS.universe26, ...SESSIONS.wad26na]);
await graph.seedRoles(ROLES);

const ProfileId = z.string().regex(/^profile:[a-z0-9-]{1,40}$/);
const Conference = z.enum(['universe26', 'wad26na']);
const schemas = {
  profile: z.object({ id: ProfileId, interests: z.array(z.string().min(1).max(80)).max(20), fictional: z.boolean(), name: z.string().max(60).optional() }).strict(),
  meeting: z
    .object({
      profileId: ProfileId,
      meeting: z.object({ meetingId: z.string().regex(/^[a-z0-9:-]{1,80}$/), personId: z.string().max(200), eventId: z.string().max(200), at: z.string().max(40), fictional: z.boolean(), note: z.string().max(500).optional() }).strict(),
    })
    .strict(),
  research: z.object({ kind: z.enum(['wad-session', 'universe-catalog']), url: z.string().url().max(500) }).strict(),
};

async function body(req: IncomingMessage): Promise<unknown> {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 20_000) throw Object.assign(new Error('body too large'), { status: 413 });
  }
  return raw ? JSON.parse(raw) : {};
}

function send(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(JSON.stringify(data));
}

let researching = false;

const server = createServer(async (req, res) => {
  const u = new URL(req.url ?? '/', 'http://localhost');
  const q = (k: string) => u.searchParams.get(k) ?? '';
  try {
    if (req.method === 'GET' && u.pathname === '/api/health') return send(res, 200, { mode: 'live', graph: GRAPH, graphHost: url.startsWith('falkors://') ? 'FalkorDB Cloud (TLS)' : 'local FalkorDB' });
    if (req.method === 'POST' && u.pathname === '/api/profile') {
      await graph.upsertProfile(schemas.profile.parse(await body(req)));
      return send(res, 200, { ok: true });
    }
    if (req.method === 'GET' && u.pathname === '/api/candidates') {
      return send(res, 200, await graph.candidates(ProfileId.parse(q('profile')), Conference.parse(q('conference')) as ConferenceId));
    }
    if (req.method === 'GET' && u.pathname === '/api/hiring-paths') return send(res, 200, await graph.hiringPaths(Conference.parse(q('conference')) as ConferenceId));
    if (u.pathname === '/api/meetings') {
      if (req.method === 'GET') return send(res, 200, await graph.meetings(ProfileId.parse(q('profile'))));
      if (req.method === 'POST') {
        const { profileId, meeting } = schemas.meeting.parse(await body(req));
        return send(res, 200, await graph.recordMeeting(profileId, meeting));
      }
      if (req.method === 'DELETE') return send(res, 200, await graph.removeMeeting(ProfileId.parse(q('profile')), z.string().max(80).parse(q('id'))));
    }
    if (req.method === 'POST' && u.pathname === '/api/reconnect') {
      // Proves memory is in the database, not the API process: drop the connection and reopen.
      graph = (await graph.reopen()) as FalkorGraph;
      return send(res, 200, { ok: true });
    }
    if (req.method === 'POST' && u.pathname === '/api/research') {
      if (researching) return send(res, 429, { error: 'a research run is already in progress' });
      researching = true;
      try {
        const { kind, url: target } = schemas.research.parse(await body(req));
        const r = await runResearch(kind, target, { baseUrl: process.env.TRUEFORGE_URL ?? 'http://localhost:8790', model: process.env.EZCON_MODEL ?? 'openai/gpt-5-4-nano' });
        if (r.records.length) await graph.seedPublic(r.records);
        return send(res, 200, r);
      } finally {
        researching = false;
      }
    }
    return send(res, 404, { error: 'not found' });
  } catch (err) {
    const e = err as Error & { status?: number };
    if (err instanceof z.ZodError) return send(res, 400, { error: 'invalid request', issues: err.issues.map((i) => i.path.join('.')) });
    const msg = e.message ?? 'error';
    const status = e.status ?? (/unknown (profile|person|event)/.test(msg) ? 422 : 500);
    if (status === 500) console.error(describeError(err, url));
    return send(res, status, { error: status === 500 ? 'internal error' : msg });
  }
});

server.listen(PORT, '127.0.0.1', () => console.log(`ezcon API on http://127.0.0.1:${PORT} (graph ${GRAPH})`));
