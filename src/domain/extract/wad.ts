// Extraction for a WeAreDevelopers World Congress 2026 North America session page.
// Scoped to the page's session hero; refuses pages from other editions.
import { parse } from 'node-html-parser';
import type { RetrievalChannel, SessionRecord, Speaker } from '../types';
import { parseLocalDateTime } from '../time';

const EDITION = 'World Congress 2026 North America';
const TIMEZONE = 'America/Los_Angeles'; // San José venue

export function parseWadSession(html: string, meta: { sourceUrl: string; retrievedAt: string; via: RetrievalChannel }): SessionRecord {
  const hero = parse(html).querySelector('section.event-session-hero');
  if (!hero) throw new Error('session hero not found');
  const t = (s: string | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();

  const edition = t(hero.querySelector('a.event-region-text')?.text);
  if (edition !== EDITION) throw new Error(`edition mismatch: "${edition}"`);
  const title = t(hero.querySelector('h1')?.text);
  if (!title) throw new Error('missing title');

  const speakers: Speaker[] = hero.querySelectorAll('a[href^="/@"]').map((a) => {
    const [name, role] = a.querySelectorAll('p').map((p) => t(p.text));
    const [titlePart, company] = (role ?? '').split(' · ');
    const s: Speaker = { name: name ?? '' };
    if (titlePart) s.title = titlePart;
    if (company) s.company = company;
    return s;
  });

  const facts = hero.querySelectorAll('span.inline-flex').map((s) => t(s.text));
  const date = facts.find((f) => /^[A-Za-z]+ \d{1,2}, \d{4}$/.test(f));
  const time = facts.map((f) => /^(\d{1,2}:\d{2}) – (\d{1,2}:\d{2})/.exec(f)).find(Boolean);
  if (!date || !time) throw new Error('missing date or time');
  const location = facts.find((f) => f !== date && !/^\d{1,2}:\d{2}/.test(f));
  const pageId = /\/sessions\/(\d+)/.exec(meta.sourceUrl)?.[1] ?? meta.sourceUrl;
  const start = parseLocalDateTime(date, time[1]!, TIMEZONE);
  let end = parseLocalDateTime(date, time[2]!, TIMEZONE);
  if (Date.parse(end) <= Date.parse(start)) {
    // Ends after midnight: same clock time on the next calendar day.
    const next = new Date(Date.parse(`${start.slice(0, 10)}T12:00:00Z`) + 86_400_000);
    end = parseLocalDateTime(next.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long', day: 'numeric', year: 'numeric' }), time[2]!, TIMEZONE);
  }

  return {
    id: `wad26na:${pageId}`,
    conference: 'wad26na',
    sourceRecordId: `wad-session-${pageId}`,
    title,
    start,
    end,
    timezone: TIMEZONE,
    location,
    speakers,
    topics: [],
    url: meta.sourceUrl,
    catalogs: ['quest'],
    source: { url: meta.sourceUrl, retrievedAt: meta.retrievedAt, via: meta.via, status: 'verified' },
  };
}
