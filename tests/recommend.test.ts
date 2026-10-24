import { rankRecommendations } from '../src/domain/recommend';
import { MemoryGraph } from '../src/domain/memory-graph';
import { fixtureRecords } from './graph-contract';
import { personId } from '../src/domain/ids';

const P = 'profile:demo';
const find = (t: string) => fixtureRecords.find((r) => r.title.startsWith(t))!;

async function setup() {
  const g = new MemoryGraph();
  await g.seedPublic(fixtureRecords);
  await g.upsertProfile({ id: P, interests: ['AI: Agents', 'AI: MCP and other integrations', 'Accessibility'], fictional: true });
  return g;
}

describe('recommendations', () => {
  it('shows at most three qualifying sessions, best first, each with a real path', async () => {
    const g = await setup();
    const recs = rankRecommendations(await g.candidates(P, 'universe26'), fixtureRecords, {
      goals: ['learn'],
      schedule: [],
      now: '2026-10-28T08:00:00-07:00',
    });
    expect(recs.length).toBeLessThanOrEqual(3);
    expect(recs[0]!.session.title).toMatch(/Build once|Building a developer knowledge base/);
    for (const r of recs) expect(r.paths.length).toBeGreaterThan(0);
  });

  it('does not pad with filler when fewer than three qualify', async () => {
    const g = new MemoryGraph();
    await g.seedPublic(fixtureRecords);
    await g.upsertProfile({ id: P, interests: ['Accessibility'], fictional: true });
    const recs = rankRecommendations(await g.candidates(P, 'universe26'), fixtureRecords, { goals: [], schedule: [], now: '2026-10-28T08:00:00-07:00' });
    expect(recs.map((r) => r.session.title)).toEqual(['Accelerate accessibility with AI and automation']);
  });

  it('excludes past, already scheduled and conflicting sessions', async () => {
    const g = await setup();
    const workshop = find('Building a developer knowledge base');
    const recs = rankRecommendations(await g.candidates(P, 'universe26'), fixtureRecords, {
      goals: ['learn'],
      schedule: [{ eventId: workshop.id, title: workshop.title, start: workshop.start, end: workshop.end, location: workshop.location, kind: 'fixed' }],
      now: '2026-10-28T12:40:00-07:00',
    });
    const titles = recs.map((r) => r.session.title);
    expect(titles).not.toContain(workshop.title); // scheduled
    expect(titles).not.toContain('Build once, run on any agent: a practical guide to agent skills'); // started 12:30, now 12:40
    expect(titles).not.toContain('Accelerate accessibility with AI and automation'); // overlaps the workshop
  });

  it('a remembered meeting changes the next recommendation and says why', async () => {
    const g = await setup();
    const opts = { goals: ['meet' as const], schedule: [], now: '2026-10-28T13:15:00-07:00' };
    const before = rankRecommendations(await g.candidates(P, 'universe26'), fixtureRecords, opts);
    await g.recordMeeting(P, { meetingId: 'm1', personId: personId('Andrea Griffiths', 'GitHub'), eventId: find('Build once').id, at: '2026-10-28T13:10:00-07:00', fictional: true });
    const after = rankRecommendations(await g.candidates(P, 'universe26'), fixtureRecords, opts);
    expect(after[0]!.session.title).toBe('Accelerate accessibility with AI and automation');
    expect(after[0]!.reasons.join(' ')).toMatch(/Andrea Griffiths.*GitHub.*Ed Summers/);
    expect(after.map((r) => r.score)).not.toEqual(before.map((r) => r.score));
  });

  it('side quests are not recommended as quests', async () => {
    const g = await setup();
    const recs = rankRecommendations(await g.candidates(P, 'universe26'), fixtureRecords, { goals: ['fun'], schedule: [], now: '2026-10-27T08:00:00-07:00' });
    expect(recs.every((r) => r.session.catalogs.includes('quest'))).toBe(true);
  });
});
