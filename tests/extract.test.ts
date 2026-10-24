import { readFileSync } from 'node:fs';
import { parseUniverseCatalog } from '../src/domain/extract/universe';
import { parseWadSession } from '../src/domain/extract/wad';
import { parseCatalogTimes } from '../src/domain/time';

const CATALOG_URL = 'https://reg.githubuniverse.com/flow/github/universe26/attendee-portal/page/sessioncatalog';
const html = readFileSync(new URL('./fixtures/universe-catalog.html', import.meta.url), 'utf8');
const meta = { sourceUrl: CATALOG_URL, retrievedAt: '2026-10-24T20:00:00Z', via: 'fixture' as const, year: 2026 };

describe('Universe catalog extraction (container-scoped)', () => {
  const { records, rejected } = parseUniverseCatalog(html, meta);
  const byTitle = (t: string) => records.find((r) => r.title.startsWith(t));

  it('extracts the browser-verified golden record exactly', () => {
    const r = byTitle('Beyond correct')!;
    expect(r).toBeDefined();
    expect(r.title).toBe('Beyond correct: Making code quality worth acting on');
    expect(r.speakers).toEqual([{ name: 'Caro Galvin', title: 'Senior Product Manager', company: 'GitHub' }]);
    expect(r.start).toBe('2026-10-28T12:10:00-07:00');
    expect(r.end).toBe('2026-10-28T12:25:00-07:00');
    expect(r.location).toBe('Demos & Donuts @ Gateway Pavilion, Level 2');
    expect(r.sourceRecordId).toBe('session-1777658642130001QLdM-1785203706362001xLy6');
  });

  it('keeps neighboring sessions on their own times (no shifted fields)', () => {
    expect(byTitle('Session After Party: Humans')!.start).toBe('2026-10-28T12:00:00-07:00');
    expect(byTitle('Session After Party: Humans')!.end).toBe('2026-10-28T12:30:00-07:00');
    expect(byTitle('The Low Orbit')!.start).toBe('2026-10-28T12:20:00-07:00');
    expect(byTitle('The Low Orbit')!.location).toBe('Ship & Tell @ Firehouse');
    expect(byTitle('Session After Party: Humans')!.speakers.map((s) => s.name)).toEqual(['Mario Rodriguez', 'Evan Boyle']);
  });

  it('uses the time block, never the hour-slot badges', () => {
    // Badge says "12:00 p.m."; actual time block says 12:10.
    expect(byTitle('Beyond correct')!.start).not.toContain('T12:00');
    // Multi-badge record: badges list three slots, the container lists one.
    const aw = records.filter((r) => r.title.startsWith('Agentic Workflows'));
    expect(aw).toHaveLength(1);
    expect(aw[0]!.start).toBe('2026-10-28T10:15:00-07:00');
  });

  it('splits multi-part speaker pills into title and company', () => {
    const peli = byTitle('Agentic Workflows')!.speakers[1]!;
    expect(peli).toEqual({ name: 'Peli de Halleux', title: 'Agentic Engineer, GitHub Next', company: 'Microsoft' });
    const callum = byTitle('The Low Orbit')!.speakers[0]!;
    expect(callum).toEqual({ name: 'Callum Cieciala', title: 'VP, Developer Experience', company: 'Galaxy' });
  });

  it('does not treat "Independent" as a company', () => {
    const eric = byTitle('Accelerate accessibility')!.speakers[0]!;
    expect(eric.name).toBe('Eric Bailey');
    expect(eric.company).toBeUndefined();
  });

  it('normalizes relative links against the fetched URL, not localhost', () => {
    expect(byTitle('Beyond correct')!.url).toBe(
      'https://reg.githubuniverse.com/flow/github/universe26/attendee-portal/page/sessioncatalog/session/1777658642130001QLdM',
    );
  });

  it('keeps topics from the topic badges only', () => {
    expect(byTitle('Accelerate accessibility')!.topics).toEqual(['Accessibility']);
    expect(byTitle('San Francisco Syntax')!.topics).toEqual([]);
  });

  it('assigns socials to Side Quests and talks to Quests', () => {
    expect(byTitle('San Francisco Syntax')!.catalogs).toEqual(['side-quest']);
    expect(byTitle('Universe Badge Pickup')!.catalogs).toEqual(['side-quest']);
    expect(byTitle('Building a developer knowledge base')!.catalogs).toEqual(['quest']);
  });

  it('records provenance on every record', () => {
    for (const r of records) {
      expect(r.source).toMatchObject({ url: CATALOG_URL, retrievedAt: meta.retrievedAt, via: 'fixture' });
      expect(r.conference).toBe('universe26');
      expect(r.timezone).toBe('America/Los_Angeles');
    }
  });

  it('rejects incomplete containers instead of guessing', () => {
    expect(records.find((r) => r.title.startsWith('Synthetic'))).toBeUndefined();
    expect(rejected).toEqual([{ sourceRecordId: 'session-SYNTHETIC0000000000-SYNTHETIC00000000000', reason: 'missing time block' }]);
    expect(records).toHaveLength(11);
  });

  it('returns no records for a shell page', () => {
    expect(parseUniverseCatalog('<html><body><div id="app"></div></body></html>', meta)).toEqual({ records: [], rejected: [] });
  });
});

describe('catalog time parsing', () => {
  it('rejects a weekday that does not match the edition year', () => {
    expect(() => parseCatalogTimes('Thursday, Oct 28', '12:10 PM - 12:25 PM PDT', 2026)).toThrow(/weekday/);
  });
  it('rejects an abbreviation that contradicts daylight time on that date', () => {
    expect(() => parseCatalogTimes('Wednesday, Oct 28', '12:10 PM - 12:25 PM PST', 2026)).toThrow(/PST/);
  });
  it('rolls an end time past midnight into the next day', () => {
    expect(parseCatalogTimes('Wednesday, Oct 28', '10:00 PM - 1:00 AM PDT', 2026)).toEqual({
      start: '2026-10-28T22:00:00-07:00',
      end: '2026-10-29T01:00:00-07:00',
    });
  });
  it('handles 12 AM and 12 PM correctly', () => {
    expect(parseCatalogTimes('Wednesday, Oct 28', '12:00 AM - 12:30 PM PDT', 2026).start).toBe('2026-10-28T00:00:00-07:00');
  });
});

describe('WAD session page extraction', () => {
  const wad = readFileSync(new URL('./fixtures/wad-1917-session.html', import.meta.url), 'utf8');
  const url = 'https://www.wearedevelopers.com/events/world-congress-2026-north-america/sessions/1917-making-works-on-all';

  it('extracts the sampled session with its edition and local timezone', () => {
    const r = parseWadSession(wad, { sourceUrl: url, retrievedAt: '2026-10-24T20:00:00Z', via: 'fixture' });
    expect(r.title).toBe('Making “Works on All Machines” Work for Agent Environments');
    expect(r.speakers).toEqual([{ name: 'Michael Irwin', title: 'Principal Engineer, Developer Success', company: 'Docker' }]);
    expect(r.start).toBe('2026-09-23T10:00:00-07:00');
    expect(r.end).toBe('2026-09-23T10:30:00-07:00');
    expect(r.location).toBe('Stage 1');
    expect(r.conference).toBe('wad26na');
  });

  it('refuses a page from a different edition', () => {
    const drifted = wad.replace('World Congress 2026 North America', 'World Congress 2027 North America');
    expect(() => parseWadSession(drifted, { sourceUrl: url, retrievedAt: '2026-10-24T20:00:00Z', via: 'fixture' })).toThrow(/edition/);
  });
});
