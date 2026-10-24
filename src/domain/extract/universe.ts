// Container-scoped extraction for the GitHub Universe 2026 catalog.
// Every field is read from inside one `li.catalog-result.session-result`; flattened page
// text is never used, because neighbouring sessions' times bleed into each other there.
import { parse, type HTMLElement } from 'node-html-parser';
import type { ExtractionResult, RetrievalChannel, SessionRecord, Speaker, Catalog } from '../types';
import { parseCatalogTimes } from '../time';

export interface CatalogMeta {
  sourceUrl: string;
  retrievedAt: string;
  via: RetrievalChannel;
  year: number;
}

const SIDE_QUEST_TYPES = new Set(['social', 'special event', 'party', 'happy hour']);
const NOT_A_COMPANY = new Set(['independent', 'self-employed', 'freelance']);

const text = (el: HTMLElement | null | undefined) => (el ? el.text.replace(/\s+/g, ' ').trim() : '');

function speakersOf(container: HTMLElement): Speaker[] {
  return container.querySelectorAll('.speakers-component .speaker-trigger').map((btn) => {
    const name = text(btn.querySelector('.mdBtnR-text'));
    const values = btn.querySelectorAll('.speaker-pill-value').map((v) => text(v)).filter(Boolean);
    const last = values.length > 1 ? values[values.length - 1] : undefined;
    const company = last && !NOT_A_COMPANY.has(last.toLowerCase()) ? last : undefined;
    const titleParts = values.length > 1 ? values.slice(0, -1) : values;
    const speaker: Speaker = { name };
    if (titleParts.length) speaker.title = titleParts.join(', ');
    if (company) speaker.company = company;
    return speaker;
  });
}

export function parseUniverseCatalog(html: string, meta: CatalogMeta): ExtractionResult {
  const root = parse(html);
  const records: SessionRecord[] = [];
  const rejected: ExtractionResult['rejected'] = [];

  for (const li of root.querySelectorAll('li.catalog-result.session-result')) {
    const sourceRecordId = li.getAttribute('id') ?? '';
    const title = text(li.querySelector('.catalog-result-title .title-text'));
    const timeBlocks = li.querySelectorAll('.times-component .session-time-and-location');
    if (!sourceRecordId || !title) {
      rejected.push({ sourceRecordId, reason: 'missing id or title' });
      continue;
    }
    if (timeBlocks.length === 0) {
      rejected.push({ sourceRecordId, reason: 'missing time block' });
      continue;
    }
    const href = li.querySelector('.catalog-result-title a')?.getAttribute('href');
    const url = href ? new URL(href, meta.sourceUrl).toString() : meta.sourceUrl;
    const sessionType = text(li.querySelector('.badges .rf-session-type')) || undefined;
    const topics = [...new Set(li.querySelectorAll('.badges .rf-topic').map((b) => text(b)).filter(Boolean))];
    const catalogs: Catalog[] = sessionType && SIDE_QUEST_TYPES.has(sessionType.toLowerCase()) ? ['side-quest'] : ['quest'];
    const summary = text(li.querySelector('.abstract-component .description')) || undefined;
    const speakers = speakersOf(li);

    timeBlocks.forEach((block, i) => {
      const dateText = text(block.querySelector('.session-date'));
      const timeText = text(block.querySelector('.session-time'));
      try {
        const { start, end } = parseCatalogTimes(dateText, timeText, meta.year);
        const slot = timeBlocks.length > 1 ? `#${i + 1}` : '';
        records.push({
          id: `universe26:${sourceRecordId.replace(/^session-/, '')}${slot}`,
          conference: 'universe26',
          sourceRecordId,
          title,
          summary,
          start,
          end,
          timezone: 'America/Los_Angeles',
          location: text(block.querySelector('.session-location')) || undefined,
          speakers,
          topics,
          sessionType,
          url,
          catalogs,
          source: { url: meta.sourceUrl, retrievedAt: meta.retrievedAt, via: meta.via, status: 'verified' },
        });
      } catch (err) {
        rejected.push({ sourceRecordId, reason: (err as Error).message });
      }
    });
  }
  return { records, rejected };
}
