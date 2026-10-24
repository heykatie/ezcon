// In-browser graph store for the cached public demo. Same contract and path shapes as
// the FalkorDB store; persistence is whatever `storage` provides (browser-local only).
import type { ConferenceId, RoleRecord, SessionRecord } from './types';
import { EVIDENCE, type Candidate, type GraphPath, type GraphStore, type Meeting, type MeetingInput, type PathNode, type ProfileInput } from './graph-types';
import { companyId, personId, topicId } from './ids';

interface Prov {
  sourceUrl: string;
  retrievedAt: string;
}

export interface MemoryState {
  sessions: Record<string, { id: string; title: string; conference: ConferenceId } & Prov>;
  topics: Record<string, string>;
  persons: Record<string, string>;
  companies: Record<string, string>;
  about: Record<string, Prov & { sessionId: string; topicId: string }>;
  speaks: Record<string, Prov & { personId: string; sessionId: string }>;
  works: Record<string, Prov & { personId: string; companyId: string }>;
  profiles: Record<string, { id: string; name: string; interests: string[]; fictional: boolean }>;
  meetings: Record<string, Meeting[]>;
  roles: Record<string, Prov & { id: string; title: string; companyId: string; status: RoleRecord['status'] }>;
}

export interface MemoryStorage {
  load(): MemoryState | undefined;
  save(state: MemoryState): void;
}

const empty = (): MemoryState => ({ sessions: {}, topics: {}, persons: {}, companies: {}, about: {}, speaks: {}, works: {}, profiles: {}, meetings: {}, roles: {} });

export class MemoryGraph implements GraphStore {
  private s: MemoryState;

  constructor(private storage?: MemoryStorage) {
    this.s = { ...empty(), ...structuredClone(storage?.load() ?? {}) };
  }

  private persist() {
    this.storage?.save(this.s);
  }

  async seedPublic(records: SessionRecord[]) {
    for (const r of records) {
      const prov = { sourceUrl: r.source.url, retrievedAt: r.source.retrievedAt };
      this.s.sessions[r.id] = { id: r.id, title: r.title, conference: r.conference, ...prov };
      for (const t of r.topics) {
        const tid = topicId(t);
        this.s.topics[tid] = t;
        this.s.about[`${r.id}|${tid}`] = { sessionId: r.id, topicId: tid, ...prov };
      }
      for (const sp of r.speakers) {
        const pid = personId(sp.name, sp.company);
        this.s.persons[pid] = sp.name;
        this.s.speaks[`${pid}|${r.id}`] = { personId: pid, sessionId: r.id, ...prov };
        if (sp.company) {
          const cid = companyId(sp.company);
          this.s.companies[cid] = sp.company;
          this.s.works[`${pid}|${cid}`] = { personId: pid, companyId: cid, ...prov };
        }
      }
    }
    this.persist();
  }

  async seedRoles(roles: RoleRecord[]) {
    for (const r of roles) {
      const cid = companyId(r.company);
      this.s.companies[cid] ??= r.company;
      this.s.roles[r.id] = { id: r.id, title: r.title, companyId: cid, status: r.status, sourceUrl: r.source.url, retrievedAt: r.checkedAt };
    }
    this.persist();
  }

  async hiringPaths(conference: ConferenceId): Promise<GraphPath[]> {
    const out: GraphPath[] = [];
    for (const role of Object.values(this.s.roles).filter((r) => r.status === 'open')) {
      for (const w of Object.values(this.s.works).filter((x) => x.companyId === role.companyId)) {
        for (const sp of Object.values(this.s.speaks).filter((x) => x.personId === w.personId && this.s.sessions[x.sessionId]?.conference === conference)) {
          out.push({
            nodes: [this.node('Session', sp.sessionId), this.node('Person', w.personId), this.node('Company', role.companyId), { id: role.id, label: 'Role', name: role.title }],
            edges: [
              { type: 'SPEAKS_AT', from: w.personId, to: sp.sessionId, evidence: EVIDENCE.speaker, sourceUrl: sp.sourceUrl, retrievedAt: sp.retrievedAt },
              { type: 'WORKS_AT', from: w.personId, to: role.companyId, evidence: EVIDENCE.affiliation, sourceUrl: w.sourceUrl, retrievedAt: w.retrievedAt },
              { type: 'OFFERS_ROLE', from: role.companyId, to: role.id, evidence: EVIDENCE.role, sourceUrl: role.sourceUrl, retrievedAt: role.retrievedAt },
            ],
          });
        }
      }
    }
    return out;
  }

  async upsertProfile(p: ProfileInput) {
    for (const t of p.interests) this.s.topics[topicId(t)] ??= t;
    this.s.profiles[p.id] = { id: p.id, name: p.name ?? 'Demo profile', interests: p.interests.map(topicId), fictional: p.fictional };
    this.persist();
  }

  private node(label: PathNode['label'], id: string): PathNode {
    const name =
      label === 'Profile' ? this.s.profiles[id]!.name
      : label === 'Topic' ? this.s.topics[id]!
      : label === 'Session' ? this.s.sessions[id]!.title
      : label === 'Person' ? this.s.persons[id]!
      : this.s.companies[id]!;
    return { id, label, name };
  }

  async candidates(profileId: string, conference: ConferenceId): Promise<Candidate[]> {
    const profile = this.s.profiles[profileId];
    if (!profile) return [];
    const out: Candidate[] = [];
    const about = Object.values(this.s.about);
    const speaks = Object.values(this.s.speaks);
    const works = Object.values(this.s.works);

    for (const tid of profile.interests) {
      for (const a of about.filter((x) => x.topicId === tid && this.s.sessions[x.sessionId]?.conference === conference)) {
        const base: GraphPath = {
          nodes: [this.node('Profile', profileId), this.node('Topic', tid), this.node('Session', a.sessionId)],
          edges: [
            { type: 'INTERESTED_IN', from: profileId, to: tid, evidence: EVIDENCE.interest },
            { type: 'ABOUT', from: a.sessionId, to: tid, evidence: EVIDENCE.topic, sourceUrl: a.sourceUrl, retrievedAt: a.retrievedAt },
          ],
        };
        const affiliated = speaks
          .filter((sp) => sp.sessionId === a.sessionId)
          .flatMap((sp) => works.filter((w) => w.personId === sp.personId).map((w) => ({ sp, w })));
        if (affiliated.length === 0) out.push({ sessionId: a.sessionId, kind: 'topic-match', path: base });
        for (const { sp, w } of affiliated) {
          out.push({
            sessionId: a.sessionId,
            kind: 'topic-match',
            path: {
              nodes: [...base.nodes, this.node('Person', sp.personId), this.node('Company', w.companyId)],
              edges: [
                ...base.edges,
                { type: 'SPEAKS_AT', from: sp.personId, to: a.sessionId, evidence: EVIDENCE.speaker, sourceUrl: sp.sourceUrl, retrievedAt: sp.retrievedAt },
                { type: 'WORKS_AT', from: sp.personId, to: w.companyId, evidence: EVIDENCE.affiliation, sourceUrl: w.sourceUrl, retrievedAt: w.retrievedAt },
              ],
            },
          });
        }
      }
    }

    for (const m of this.s.meetings[profileId] ?? []) {
      for (const mw of works.filter((w) => w.personId === m.personId)) {
        for (const ow of works.filter((w) => w.companyId === mw.companyId && w.personId !== m.personId)) {
          for (const sp of speaks.filter((x) => x.personId === ow.personId && this.s.sessions[x.sessionId]?.conference === conference)) {
            out.push({
              sessionId: sp.sessionId,
              kind: 'same-company-as-met',
              path: {
                nodes: [this.node('Profile', profileId), this.node('Person', m.personId), this.node('Company', mw.companyId), this.node('Person', ow.personId), this.node('Session', sp.sessionId)],
                edges: [
                  { type: 'MET', from: profileId, to: m.personId, evidence: `${EVIDENCE.meeting}${m.fictional ? ' (fictional demo)' : ''}` },
                  { type: 'WORKS_AT', from: m.personId, to: mw.companyId, evidence: EVIDENCE.affiliation, sourceUrl: mw.sourceUrl, retrievedAt: mw.retrievedAt },
                  { type: 'WORKS_AT', from: ow.personId, to: mw.companyId, evidence: EVIDENCE.affiliation, sourceUrl: ow.sourceUrl, retrievedAt: ow.retrievedAt },
                  { type: 'SPEAKS_AT', from: ow.personId, to: sp.sessionId, evidence: EVIDENCE.speaker, sourceUrl: sp.sourceUrl, retrievedAt: sp.retrievedAt },
                ],
              },
            });
          }
        }
      }
    }
    return out;
  }

  async recordMeeting(profileId: string, m: MeetingInput) {
    if (!this.s.profiles[profileId]) throw new Error('unknown profile');
    const name = this.s.persons[m.personId];
    if (!name) throw new Error('unknown person');
    if (!this.s.sessions[m.eventId]) throw new Error('unknown event');
    const list = (this.s.meetings[profileId] ??= []);
    if (list.some((x) => x.meetingId === m.meetingId)) return { created: false };
    list.push({ ...m, personName: name });
    this.persist();
    return { created: true };
  }

  async removeMeeting(profileId: string, meetingId: string) {
    const list = this.s.meetings[profileId] ?? [];
    const next = list.filter((m) => m.meetingId !== meetingId);
    if (next.length === list.length) return { removed: false };
    this.s.meetings[profileId] = next;
    this.persist();
    return { removed: true };
  }

  async meetings(profileId: string) {
    return structuredClone(this.s.meetings[profileId] ?? []);
  }

  async reopen() {
    return new MemoryGraph(this.storage);
  }
}
