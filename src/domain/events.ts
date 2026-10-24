// Lightweight conference search over a short list of verified upcoming listings.
import type { SourceRef } from './types';

export interface EventListing {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD, local to the event
  endDate: string;
  location: string;
  /** True when ezcon has sessions, travel and planning for this event. */
  supported?: boolean;
  source: SourceRef;
}

const TZ = 'America/Los_Angeles';
const today = (now: string) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(now));

/** Upcoming (or in-progress) events whose name or location contains every query word. */
export function searchEvents(events: EventListing[], query: string, now: string): EventListing[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const day = today(now);
  return events
    .filter((e) => e.endDate >= day)
    .filter((e) => words.every((w) => `${e.name} ${e.location}`.toLowerCase().includes(w)))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}
