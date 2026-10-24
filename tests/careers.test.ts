import { hiringConnections, verifyRole, type RoleRecord } from '../src/domain/careers';
import { MemoryGraph } from '../src/domain/memory-graph';
import { fixtureRecords } from './graph-contract';

const NOW = '2026-10-24T15:00:00-07:00';
const CHECKED = '2026-10-24T21:40:00Z';

const role = (over: Partial<RoleRecord> = {}): RoleRecord => ({
  id: 'role:microsoft:200057324',
  title: 'Software Engineer - Forward Deployed Engineer',
  company: 'Microsoft',
  location: 'Redmond, WA, US (onsite)',
  listingUrl: 'https://apply.careers.microsoft.com/careers/job/1970393557004814',
  applyUrl: 'https://apply.careers.microsoft.com/careers/job/1970393557004814',
  minYearsExperience: 0,
  requirementSummary: "Bachelor's in CS or related field, or equivalent experience",
  status: 'open',
  checkedAt: CHECKED,
  source: { url: 'https://apply.careers.microsoft.com/careers/job/1970393557004814', retrievedAt: CHECKED, via: 'official-api', status: 'verified' },
  ...over,
});

async function graphWith(roles: RoleRecord[]) {
  const g = new MemoryGraph();
  await g.seedPublic(fixtureRecords);
  await g.seedRoles(roles);
  return g;
}

const profile = { maxYearsExperience: 1 };

describe('verifying a role before calling it open', () => {
  it('accepts a fresh, open listing with an employer HTTPS application link', () => {
    expect(verifyRole(role(), NOW)).toEqual({ ok: true });
  });
  it.each([
    ['closed', { status: 'closed' as const }, /not open/],
    ['unverified', { status: 'unverified' as const }, /not open/],
    ['stale', { checkedAt: '2026-10-20T12:00:00Z' }, /recheck/],
    ['checked in the future', { checkedAt: '2026-10-30T12:00:00Z' }, /recheck/],
    ['aggregator apply link', { applyUrl: 'https://jobs.example-aggregator.com/microsoft/123' }, /employer/],
    ['unsafe apply link', { applyUrl: 'javascript:alert(1)' }, /employer/],
    ['http apply link', { applyUrl: 'http://apply.careers.microsoft.com/careers/job/1' }, /employer/],
    ['no apply link', { applyUrl: '' }, /employer/],
  ])('rejects a %s role', (_name, over, reason) => {
    const r = verifyRole(role(over), NOW);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.reason).toMatch(reason);
  });
});

describe('hiring connections', () => {
  it('pairs an open role with an upcoming talk by a speaker listed with that company', async () => {
    const g = await graphWith([role()]);
    const cards = hiringConnections(await g.hiringPaths('universe26'), [role()], fixtureRecords, { now: NOW, profile });
    expect(cards).toHaveLength(1);
    const c = cards[0]!;
    expect(c.role.title).toBe('Software Engineer - Forward Deployed Engineer');
    expect(c.applyUrl).toBe('https://apply.careers.microsoft.com/careers/job/1970393557004814');
    // Earliest upcoming Microsoft touchpoint in the fixture.
    expect(c.session.title).toBe('Agentic Workflows: Automation at scale');
    expect(c.person.name).toBe('Landon Cox');
    expect(c.path.nodes.map((n) => n.label)).toEqual(['Session', 'Person', 'Company', 'Role']);
    expect(c.path.edges.map((e) => e.type)).toEqual(['SPEAKS_AT', 'WORKS_AT', 'OFFERS_ROLE']);
    expect(c.explanation).toMatch(/Landon Cox.*Microsoft.*Software Engineer - Forward Deployed Engineer/);
    expect(c.otherTouchpoints.map((t) => t.session.title)).toContain('Building a developer knowledge base for GitHub Copilot');
  });

  it('skips touchpoints that already started', async () => {
    const rechecked = role({ checkedAt: '2026-10-28T16:00:00Z' }); // a role checked Oct 24 is stale by Oct 28
    const g = await graphWith([rechecked]);
    const cards = hiringConnections(await g.hiringPaths('universe26'), [rechecked], fixtureRecords, { now: '2026-10-28T11:00:00-07:00', profile });
    expect(cards[0]!.session.title).toBe('Building a developer knowledge base for GitHub Copilot');
    expect(cards[0]!.person.name).toBe('Pamela Fox');
  });

  it('never claims referral, hiring authority or availability', async () => {
    const g = await graphWith([role()]);
    const [c] = hiringConnections(await g.hiringPaths('universe26'), [role()], fixtureRecords, { now: NOW, profile });
    expect(c!.explanation).not.toMatch(/refer|hiring manager|recruit|available|will meet|is hiring/i);
  });

  it('drops roles that are not verified open, stale, or above the profile’s experience', async () => {
    const roles = [
      role({ id: 'role:a', status: 'closed' }),
      role({ id: 'role:b', checkedAt: '2026-10-01T00:00:00Z' }),
      role({ id: 'role:c', minYearsExperience: 2 }),
      role({ id: 'role:d', applyUrl: 'https://www.linkedin.com/jobs/view/1' }),
    ];
    const g = await graphWith(roles);
    expect(hiringConnections(await g.hiringPaths('universe26'), roles, fixtureRecords, { now: NOW, profile })).toEqual([]);
  });

  it('does not create a connection for a company with no listed speaker', async () => {
    const docker = role({ id: 'role:docker:1', company: 'Docker', applyUrl: 'https://www.docker.com/careers/1', listingUrl: 'https://www.docker.com/careers/1' });
    const g = await graphWith([docker]);
    expect(hiringConnections(await g.hiringPaths('universe26'), [docker], fixtureRecords, { now: NOW, profile })).toEqual([]);
  });

  it('shows at most three, one card per role', async () => {
    const roles = [1, 2, 3, 4].map((n) => role({ id: `role:microsoft:${n}`, title: `Role ${n}` }));
    const g = await graphWith(roles);
    const cards = hiringConnections(await g.hiringPaths('universe26'), roles, fixtureRecords, { now: NOW, profile });
    expect(cards).toHaveLength(3);
    expect(new Set(cards.map((c) => c.role.id)).size).toBe(3);
  });
});
