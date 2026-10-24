// Hiring connections: a currently open, employer-verified role paired with a conference
// touchpoint whose listed speaker is affiliated with that employer. Affiliation is not a
// referral, hiring authority or availability, and the copy never says otherwise.
import type { GraphPath } from './graph-types';
import type { RoleRecord, SessionRecord } from './types';
export type { RoleRecord };
import { slug } from './ids';

/** Employer-operated careers hosts. Aggregators and social sites never count as apply links. */
export const EMPLOYER_HOSTS: Record<string, string[]> = {
  microsoft: ['apply.careers.microsoft.com', 'jobs.careers.microsoft.com', 'careers.microsoft.com'],
  github: ['www.github.careers', 'githubinc.jibeapply.com', 'careers-githubinc.icims.com'],
  docker: ['www.docker.com'],
};

export const ROLE_MAX_AGE_HOURS = 72;

export function verifyRole(role: RoleRecord, now: string): { ok: true } | { ok: false; reason: string } {
  if (role.status !== 'open') return { ok: false, reason: `listing is not open (${role.status})` };
  const age = (Date.parse(now) - Date.parse(role.checkedAt)) / 3_600_000;
  if (!Number.isFinite(age) || age < -0.1 || age > ROLE_MAX_AGE_HOURS) return { ok: false, reason: 'listing needs a recheck' };
  let host = '';
  try {
    const u = new URL(role.applyUrl);
    if (u.protocol === 'https:') host = u.hostname;
  } catch {
    // invalid URL
  }
  if (!host || !(EMPLOYER_HOSTS[slug(role.company)] ?? []).includes(host)) return { ok: false, reason: 'no employer application link' };
  return { ok: true };
}

export interface Touchpoint {
  session: SessionRecord;
  person: { name: string; title?: string };
  path: GraphPath;
}

export interface HiringConnection extends Touchpoint {
  role: RoleRecord;
  applyUrl: string;
  explanation: string;
  otherTouchpoints: Touchpoint[];
}

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });

export function hiringConnections(
  paths: GraphPath[],
  roles: RoleRecord[],
  sessions: SessionRecord[],
  /** `now` decides which touchpoints are upcoming; `verifyAt` is when the role data reflects (defaults to now). */
  opts: { now: string; verifyAt?: string; profile: { maxYearsExperience: number }; limit?: number },
): HiringConnection[] {
  const byId = new Map(sessions.map((s) => [s.id, s]));
  const out: HiringConnection[] = [];
  const usedSessions = new Set<string>();

  for (const role of roles) {
    if (!verifyRole(role, opts.verifyAt ?? opts.now).ok) continue;
    if (role.minYearsExperience === null || role.minYearsExperience > opts.profile.maxYearsExperience) continue;

    const touchpoints: Touchpoint[] = paths
      .filter((p) => p.nodes[3]?.id === role.id)
      .map((p): Touchpoint | undefined => {
        const session = byId.get(p.nodes[0]!.id);
        const name = p.nodes[1]!.name;
        return session ? { session, person: { name, title: session.speakers.find((s) => s.name === name)?.title }, path: p } : undefined;
      })
      .filter((t): t is Touchpoint => !!t && Date.parse(t.session.start) > Date.parse(opts.now))
      .sort((a, b) => Date.parse(a.session.start) - Date.parse(b.session.start) || a.person.name.localeCompare(b.person.name));

    // Prefer a touchpoint no earlier card uses, so several roles at one company don't repeat a session.
    const primary = touchpoints.find((t) => !usedSessions.has(t.session.id)) ?? touchpoints[0];
    if (!primary) continue;
    usedSessions.add(primary.session.id);
    const seen = new Set([primary.session.id]);
    const others = touchpoints.filter((t) => !seen.has(t.session.id) && seen.add(t.session.id));
    const title = primary.person.title ? ` (${primary.person.title})` : '';
    out.push({
      ...primary,
      role,
      applyUrl: role.applyUrl,
      otherTouchpoints: others,
      explanation:
        `${primary.person.name}${title} is a listed speaker for “${primary.session.title}” and is listed with ${role.company} in the conference catalog. ` +
        `${role.company}’s careers site lists “${role.title}” as open (checked ${when(role.checkedAt)}).`,
    });
    if (out.length >= (opts.limit ?? 3)) break;
  }
  return out;
}
