import type { CheckIn } from './screens';

/** Check-in state for an event after one meeting there is undone. */
export function checkinAfterUndo(meetings: Array<{ meetingId: string; eventId: string }>, removedId: string, eventId: string): CheckIn {
  return meetings.some((m) => m.eventId === eventId && m.meetingId !== removedId) ? 'met' : 'went';
}
