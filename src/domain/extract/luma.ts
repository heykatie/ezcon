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
  const event = nodes.find((x) => clean(x.name) && clean(x.startDate) && clean(x.endDate));
  if (!event) return { records: [], rejected: [] };
  const start = clean(event.startDate);
  const end = clean(event.endDate);
  if (!Number.isFinite(Date.parse(start)) || !Number.isFinite(Date.parse(end)) || Date.parse(end) <= Date.parse(start)) return { records: [], rejected: [{ sourceRecordId: source.pathname, reason: 'invalid event dates' }] };
  const idSlug = source.pathname.split('/').filter(Boolean).at(-1) ?? 'event';
  const title = clean(event.name);
  const location = locationText(event.location);
  const record: ExternalEventRecord = {
    id: `luma:${idSlug}`,
    conference: 'external',
    sourceRecordId: idSlug,
    title,
    summary: clean(event.description) || undefined,
    start,
    end,
    timezone: 'UTC',
    location,
    speakers: [],
    topics: [],
    url: source.toString(),
    catalogs: ['quest'],
    source: { url: source.toString(), retrievedAt: meta.retrievedAt, via: meta.via, status: 'verified', note: 'Parsed from public Luma Event structured data.' },
  };
  return { records: [record], rejected: [] };
}
