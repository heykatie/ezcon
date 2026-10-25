// Deterministic extraction for public Luma event pages. Only structured Event metadata is
// accepted; missing dates or venue stay unknown instead of being inferred from page text.
import { parse } from 'node-html-parser';
import type { ExternalEventRecord, ExternalExtractionResult, RetrievalChannel } from '../types';

const ALLOWED_HOSTS = new Set(['luma.com', 'www.luma.com']);
const clean = (value: unknown) => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';

function eventNodes(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.flatMap(eventNodes);
  if (!value || typeof value !== 'object') return [];
  const o = value as Record<string, unknown>;
  return [o, ...eventNodes(o['@graph'])].filter((x) => x['@type'] === 'Event' || (Array.isArray(x['@type']) && x['@type'].includes('Event')));
}

function eventUrls(event: Record<string, unknown>): string[] {
  const values = [event.url, event['@id'], event.mainEntityOfPage, event.sameAs];
  return values.flatMap((value) => {
    if (typeof value === 'string') return [value];
    if (Array.isArray(value)) return value.flatMap((v) => typeof v === 'string' ? [v] : v && typeof v === 'object' ? [clean((v as Record<string, unknown>).url || (v as Record<string, unknown>)['@id'])] : []).filter(Boolean);
    if (value && typeof value === 'object') {
      const item = value as Record<string, unknown>;
      return [clean(item.url || item['@id'])].filter(Boolean);
    }
    return [];
  });
}

function canonicalLumaPage(value: string): string | undefined {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !ALLOWED_HOSTS.has(url.hostname.toLowerCase()) || url.pathname === '/sf') return undefined;
    return `${url.hostname.toLowerCase().replace(/^www\./, '')}${url.pathname.replace(/\/$/, '')}`;
  } catch { return undefined; }
}

function validIanaTimezone(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) return false;
  try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; } catch { return false; }
}

function eventTimezone(event: Record<string, unknown>, location?: string): { timezone?: string; status: 'verified' | 'derived'; note: string } {
  const schedule = event.eventSchedule && typeof event.eventSchedule === 'object' ? event.eventSchedule as Record<string, unknown> : {};
  const direct = [event.timeZone, event.timezone, event.scheduleTimezone, schedule.scheduleTimezone].find(validIanaTimezone);
  if (direct) return { timezone: direct, status: 'verified', note: 'Timezone parsed from public Luma Event structured data.' };
  const place = location ?? '';
  if (/\b(California|CA|San Francisco|Oakland|Berkeley|San Jose|San Leandro|Alameda|Palo Alto|Mountain View|Sunnyvale|Santa Clara|Fremont|San Mateo|Daly City)\b/i.test(place)) {
    return { timezone: 'America/Los_Angeles', status: 'derived', note: 'Timezone derived from the California venue location; confirm on the event page.' };
  }
  return { status: 'derived', note: 'Timezone was not established by the event page.' };
}

function explicitDateTime(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value);
}

function locationText(value: unknown): string | undefined {
  if (typeof value === 'string') return clean(value) || undefined;
  if (!value || typeof value !== 'object') return undefined;
  const place = value as Record<string, unknown>;
  const address = place.address && typeof place.address === 'object' ? place.address as Record<string, unknown> : {};
  const parts = [place.name, address.streetAddress, address.addressLocality, address.addressRegion, address.postalCode]
    .map(clean).filter((x, i, a) => x && a.indexOf(x) === i);
  return parts.join(', ') || undefined;
}

export function parseLumaEvent(html: string, meta: { sourceUrl: string; retrievedAt: string; via: RetrievalChannel }): ExternalExtractionResult {
  const source = new URL(meta.sourceUrl);
  if (source.protocol !== 'https:' || !ALLOWED_HOSTS.has(source.hostname.toLowerCase())) throw new Error('event URL is not an allowlisted Luma page');
  const root = parse(html);
  const ld = root.querySelectorAll('script[type="application/ld+json"]');
  const nodes = ld.flatMap((node) => {
    try { return eventNodes(JSON.parse(node.text)); } catch { return []; }
  });
  const candidates = nodes.filter((x) => clean(x.name) && clean(x.startDate) && clean(x.endDate));
  const requestedPage = canonicalLumaPage(source.toString());
  const matching = candidates.filter((x) => eventUrls(x).some((u) => canonicalLumaPage(u) === requestedPage));
  const event = matching.length === 1 ? matching[0] : matching.length > 1 ? undefined : candidates.length === 1 && eventUrls(candidates[0]!).length === 0 ? candidates[0] : undefined;
  if (!event) return { records: [], rejected: candidates.length ? [{ sourceRecordId: source.pathname, reason: 'event identity is missing or ambiguous for the requested Luma page' }] : [] };
  const start = clean(event.startDate);
  const end = clean(event.endDate);
  if (!explicitDateTime(start) || !explicitDateTime(end) || !Number.isFinite(Date.parse(start)) || !Number.isFinite(Date.parse(end)) || Date.parse(end) <= Date.parse(start)) return { records: [], rejected: [{ sourceRecordId: source.pathname, reason: 'event dates must include an explicit timezone offset' }] };
  const idSlug = source.pathname.split('/').filter(Boolean).at(-1) ?? 'event';
  const title = clean(event.name);
  const location = locationText(event.location);
  const timezone = eventTimezone(event, location);
  if (!timezone.timezone) return { records: [], rejected: [{ sourceRecordId: source.pathname, reason: timezone.note }] };
  const record: ExternalEventRecord = {
    id: `luma:${idSlug}`,
    conference: 'external',
    sourceRecordId: idSlug,
    title,
    summary: clean(event.description) || undefined,
    start,
    end,
    timezone: timezone.timezone,
    location,
    speakers: [],
    topics: [],
    url: source.toString(),
    catalogs: ['quest'],
    source: { url: source.toString(), retrievedAt: meta.retrievedAt, via: meta.via, status: timezone.status, note: timezone.note },
  };
  return { records: [record], rejected: [] };
}
