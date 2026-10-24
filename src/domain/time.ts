// Timezone-aware parsing for conference listings. Never guesses a year or an offset.

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const ABBREVIATIONS: Record<string, { zone: string; offsetMinutes: number }> = {
  PDT: { zone: 'America/Los_Angeles', offsetMinutes: -420 },
  PST: { zone: 'America/Los_Angeles', offsetMinutes: -480 },
};

const pad = (n: number) => String(n).padStart(2, '0');

/** Offset (minutes east of UTC) that `timeZone` uses at the given local wall time. */
export function zoneOffsetMinutes(timeZone: string, y: number, mo: number, d: number, h: number, mi: number): number {
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset', year: 'numeric' });
  const offsetAt = (utcMs: number) => {
    const name = fmt.formatToParts(new Date(utcMs)).find((p) => p.type === 'timeZoneName')?.value ?? 'GMT';
    const m = /GMT([+-])(\d{2}):(\d{2})/.exec(name);
    return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
  };
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const first = offsetAt(guess);
  return offsetAt(guess - first * 60_000);
}

export function formatOffset(minutes: number): string {
  const sign = minutes < 0 ? '-' : '+';
  const abs = Math.abs(minutes);
  return `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

function iso(y: number, mo: number, d: number, h: number, mi: number, offsetMinutes: number): string {
  // Normalize day overflow (e.g. an end time past midnight).
  const t = new Date(Date.UTC(y, mo - 1, d, h, mi));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}T${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())}:00${formatOffset(offsetMinutes)}`;
}

function parseClock(text: string): { h: number; m: number } {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec(text.trim());
  if (!m) throw new Error(`unrecognized time "${text}"`);
  let h = Number(m[1]);
  const mer = m[3]?.toUpperCase();
  if (mer) {
    if (h < 1 || h > 12) throw new Error(`unrecognized time "${text}"`);
    if (mer === 'AM' && h === 12) h = 0;
    if (mer === 'PM' && h !== 12) h += 12;
  }
  if (h > 23 || Number(m[2]) > 59) throw new Error(`unrecognized time "${text}"`);
  return { h, m: Number(m[2]) };
}

/**
 * Parse a Universe-style listing: "Wednesday, Oct 28" + "12:10 PM - 12:25 PM PDT".
 * The catalog omits the year, so the caller supplies the edition year; the weekday must agree.
 */
export function parseCatalogTimes(dateText: string, timeText: string, year: number): { start: string; end: string } {
  const dm = /^\s*([A-Za-z]+),\s*([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2})\s*$/.exec(dateText);
  if (!dm) throw new Error(`unrecognized date "${dateText}"`);
  const month = MONTHS.indexOf(dm[2]!.toLowerCase()) + 1;
  const day = Number(dm[3]);
  if (month < 1) throw new Error(`unrecognized month "${dm[2]}"`);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  if (WEEKDAYS[weekday] !== dm[1]!.toLowerCase()) {
    throw new Error(`weekday "${dm[1]}" does not match ${year}-${pad(month)}-${pad(day)}`);
  }

  const tm = /^\s*(\d{1,2}:\d{2}\s*[AP]M)\s*[-–]\s*(\d{1,2}:\d{2}\s*[AP]M)\s+([A-Z]{3,4})\s*$/i.exec(timeText);
  if (!tm) throw new Error(`unrecognized time range "${timeText}"`);
  const abbr = tm[3]!.toUpperCase();
  const zone = ABBREVIATIONS[abbr];
  if (!zone) throw new Error(`unsupported timezone "${abbr}"`);
  const s = parseClock(tm[1]!);
  const e = parseClock(tm[2]!);
  const actual = zoneOffsetMinutes(zone.zone, year, month, day, s.h, s.m);
  if (actual !== zone.offsetMinutes) throw new Error(`${abbr} contradicts ${zone.zone} on ${year}-${pad(month)}-${pad(day)}`);

  const endDay = e.h * 60 + e.m <= s.h * 60 + s.m ? day + 1 : day;
  return { start: iso(year, month, day, s.h, s.m, actual), end: iso(year, month, endDay, e.h, e.m, actual) };
}

/** Parse "September 23, 2026" + "10:00" in a known IANA zone (WAD pages show venue-local 24h times). */
export function parseLocalDateTime(dateText: string, clock: string, timeZone: string): string {
  const dm = /^\s*([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})\s*$/.exec(dateText);
  if (!dm) throw new Error(`unrecognized date "${dateText}"`);
  const month = MONTHS.indexOf(dm[1]!.slice(0, 3).toLowerCase()) + 1;
  if (month < 1) throw new Error(`unrecognized month "${dm[1]}"`);
  const y = Number(dm[3]);
  const d = Number(dm[2]);
  const c = parseClock(clock);
  return iso(y, month, d, c.h, c.m, zoneOffsetMinutes(timeZone, y, month, d, c.h, c.m));
}

/** Minutes between two ISO timestamps. */
export const minutesBetween = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 60_000;
