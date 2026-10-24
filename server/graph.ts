// FalkorDB graph store. Only the fixed, parameterized templates below are executed;
// no model-generated Cypher. Private edges always hang off a validated Profile node.
import type { FalkorDB } from 'falkordb';
import type { ConferenceId, RoleRecord, SessionRecord } from '../src/domain/types';
import { EVIDENCE, type Candidate, type GraphPath, type GraphStore, type Meeting, type MeetingInput, type NodeLabel, type ProfileInput } from '../src/domain/graph-types';
import { companyId, personId, topicId } from '../src/domain/ids';

type Params = Record<string, unknown>;

interface RawPath {
  nodes: Array<{ id: number; labels: string[]; properties: Record<string, unknown> }>;
  edges: Array<{ sourceId: number; destinationId: number; relationshipType: string; properties: Record<string, unknown> }>;
}

const Q = {
  indexes: [
    'CREATE INDEX FOR (n:Session) ON (n.id)',
    'CREATE INDEX FOR (n:Person) ON (n.id)',
    'CREATE INDEX FOR (n:Topic) ON (n.id)',
    'CREATE INDEX FOR (n:Company) ON (n.id)',
    'CREATE INDEX FOR (n:Profile) ON (n.id)',
    'CREATE INDEX FOR (n:Role) ON (n.id)',
  ],
  sessions: `UNWIND $rows AS r
    MERGE (c:Conference {id: r.conference})
    MERGE (s:Session {id: r.id})
    SET s.name = r.title, s.title = r.title, s.conference = r.conference, s.start = r.start, s.end = r.end,
        s.timezone = r.timezone, s.location = r.location, s.url = r.url,
        s.source_url = r.sourceUrl, s.retrieved_at = r.retrievedAt, s.evidence = r.status
    MERGE (s)-[:PART_OF]->(c)`,
  about: `UNWIND $rows AS r
    MATCH (s:Session {id: r.sessionId})
    MERGE (t:Topic {id: r.topicId}) SET t.name = r.name
    MERGE (s)-[e:ABOUT]->(t) SET e.evidence = $evidence, e.source_url = r.sourceUrl, e.retrieved_at = r.retrievedAt`,
  speaks: `UNWIND $rows AS r
    MATCH (s:Session {id: r.sessionId})
    MERGE (p:Person {id: r.personId}) SET p.name = r.name, p.title = r.title
    MERGE (p)-[e:SPEAKS_AT]->(s) SET e.evidence = $evidence, e.source_url = r.sourceUrl, e.retrieved_at = r.retrievedAt`,
  works: `UNWIND $rows AS r
    MATCH (p:Person {id: r.personId})
    MERGE (c:Company {id: r.companyId}) SET c.name = r.name
    MERGE (p)-[e:WORKS_AT]->(c) SET e.evidence = $evidence, e.source_url = r.sourceUrl, e.retrieved_at = r.retrievedAt`,
  roles: `UNWIND $rows AS r
    MERGE (c:Company {id: r.companyId}) ON CREATE SET c.name = r.company
    MERGE (role:Role {id: r.id})
    SET role.name = r.title, role.status = r.status, role.apply_url = r.applyUrl, role.checked_at = r.checkedAt
    MERGE (c)-[e:OFFERS_ROLE]->(role) SET e.evidence = $evidence, e.source_url = r.sourceUrl, e.retrieved_at = r.checkedAt`,
  hiringPaths: `MATCH path = (s:Session {conference: $conf})<-[:SPEAKS_AT]-(:Person)-[:WORKS_AT]->(:Company)-[:OFFERS_ROLE]->(r:Role {status: 'open'})
    RETURN path ORDER BY s.start LIMIT 200`,
  profile: `MERGE (p:Profile {id: $id}) SET p.name = $name, p.fictional = $fictional
    WITH p OPTIONAL MATCH (p)-[i:INTERESTED_IN]->() DELETE i`,
  interests: `MATCH (p:Profile {id: $id})
    UNWIND $topics AS tp
    MERGE (t:Topic {id: tp.id}) ON CREATE SET t.name = tp.name
    MERGE (p)-[e:INTERESTED_IN]->(t) SET e.evidence = $evidence`,
  topicPaths: `MATCH path = (pr:Profile {id: $pid})-[:INTERESTED_IN]->(:Topic)<-[:ABOUT]-(s:Session {conference: $conf})
    RETURN path, s.id AS sid ORDER BY sid LIMIT 500`,
  speakerPaths: `MATCH path = (pr:Profile {id: $pid})-[:INTERESTED_IN]->(:Topic)<-[:ABOUT]-(s:Session {conference: $conf})<-[:SPEAKS_AT]-(:Person)-[:WORKS_AT]->(:Company)
    RETURN path, s.id AS sid ORDER BY sid LIMIT 1000`,
  warmPaths: `MATCH path = (pr:Profile {id: $pid})-[:MET]->(m:Person)-[:WORKS_AT]->(:Company)<-[:WORKS_AT]-(sp:Person)-[:SPEAKS_AT]->(s:Session {conference: $conf})
    WHERE sp.id <> m.id
    RETURN path, s.id AS sid ORDER BY sid LIMIT 200`,
  exists: `OPTIONAL MATCH (pr:Profile {id: $pid}) OPTIONAL MATCH (p:Person {id: $personId}) OPTIONAL MATCH (s:Session {id: $eventId})
    OPTIONAL MATCH (pr)-[m:MET {id: $mid}]->()
    RETURN count(DISTINCT pr) AS profiles, count(DISTINCT p) AS persons, count(DISTINCT s) AS sessions, count(m) AS existing`,
  meet: `MATCH (pr:Profile {id: $pid}), (p:Person {id: $personId})
    CREATE (pr)-[m:MET {id: $mid}]->(p)
    SET m.event_id = $eventId, m.at = $at, m.fictional = $fictional, m.note = $note, m.evidence = $evidence`,
  unmeet: `MATCH (:Profile {id: $pid})-[m:MET {id: $mid}]->() DELETE m RETURN count(m) AS removed`,
  meetings: `MATCH (:Profile {id: $pid})-[m:MET]->(p:Person)
    RETURN m.id AS meetingId, p.id AS personId, p.name AS personName, m.event_id AS eventId, m.at AS at, m.fictional AS fictional, m.note AS note
    ORDER BY m.at, m.id`,
};

function toPath(raw: RawPath): GraphPath {
  const ext = new Map(raw.nodes.map((n) => [n.id, String(n.properties.id)]));
  return {
    nodes: raw.nodes.map((n) => ({ id: String(n.properties.id), label: n.labels[0] as NodeLabel, name: String(n.properties.name ?? '') })),
    edges: raw.edges.map((e) => {
      const edge: GraphPath['edges'][number] = {
        type: e.relationshipType as GraphPath['edges'][number]['type'],
        from: ext.get(e.sourceId)!,
        to: ext.get(e.destinationId)!,
        evidence: String(e.properties.evidence ?? ''),
      };
      if (e.properties.source_url) edge.sourceUrl = String(e.properties.source_url);
      if (e.properties.retrieved_at) edge.retrievedAt = String(e.properties.retrieved_at);
      return edge;
    }),
  };
}

export class FalkorGraph implements GraphStore {
  private indexed = false;

  constructor(
    private db: FalkorDB,
    private graphName: string,
    private connect: () => Promise<FalkorDB>,
  ) {}

  private async q<T = Record<string, unknown>>(query: string, params: Params = {}): Promise<T[]> {
    const res = await this.db.selectGraph(this.graphName).query<T>(query, { params: params as never });
    return (res.data ?? []) as T[];
  }

  private async ensureIndexes() {
    if (this.indexed) return;
    for (const q of Q.indexes) {
      try {
        await this.q(q);
      } catch {
        // index already exists
      }
    }
    this.indexed = true;
  }

  async seedPublic(records: SessionRecord[]) {
    await this.ensureIndexes();
    const prov = (r: SessionRecord) => ({ sourceUrl: r.source.url, retrievedAt: r.source.retrievedAt });
    await this.q(Q.sessions, {
      rows: records.map((r) => ({ id: r.id, title: r.title, conference: r.conference, start: r.start, end: r.end, timezone: r.timezone, location: r.location ?? null, url: r.url, status: r.source.status, ...prov(r) })),
    });
    await this.q(Q.about, { evidence: EVIDENCE.topic, rows: records.flatMap((r) => r.topics.map((t) => ({ sessionId: r.id, topicId: topicId(t), name: t, ...prov(r) }))) });
    await this.q(Q.speaks, {
      evidence: EVIDENCE.speaker,
      rows: records.flatMap((r) => r.speakers.map((s) => ({ sessionId: r.id, personId: personId(s.name, s.company), name: s.name, title: s.title ?? null, ...prov(r) }))),
    });
    await this.q(Q.works, {
      evidence: EVIDENCE.affiliation,
      rows: records.flatMap((r) => r.speakers.filter((s) => s.company).map((s) => ({ personId: personId(s.name, s.company), companyId: companyId(s.company!), name: s.company, ...prov(r) }))),
    });
  }

  async seedRoles(roles: RoleRecord[]) {
    await this.ensureIndexes();
    await this.q(Q.roles, {
      evidence: EVIDENCE.role,
      rows: roles.map((r) => ({ id: r.id, title: r.title, status: r.status, company: r.company, companyId: companyId(r.company), applyUrl: r.applyUrl, checkedAt: r.checkedAt, sourceUrl: r.source.url })),
    });
  }

  async hiringPaths(conference: ConferenceId): Promise<GraphPath[]> {
    const rows = await this.q<{ path: RawPath }>(Q.hiringPaths, { conf: conference });
    return rows.map((r) => toPath(r.path));
  }

  async upsertProfile(p: ProfileInput) {
    await this.ensureIndexes();
    await this.q(Q.profile, { id: p.id, name: p.name ?? 'Demo profile', fictional: p.fictional });
    await this.q(Q.interests, { id: p.id, evidence: EVIDENCE.interest, topics: p.interests.map((t) => ({ id: topicId(t), name: t })) });
  }

  async candidates(profileId: string, conference: ConferenceId): Promise<Candidate[]> {
    const params = { pid: profileId, conf: conference };
    const [short, long, warm] = await Promise.all([
      this.q<{ path: RawPath; sid: string }>(Q.topicPaths, params),
      this.q<{ path: RawPath; sid: string }>(Q.speakerPaths, params),
      this.q<{ path: RawPath; sid: string }>(Q.warmPaths, params),
    ]);
    const withSpeakers = new Set(long.map((r) => r.sid));
    return [
      ...short.filter((r) => !withSpeakers.has(r.sid)).map((r) => ({ sessionId: r.sid, kind: 'topic-match' as const, path: toPath(r.path) })),
      ...long.map((r) => ({ sessionId: r.sid, kind: 'topic-match' as const, path: toPath(r.path) })),
      ...warm.map((r) => ({ sessionId: r.sid, kind: 'same-company-as-met' as const, path: toPath(r.path) })),
    ];
  }

  async recordMeeting(profileId: string, m: MeetingInput) {
    const [row] = await this.q<{ profiles: number; persons: number; sessions: number; existing: number }>(Q.exists, {
      pid: profileId,
      personId: m.personId,
      eventId: m.eventId,
      mid: m.meetingId,
    });
    if (!row?.profiles) throw new Error('unknown profile');
    if (!row.persons) throw new Error('unknown person');
    if (!row.sessions) throw new Error('unknown event');
    if (row.existing) return { created: false };
    await this.q(Q.meet, {
      pid: profileId,
      personId: m.personId,
      mid: m.meetingId,
      eventId: m.eventId,
      at: m.at,
      fictional: m.fictional,
      note: m.note ?? null,
      evidence: `${EVIDENCE.meeting}${m.fictional ? ' (fictional demo)' : ''}`,
    });
    return { created: true };
  }

  async removeMeeting(profileId: string, meetingId: string) {
    const [row] = await this.q<{ removed: number }>(Q.unmeet, { pid: profileId, mid: meetingId });
    return { removed: (row?.removed ?? 0) > 0 };
  }

  async meetings(profileId: string): Promise<Meeting[]> {
    const rows = await this.q<Meeting & { note: string | null }>(Q.meetings, { pid: profileId });
    return rows.map(({ note, ...m }) => (note ? { ...m, note } : m));
  }

  async reopen() {
    return new FalkorGraph(await this.connect(), this.graphName, this.connect);
  }
}
