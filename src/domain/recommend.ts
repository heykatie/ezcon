// Deterministic ranking over graph candidates. Hard constraints (time, schedule, conflicts)
// filter first; goal fit only orders what qualifies. Never pads to three.
import type { Candidate, GraphPath } from './graph-types';
import type { Goal, SessionRecord } from './types';
import { defaultBuffer, findConflicts, type ScheduleItem } from './schedule';

export interface Recommendation {
  session: SessionRecord;
  score: number;
  reasons: string[];
  paths: GraphPath[];
}

export interface RankOptions {
  goals: Goal[];
  schedule: ScheduleItem[];
  now: string;
  limit?: number;
}

const LEARNING_TYPES = new Set(['workshop', 'breakout session', 'product demo']);

export const toScheduleItem = (s: SessionRecord): ScheduleItem => ({
  eventId: s.id,
  title: s.title,
  start: s.start,
  end: s.end,
  location: s.location,
  kind: 'fixed',
});

export function rankRecommendations(candidates: Candidate[], sessions: SessionRecord[], opts: RankOptions): Recommendation[] {
  const byId = new Map(sessions.map((s) => [s.id, s]));
  const grouped = new Map<string, Candidate[]>();
  for (const c of candidates) grouped.set(c.sessionId, [...(grouped.get(c.sessionId) ?? []), c]);

  const recs: Recommendation[] = [];
  for (const [sessionId, cs] of grouped) {
    const session = byId.get(sessionId);
    if (!session || !session.catalogs.includes('quest')) continue;
    if (Date.parse(session.start) <= Date.parse(opts.now)) continue;
    if (opts.schedule.some((s) => s.eventId === sessionId)) continue;
    if (findConflicts(opts.schedule, toScheduleItem(session), defaultBuffer).length) continue;

    const reasons: string[] = [];
    let score = 0;
    const topics = [...new Set(cs.filter((c) => c.kind === 'topic-match').map((c) => c.path.nodes[1]!.name))].sort();
    if (topics.length) {
      score += 2 * topics.length;
      reasons.push(`Matches your interests: ${topics.join(', ')}`);
    }
    const warm = cs.find((c) => c.kind === 'same-company-as-met');
    if (warm) {
      const [, met, company, speaker] = warm.path.nodes;
      score += 3;
      reasons.push(`You met ${met!.name} (${company!.name}); ${speaker!.name}, also listed with ${company!.name}, speaks here`);
    }
    if (opts.goals.includes('learn') && session.sessionType && LEARNING_TYPES.has(session.sessionType.toLowerCase())) score += 1;
    if (opts.goals.includes('meet') && session.speakers.length) score += 1;

    recs.push({ session, score, reasons, paths: cs.map((c) => c.path) });
  }

  return recs
    .sort((a, b) => b.score - a.score || Date.parse(a.session.start) - Date.parse(b.session.start) || a.session.title.localeCompare(b.session.title))
    .slice(0, opts.limit ?? 3);
}
