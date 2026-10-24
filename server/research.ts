// Live research: TrueForge runs an OpenAI model with a narrow Bright Data tool allowlist;
// ezcon reads the raw tool output and extracts facts with deterministic, container-scoped
// parsers. The model chooses and calls tools; it never supplies the facts we store.
import { lookup } from 'node:dns/promises';
import { TrueForge } from '@truefoundry/trueforge-sdk';
import { isPublicFetchTarget } from '../src/domain/urls';
import { parseUniverseCatalog } from '../src/domain/extract/universe';
import { parseWadSession } from '../src/domain/extract/wad';
import type { ExtractionResult } from '../src/domain/types';

export type ResearchKind = 'wad-session' | 'universe-catalog';

// Iterations include TrueForge's tool discovery (list_tools, get_tool_info) before the real calls.
const SOURCES: Record<ResearchKind, { hosts: string[]; tools: string[]; steps: string; iterations: number }> = {
  'wad-session': {
    hosts: ['www.wearedevelopers.com'],
    tools: ['scrape_as_html'],
    steps: 'Call scrape_as_html once on the URL.',
    iterations: 5,
  },
  'universe-catalog': {
    hosts: ['reg.githubuniverse.com'],
    // The catalog renders client-side; scrolling waits for session containers before capture.
    tools: ['scraping_browser_navigate', 'scraping_browser_scroll', 'scraping_browser_get_html'],
    steps: 'Call scraping_browser_navigate on the URL, then scraping_browser_scroll once, then scraping_browser_get_html once with full_page set to true.',
    iterations: 8,
  },
};

export const LIMITS = { maxIterations: 8, timeoutMs: 150_000 } as const;

export interface ToolTrace {
  tool: string;
  args: unknown;
  responseChars: number;
  at: string;
}

export interface ResearchResult extends ExtractionResult {
  kind: ResearchKind;
  url: string;
  retrievedAt: string;
  durationMs: number;
  model: string;
  sessionId: string;
  trace: ToolTrace[];
  usage: { inputTokens: number; outputTokens: number };
  status: 'ok' | 'partial' | 'failed';
  error?: string;
}

const resolver = async (host: string) => (await lookup(host, { all: true })).map((a) => a.address);

export async function assertResearchTarget(kind: ResearchKind, url: string) {
  const src = SOURCES[kind];
  if (!src) throw new Error('unsupported research kind');
  const u = new URL(url);
  if (u.protocol !== 'https:' || !src.hosts.includes(u.hostname)) throw new Error(`URL is not an allowlisted ${kind} source`);
  const safe = await isPublicFetchTarget(url, resolver);
  if (!safe.ok) throw new Error(`refusing to fetch: ${safe.reason}`);
}

interface RawEvent {
  type: string;
  createdAt?: string;
  content?: unknown;
  toolCallId?: string;
  toolCalls?: Array<{ id: string; function?: { name: string; arguments: string }; name?: string; arguments?: string }>;
  state?: { status?: string; message?: string; metrics?: { totalInputTokens?: number; totalOutputTokens?: number } };
}

export async function runResearch(kind: ResearchKind, url: string, opts: { baseUrl: string; model: string }): Promise<ResearchResult> {
  await assertResearchTarget(kind, url);
  const started = Date.now();
  const retrievedAt = new Date().toISOString();
  const src = SOURCES[kind];
  const client = new TrueForge({ baseUrl: opts.baseUrl });
  const base = { kind, url, retrievedAt, model: opts.model, records: [], rejected: [], trace: [] as ToolTrace[], usage: { inputTokens: 0, outputTokens: 0 } };

  const session = await client.sessions.create({
    agent: {
      spec: {
        model: { name: opts.model, params: { reasoningEffort: 'low', parallelToolCalls: false } },
        instructions: [
          'You run retrieval tools for ezcon. Use only the tools you are given, only on the URL in the user message.',
          src.steps,
          'Do not summarize, extract or restate page content. After the tool calls, reply with the single word DONE.',
        ].join(' '),
        mcpServers: [{ name: 'bright-data', enableTools: src.tools, preload: true, preloadTools: src.tools }],
        // Keep raw HTML in the tool response so ezcon's parser (not the model) extracts fields.
        config: { iterationLimit: Math.min(src.iterations, LIMITS.maxIterations), contextManagement: { largeToolResponse: { enabled: false } } },
      },
    },
    metadata: { app: 'ezcon', purpose: `research:${kind}` } as never,
  });
  const sessionId = (session as { data: { id: string } }).data.id;

  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), LIMITS.timeoutMs);
  const events: RawEvent[] = [];
  try {
    const stream = await client.sessions.createTurnStream(
      sessionId,
      { input: [{ type: 'user.message', content: `URL: ${url}` }] } as never,
      { abortSignal: abort.signal, timeoutInSeconds: LIMITS.timeoutMs / 1000 },
    );
    // Stream items wrap the session event: { turnId, event: { type, ... } }.
    for await (const ev of stream as AsyncIterable<{ event?: RawEvent; data?: RawEvent } & RawEvent>) {
      const e = (ev.event ?? ev.data ?? ev) as RawEvent;
      if (e?.type) events.push(e);
    }
  } catch (err) {
    if (!abort.signal.aborted) {
      clearTimeout(timer);
      return { ...base, sessionId, durationMs: Date.now() - started, status: 'failed', error: (err as Error).message };
    }
  } finally {
    clearTimeout(timer);
  }

  // Streamed model messages are partial; read the stored events for the authoritative record.
  try {
    const stored: RawEvent[] = [];
    for await (const item of (await client.sessions.listEvents(sessionId, {})) as AsyncIterable<{ event?: RawEvent }>) {
      if (item.event?.type) stored.push(item.event);
    }
    if (stored.length) events.splice(0, events.length, ...stored.reverse());
  } catch {
    // fall back to streamed events
  }

  // Map tool call ids to names/args, then attach response sizes.
  const calls = new Map<string, { tool: string; args: unknown; at: string }>();
  for (const m of events.filter((e) => e.type === 'model.message')) {
    for (const c of m.toolCalls ?? []) {
      const name = c.function?.name ?? c.name ?? 'unknown';
      const rawArgs = c.function?.arguments ?? c.arguments ?? '{}';
      let args: unknown = rawArgs;
      try {
        args = JSON.parse(rawArgs);
      } catch {
        // keep the raw string
      }
      // TrueForge wraps MCP calls in its call_tool system tool; report the underlying tool.
      const wrapped = args as { mcp_server?: string; tool_name?: string; input?: unknown };
      if (name === 'call_tool' && wrapped?.tool_name) calls.set(c.id, { tool: `${wrapped.mcp_server}.${wrapped.tool_name}`, args: wrapped.input ?? null, at: m.createdAt ?? '' });
      else calls.set(c.id, { tool: name, args, at: m.createdAt ?? '' });
    }
  }
  const responses = events.filter((e) => e.type === 'tool.response');
  const trace = responses.map((r) => {
    const call = calls.get(r.toolCallId ?? '');
    return { tool: call?.tool ?? 'unknown', args: call?.args ?? null, responseChars: String(r.content ?? '').length, at: r.createdAt ?? '' };
  });

  const htmlResponse = [...responses].reverse().find((r) => /<\s*(html|body|section|li)\b/i.test(String(r.content ?? '')));
  const done = events.find((e) => e.type === 'turn.done');
  base.usage.inputTokens = done?.state?.metrics?.totalInputTokens ?? 0;
  base.usage.outputTokens = done?.state?.metrics?.totalOutputTokens ?? 0;
  const result = { ...base, sessionId, trace, durationMs: Date.now() - started };
  if (!htmlResponse) {
    return { ...result, status: 'failed', error: abort.signal.aborted ? 'stopped: time limit reached' : `no HTML returned (turn ${done?.state?.status ?? 'unknown'}${done?.state?.message ? `: ${done.state.message}` : ''})` };
  }

  const html = String(htmlResponse.content);
  const meta = { sourceUrl: url, retrievedAt, via: 'bright-data' as const };
  try {
    const extracted = kind === 'wad-session' ? { records: [parseWadSession(html, meta)], rejected: [] } : parseUniverseCatalog(html, { ...meta, year: 2026 });
    const status = extracted.records.length === 0 ? 'failed' : extracted.rejected.length ? 'partial' : 'ok';
    return { ...result, ...extracted, status, error: extracted.records.length ? undefined : 'no session containers found (shell page?)' };
  } catch (err) {
    return { ...result, status: 'failed', error: `extraction refused: ${(err as Error).message}` };
  }
}
