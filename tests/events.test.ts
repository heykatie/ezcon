import { searchEvents, type EventListing } from '../src/domain/events';
import { UPCOMING_EVENTS } from '../src/data/events';

const NOW = '2026-10-24T15:00:00-07:00';

describe('conference search', () => {
  it('lists verified upcoming events by start date when the query is empty', () => {
    expect(searchEvents(UPCOMING_EVENTS, '', NOW).map((e) => e.name)).toEqual([
      'GitHub Universe 2026',
      'KubeCon + CloudNativeCon North America 2026',
      'Microsoft Ignite 2026',
      'AWS re:Invent 2026',
    ]);
  });

  it('matches name and location words, case-insensitively, in any order', () => {
    expect(searchEvents(UPCOMING_EVENTS, 'san francisco', NOW).map((e) => e.name)).toEqual(['GitHub Universe 2026', 'Microsoft Ignite 2026']);
    expect(searchEvents(UPCOMING_EVENTS, 'KUBE', NOW).map((e) => e.name)).toEqual(['KubeCon + CloudNativeCon North America 2026']);
    expect(searchEvents(UPCOMING_EVENTS, 'vegas aws', NOW).map((e) => e.name)).toEqual(['AWS re:Invent 2026']);
    expect(searchEvents(UPCOMING_EVENTS, 'nonexistent conference', NOW)).toEqual([]);
  });

  it('never returns past events such as WeAreDevelopers as upcoming', () => {
    const wad: EventListing = {
      id: 'wad26na',
      name: 'WeAreDevelopers World Congress North America 2026',
      startDate: '2026-09-23',
      endDate: '2026-09-25',
      location: 'San José, CA',
      timezone: 'America/Los_Angeles',
      source: { url: 'https://www.wearedevelopers.com/events/world-congress-2026-north-america/sessions', retrievedAt: '2026-10-24T21:30:41Z', via: 'bright-data', status: 'verified' },
    };
    expect(searchEvents([...UPCOMING_EVENTS, wad], 'wearedevelopers', NOW)).toEqual([]);
    expect(searchEvents([...UPCOMING_EVENTS, wad], '', NOW).some((e) => e.id === 'wad26na')).toBe(false);
    expect(UPCOMING_EVENTS.some((e) => /wearedevelopers/i.test(e.name))).toBe(false);
  });

  it('keeps an event listed through its last day, then drops it', () => {
    const lastDay = searchEvents(UPCOMING_EVENTS, 'universe', '2026-10-29T18:00:00-07:00');
    expect(lastDay).toHaveLength(1);
    expect(searchEvents(UPCOMING_EVENTS, 'universe', '2026-10-30T09:00:00-07:00')).toEqual([]);
  });

  it('gives every listing an official HTTPS source with a retrieval time', () => {
    for (const e of UPCOMING_EVENTS) {
      expect(e.source.url).toMatch(/^https:\/\//);
      expect(e.source.status).toBe('verified');
      expect(Number.isNaN(Date.parse(e.source.retrievedAt))).toBe(false);
    }
  });
});

describe('re-review finding 5: "ended" is judged in the event’s own timezone', () => {
  it('drops a Salt Lake City event once it is the next day there, even if still the last day in Los Angeles', () => {
    // 23:30 PST on Nov 12 is 00:30 MST on Nov 13 in Salt Lake City.
    expect(searchEvents(UPCOMING_EVENTS, 'kubecon', '2026-11-12T23:30:00-08:00')).toEqual([]);
    expect(searchEvents(UPCOMING_EVENTS, 'kubecon', '2026-11-12T21:00:00-08:00')).toHaveLength(1);
  });
});
