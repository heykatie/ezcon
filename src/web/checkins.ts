import type { CheckIn } from './screens';

const hash = (s: string) => {
  let h = 5381;
  for (const c of s) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0;
  return h.toString(36);
};

/** Deterministic meeting id, so confirming the same person at the same event twice is one meeting. */
export const meetingIdFor = (eventId: string, personId: string) => `m-${hash(`${eventId}|${personId}`)}`;

/** Check-in state for an event after one meeting there is undone. */
export function checkinAfterUndo(meetings: Array<{ meetingId: string; eventId: string }>, removedId: string, eventId: string): CheckIn {
  return meetings.some((m) => m.eventId === eventId && m.meetingId !== removedId) ? 'met' : 'went';
}
