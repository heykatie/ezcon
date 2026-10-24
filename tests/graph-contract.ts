// Shared behavior contract for every GraphStore implementation (FalkorDB and in-browser).
import { readFileSync } from 'node:fs';
import { parseUniverseCatalog } from '../src/domain/extract/universe';
import type { GraphStore } from '../src/domain/graph-types';
import { personId } from '../src/domain/ids';

const html = readFileSync(new URL('./fixtures/universe-catalog.html', import.meta.url), 'utf8');
export const fixtureRecords = parseUniverseCatalog(html, {
  sourceUrl: 'https://reg.githubuniverse.com/flow/github/universe26/attendee-portal/page/sessioncatalog',
  retrievedAt: '2026-10-24T20:00:00Z',
  via: 'fixture',
  year: 2026,
}).records;

const A = 'profile:test-a';
const B = 'profile:test-b';
const andrea = personId('Andrea Griffiths', 'GitHub');
const buildOnce = fixtureRecords.find((r) => r.title.startsWith('Build once'))!.id;
const a11y = fixtureRecords.find((r) => r.title.startsWith('Accelerate accessibility'))!.id;

export function graphContract(name: string, make: () => Promise<GraphStore>, cleanup?: () => Promise<void>) {
  describe(`${name} graph store`, () => {
    let g: GraphStore;
    beforeEach(async () => {
      g = await make();
      await g.seedPublic(fixtureRecords);
      await g.upsertProfile({ id: A, interests: ['AI: Agents', 'Accessibility'], fictional: true });
      await g.upsertProfile({ id: B, interests: ['Tech debt'], fictional: true });
    });
    afterEach(async () => {
      await cleanup?.();
    });

    it('returns real topic paths from the profile to a session, speaker and company', async () => {
      const c = await g.candidates(A, 'universe26');
      const hit = c.find((x) => x.sessionId === a11y && x.kind === 'topic-match')!;
      expect(hit).toBeDefined();
      expect(hit.path.nodes.map((n) => n.label)).toEqual(['Profile', 'Topic', 'Session', 'Person', 'Company']);
      expect(hit.path.edges.map((e) => e.type)).toEqual(['INTERESTED_IN', 'ABOUT', 'SPEAKS_AT', 'WORKS_AT']);
      expect(hit.path.edges[1]!.sourceUrl).toMatch(/^https:\/\/reg\.githubuniverse\.com\//);
      expect(hit.path.nodes[1]!.name).toBe('Accessibility');
    });

    it('is idempotent when seeding twice', async () => {
      const before = await g.candidates(A, 'universe26');
      await g.seedPublic(fixtureRecords);
      expect(await g.candidates(A, 'universe26')).toHaveLength(before.length);
    });

    it('a confirmed meeting adds a new multi-hop path and survives a fresh store', async () => {
      const before = await g.candidates(A, 'universe26');
      expect(before.some((x) => x.kind === 'same-company-as-met')).toBe(false);
      expect(await g.recordMeeting(A, { meetingId: 'm1', personId: andrea, eventId: buildOnce, at: '2026-10-28T13:10:00-07:00', fictional: true })).toEqual({ created: true });

      const fresh = await g.reopen();
      const after = await fresh.candidates(A, 'universe26');
      const warm = after.find((x) => x.kind === 'same-company-as-met' && x.sessionId === a11y)!;
      expect(warm).toBeDefined();
      expect(warm.path.edges.map((e) => e.type)).toEqual(['MET', 'WORKS_AT', 'WORKS_AT', 'SPEAKS_AT']);
      expect(warm.path.nodes.map((n) => n.name)).toEqual(['Demo profile', 'Andrea Griffiths', 'GitHub', 'Ed Summers', 'Accelerate accessibility with AI and automation']);
      expect(await fresh.meetings(A)).toEqual([
        expect.objectContaining({ meetingId: 'm1', personId: andrea, personName: 'Andrea Griffiths', eventId: buildOnce }),
      ]);
    });

    it('does not duplicate a meeting confirmed twice', async () => {
      const m = { meetingId: 'm1', personId: andrea, eventId: buildOnce, at: '2026-10-28T13:10:00-07:00', fictional: true };
      await g.recordMeeting(A, m);
      expect(await g.recordMeeting(A, m)).toEqual({ created: false });
      expect(await g.meetings(A)).toHaveLength(1);
    });

    it('never exposes one profile’s meetings or meeting-derived paths to another', async () => {
      await g.recordMeeting(A, { meetingId: 'm1', personId: andrea, eventId: buildOnce, at: '2026-10-28T13:10:00-07:00', fictional: true, note: 'private' });
      expect(await g.meetings(B)).toEqual([]);
      expect((await g.candidates(B, 'universe26')).some((x) => x.kind === 'same-company-as-met')).toBe(false);
      await expect(g.removeMeeting(B, 'm1')).resolves.toEqual({ removed: false });
      expect(await g.meetings(A)).toHaveLength(1);
    });

    it('undo removes the meeting and its derived recommendation', async () => {
      await g.recordMeeting(A, { meetingId: 'm1', personId: andrea, eventId: buildOnce, at: '2026-10-28T13:10:00-07:00', fictional: true });
      expect(await g.removeMeeting(A, 'm1')).toEqual({ removed: true });
      expect(await g.meetings(A)).toEqual([]);
      expect((await g.candidates(A, 'universe26')).some((x) => x.kind === 'same-company-as-met')).toBe(false);
    });

    it('returns session → speaker → company → role paths only for open roles', async () => {
      const base = { company: 'Microsoft', location: 'Redmond', listingUrl: 'https://apply.careers.microsoft.com/careers/job/1', applyUrl: 'https://apply.careers.microsoft.com/careers/job/1', minYearsExperience: 0, requirementSummary: '', checkedAt: '2026-10-24T21:40:00Z', source: { url: 'https://apply.careers.microsoft.com/careers/job/1', retrievedAt: '2026-10-24T21:40:00Z', via: 'official-api' as const, status: 'verified' as const } };
      await g.seedRoles([
        { ...base, id: 'role:open', title: 'Open role', status: 'open' },
        { ...base, id: 'role:closed', title: 'Closed role', status: 'closed' },
      ]);
      const paths = await g.hiringPaths('universe26');
      expect(paths.length).toBeGreaterThan(0);
      expect(paths.every((p) => p.nodes[3]!.id === 'role:open')).toBe(true);
      const pamela = paths.find((p) => p.nodes[1]!.name === 'Pamela Fox')!;
      expect(pamela.nodes.map((n) => n.label)).toEqual(['Session', 'Person', 'Company', 'Role']);
      expect(pamela.edges.map((e) => e.type)).toEqual(['SPEAKS_AT', 'WORKS_AT', 'OFFERS_ROLE']);
      expect(pamela.edges[2]!.sourceUrl).toBe('https://apply.careers.microsoft.com/careers/job/1');
    });

    it('refuses meetings with people or events that are not in the graph', async () => {
      await expect(g.recordMeeting(A, { meetingId: 'm2', personId: 'person:nobody', eventId: buildOnce, at: '2026-10-28T13:10:00-07:00', fictional: true })).rejects.toThrow(/unknown person/);
      await expect(g.recordMeeting('profile:missing', { meetingId: 'm3', personId: andrea, eventId: buildOnce, at: '2026-10-28T13:10:00-07:00', fictional: true })).rejects.toThrow(/unknown profile/);
    });
  });
}
