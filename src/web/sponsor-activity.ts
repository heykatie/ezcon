import type { Backend, ResearchResponse } from './backend';

export type Activity = {
  sponsor: 'FalkorDB' | 'TrueForge + OpenAI' | 'Bright Data';
  state: 'running' | 'done' | 'failed';
  detail: string;
};
const listeners = new Set<(event: Activity) => void>();
const active = new Map<Activity['sponsor'], number>();
export function subscribeActivity(listener: (event: Activity) => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
function emit(event: Activity) { for (const listener of listeners) listener(event); }
async function track<T>(sponsor: Activity['sponsor'], detail: string, run: () => Promise<T>, isFailure?: (result: T) => boolean): Promise<T> {
  active.set(sponsor, (active.get(sponsor) ?? 0) + 1);
  emit({ sponsor, state: 'running', detail });
  let failed = false;
  try { const result = await run(); failed = isFailure?.(result) ?? false; return result; }
  catch (error) { failed = true; throw error; }
  finally {
    const remaining = Math.max(0, (active.get(sponsor) ?? 1) - 1);
    active.set(sponsor, remaining);
    emit({ sponsor, state: remaining ? 'running' : failed ? 'failed' : 'done', detail });
  }
}
const graphActions: Record<string, string> = {
  upsertProfile: 'Updating your interests', candidates: 'Finding relevant sessions',
  hiringPaths: 'Connecting roles to speakers', recordMeeting: 'Remembering your meeting',
  removeMeeting: 'Updating meeting memory', meetings: 'Loading your connections',
  reopen: 'Reconnecting your memory',
};
/** Instrument actual service requests only. Reading the cached demo never claims live use. */
export function observeBackend(backend: Backend): Backend {
  if (backend.mode !== 'live') return backend;
  return new Proxy(backend, {
    get(target, key, receiver) {
      const value = Reflect.get(target, key, receiver);
      if (typeof value !== 'function') return value;
      if (key === 'research') return async (...args: unknown[]) => {
        const result = await track<ResearchResponse>('TrueForge + OpenAI', 'Researching your source', () => value.apply(target, args), result => result.status === 'failed');
        if (result.trace.some(t => /scrape_as_html|scrape_as_markdown|scrape_as_json/.test(t.tool) && t.responseChars > 0)) {
          emit({ sponsor: 'Bright Data', state: 'done', detail: 'Source fetched · confirmed by tool trace' });
        }
        return result;
      };
      const detail = graphActions[String(key)];
      return detail ? (...args: unknown[]) => track('FalkorDB', detail, () => value.apply(target, args)) : value.bind(target);
    },
  });
}
