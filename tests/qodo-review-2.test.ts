// Regression tests for Qodo review findings on PR #1
// (https://github.com/heykatie/ezcon/pull/1#pullrequestreview-5640206642).
import { readFileSync } from 'node:fs';
import { parseCatalogTimes, parseLocalDateTime } from '../src/domain/time';
import { parseWadSession } from '../src/domain/extract/wad';
import { evaluateOption, type TravelOption } from '../src/domain/travel';
import { describeError } from '../scripts/check-falkordb-lib.mjs';
import { offTargetCalls, withDeadline } from '../server/research-guard';
import { checkinAfterUndo } from '../src/web/checkins';

describe('finding 5: impossible calendar dates are rejected, not normalized', () => {
  it('rejects Feb 31 even when the weekday matches the normalized date', () => {
    // 2026-02-31 would normalize to Tue Mar 3, 2026.
    expect(() => parseCatalogTimes('Tuesday, Feb 31', '10:00 AM - 11:00 AM PST', 2026)).toThrow(/invalid date/);
  });
  it('rejects an impossible WAD-style date', () => {
    expect(() => parseLocalDateTime('February 30, 2026', '10:00', 'America/Los_Angeles')).toThrow(/invalid date/);
  });
});

describe('finding 13: WAD sessions that cross midnight end the next day', () => {
  it('rolls the end forward', () => {
    const html = readFileSync(new URL('./fixtures/wad-1917-session.html', import.meta.url), 'utf8').replace('10:00', '23:30').replace('10:30', '00:30');
    const r = parseWadSession(html, { sourceUrl: 'https://www.wearedevelopers.com/events/world-congress-2026-north-america/sessions/1917-x', retrievedAt: '2026-10-24T00:00:00Z', via: 'fixture' });
    expect(r.start).toBe('2026-09-23T23:30:00-07:00');
    expect(r.end).toBe('2026-09-24T00:30:00-07:00');
  });
});

describe('finding 7: door-to-door time includes walking both ways', () => {
  it('adds the walk to each direction', () => {
    const o: TravelOption = { id: 't', name: 't', mode: 'transit', outboundMinutes: [60, 75], returnMinutes: [60, 80], walkMinutes: 12, fares: [] };
    const e = evaluateOption(o, [{ id: 'a', start: '2026-10-28T10:00', end: '2026-10-28T11:00' }], { budgetCents: 2000, arrivalBufferMinutes: 15 });
    expect(e.travelMinutes).toEqual([60 + 60 + 24, 75 + 80 + 24]);
  });
});

describe('finding 14: credentials are redacted regardless of length', () => {
  it('redacts one- and two-character and URL-encoded credentials', () => {
    const url = 'falkors://ab:p%40@db.example.cloud:6380';
    const err = new Error('auth failed for user ab with password p@ (raw p%40)');
    const out = describeError(err, url);
    expect(out).not.toMatch(/\bab\b/);
    expect(out).not.toContain('p@');
    expect(out).not.toContain('p%40');
    expect(out).toContain('auth failed for user');
  });
});

describe('finding 1: research tool calls must stay on the approved URL', () => {
  const approved = 'https://www.wearedevelopers.com/events/world-congress-2026-north-america/sessions/1917-making-works-on-all';
  it('accepts calls on the approved URL and argument-free browser calls', () => {
    expect(offTargetCalls([{ tool: 'bright-data.scrape_as_html', args: { url: approved } }, { tool: 'bright-data.scraping_browser_get_html', args: { full_page: true } }], approved)).toEqual([]);
  });
  it('flags any call that targets a different URL', () => {
    const bad = [{ tool: 'bright-data.scraping_browser_navigate', args: { url: 'http://169.254.169.254/latest' } }];
    expect(offTargetCalls(bad, approved)).toEqual(bad);
    expect(offTargetCalls([{ tool: 'bright-data.scrape_as_html', args: { url: `${approved}?x=1` } }], approved)).toHaveLength(1);
  });
});

describe('finding 8: one deadline covers the whole research run', () => {
  it('rejects when the work outlives the deadline', async () => {
    await expect(withDeadline(new Promise(() => {}), 20, 'research')).rejects.toThrow(/research timed out/);
  });
  it('passes results through when in time', async () => {
    await expect(withDeadline(Promise.resolve(7), 50, 'research')).resolves.toBe(7);
  });
});

describe('finding 4: undoing one meeting keeps other meetings at the event', () => {
  const m = (id: string, eventId: string) => ({ meetingId: id, eventId });
  it('stays "met" when another meeting at the event remains', () => {
    expect(checkinAfterUndo([m('a', 'e1'), m('b', 'e1')], 'a', 'e1')).toBe('met');
  });
  it('falls back to "went" when it was the only meeting there', () => {
    expect(checkinAfterUndo([m('a', 'e1'), m('c', 'e2')], 'a', 'e1')).toBe('went');
  });
});
