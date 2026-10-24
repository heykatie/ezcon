// Schedule changes are explicit: conflict-free adds apply immediately (with Undo);
// conflicts are reported and only the user's choice changes the schedule.

export interface ScheduleItem {
  eventId: string;
  title: string;
  start: string; // ISO with offset
  end: string;
  location?: string;
  kind: 'fixed' | 'flexible';
}

/** Minutes needed to get from one location to another. */
export type BufferFn = (from?: string, to?: string) => number;

/** Estimated walk between different rooms on one campus; same room needs none. */
export const defaultBuffer: BufferFn = (from, to) => (from && to && from === to ? 0 : 10);

export interface Conflict {
  item: ScheduleItem;
  reason: 'overlap' | 'travel-buffer';
}

export type AddResult =
  | { status: 'added'; schedule: ScheduleItem[]; previous: ScheduleItem[] }
  | { status: 'duplicate' }
  | { status: 'conflict'; conflicts: Conflict[] };

const t = (s: string) => Date.parse(s);
const byStart = (a: ScheduleItem, b: ScheduleItem) => t(a.start) - t(b.start);

export function findConflicts(schedule: ScheduleItem[], item: ScheduleItem, buffer: BufferFn): Conflict[] {
  const out: Conflict[] = [];
  for (const s of schedule) {
    if (t(item.start) < t(s.end) && t(s.start) < t(item.end)) {
      out.push({ item: s, reason: 'overlap' });
      continue;
    }
    const gap = t(item.start) >= t(s.end) ? (t(item.start) - t(s.end)) / 60_000 : (t(s.start) - t(item.end)) / 60_000;
    const needed = t(item.start) >= t(s.end) ? buffer(s.location, item.location) : buffer(item.location, s.location);
    if (gap < needed) out.push({ item: s, reason: 'travel-buffer' });
  }
  return out;
}

export function addItem(schedule: ScheduleItem[], item: ScheduleItem, buffer: BufferFn): AddResult {
  if (schedule.some((s) => s.eventId === item.eventId)) return { status: 'duplicate' };
  const conflicts = findConflicts(schedule, item, buffer);
  if (conflicts.length) return { status: 'conflict', conflicts };
  return { status: 'added', schedule: [...schedule, item].sort(byStart), previous: schedule };
}

export function resolveConflict(
  schedule: ScheduleItem[],
  item: ScheduleItem,
  choice: 'keep' | 'replace' | 'cancel',
  buffer: BufferFn,
): { schedule: ScheduleItem[]; previous: ScheduleItem[] } {
  if (choice !== 'replace') return { schedule, previous: schedule };
  const clashing = new Set(findConflicts(schedule, item, buffer).map((c) => c.item.eventId));
  const kept = schedule.filter((s) => !clashing.has(s.eventId) && s.eventId !== item.eventId);
  return { schedule: [...kept, item].sort(byStart), previous: schedule };
}

export const removeItem = (schedule: ScheduleItem[], eventId: string) => ({
  schedule: schedule.filter((s) => s.eventId !== eventId),
  previous: schedule,
});
