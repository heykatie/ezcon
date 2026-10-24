// Getting-there evaluation. All money is integer cents; unknown never becomes $0;
// prizes, perks and food never offset transportation (there is no field for them).
import type { SourceRef } from './types';

/** Local wall-clock time at the venue, "YYYY-MM-DDTHH:MM". */
export type LocalDateTime = string;

export type Cost = { kind: 'known'; cents: number } | { kind: 'unknown'; reason: string };

export type Pricing =
  | { type: 'hourly'; centsPerHour: number; maxCents?: number }
  /** tiersCents[i] is the price for a stay of up to i+1 started hours; longer stays pay the last tier. */
  | { type: 'tiered'; tiersCents: number[] }
  | { type: 'unknown'; reason: string };

export interface ParkingWindow {
  days: number[]; // 0 = Sunday
  start: string; // HH:MM
  end: string; // HH:MM, "24:00" allowed
  pricing: Pricing;
  maxStayMinutes?: number;
}

export interface ParkingRule {
  id: string;
  name: string;
  windows: ParkingWindow[];
  /** What applies outside every window: posted free, or not established. */
  outsideWindows: 'free' | 'unknown';
  /** Vehicle must be out by this local time unless late retrieval is documented. */
  closesAt?: string;
  lateRetrieval?: boolean;
  source?: SourceRef;
}

export type ParkingResult = { ok: true; cost: Cost } | { ok: false; reason: string };

const DAY = 1440;
const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h! * 60 + m!;
};
/** Minutes since 1970-01-01 local; weekday derives from the same calendar date. */
const abs = (dt: LocalDateTime) => {
  const [d, t] = dt.split('T');
  const [y, mo, da] = d!.split('-').map(Number);
  return Date.UTC(y!, mo! - 1, da!) / 60_000 + toMin(t!);
};
const weekdayOfDay = (dayIndex: number) => new Date(dayIndex * DAY * 60_000).getUTCDay();
const clock = (m: number) => `${String(Math.floor((m % DAY) / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

export function parkingCost(rule: ParkingRule, arrive: LocalDateTime, depart: LocalDateTime): ParkingResult {
  const a = abs(arrive);
  const d = abs(depart);
  if (d <= a) return { ok: false, reason: 'departure must be after arrival' };

  if (rule.closesAt && !rule.lateRetrieval) {
    const close = Math.floor(a / DAY) * DAY + toMin(rule.closesAt);
    if (d > close) return { ok: false, reason: `${rule.name} closes at ${rule.closesAt}, before departure at ${clock(d)}` };
  }

  let cents = 0;
  let unknown: string | undefined;
  let covered = 0;
  for (let day = Math.floor(a / DAY); day * DAY < d; day++) {
    const wd = weekdayOfDay(day);
    for (const w of rule.windows) {
      if (!w.days.includes(wd)) continue;
      const ws = day * DAY + toMin(w.start);
      const we = day * DAY + toMin(w.end);
      const overlap = Math.max(0, Math.min(d, we) - Math.max(a, ws));
      if (overlap === 0) continue;
      covered += overlap;
      if (w.maxStayMinutes !== undefined && overlap > w.maxStayMinutes) {
        return { ok: false, reason: `stay exceeds the ${w.maxStayMinutes / 60}-hour time limit at ${rule.name}` };
      }
      const hours = Math.ceil(overlap / 60);
      const p = w.pricing;
      if (p.type === 'unknown') unknown ??= p.reason;
      else if (p.type === 'hourly') cents += Math.min(hours * p.centsPerHour, p.maxCents ?? Infinity);
      else cents += p.tiersCents[Math.min(hours, p.tiersCents.length) - 1] ?? 0;
    }
  }
  if (rule.outsideWindows === 'unknown' && covered < d - a) unknown ??= `${rule.name} rate outside posted hours is unknown`;
  return { ok: true, cost: unknown ? { kind: 'unknown', reason: unknown } : { kind: 'known', cents } };
}

export interface Commitment {
  id: string;
  start: LocalDateTime;
  end: LocalDateTime;
}

export interface Fare {
  label: string;
  cost: Cost;
  /** A one-way toll or fare is counted exactly once. */
  direction: 'outbound' | 'return' | 'round-trip' | 'one-way' | 'between';
  source?: SourceRef;
}

export interface TravelOption {
  id: string;
  name: string;
  mode: 'transit' | 'drive';
  outboundMinutes: [number, number];
  returnMinutes: [number, number];
  /** Walk between parking/stop and the venue door. */
  walkMinutes: number;
  fares: Fare[];
  /** Each entry is one continuous stay covering those commitments (shared stays are charged once). */
  parking?: Array<{ rule: ParkingRule; commitmentIds: string[] }>;
  earliestArrival?: LocalDateTime;
  lastReturnDeparture?: LocalDateTime;
  notes?: string[];
  sources?: SourceRef[];
}

export interface EvaluateOptions {
  budgetCents: number;
  arrivalBufferMinutes: number;
  allowLateArrival?: boolean;
}

export type OptionStatus = 'within-budget' | 'over-budget' | 'unconfirmed' | 'infeasible';

export interface OptionEvaluation {
  optionId: string;
  status: OptionStatus;
  totalCents: number | null;
  knownCents: number;
  unknowns: string[];
  reasons: string[];
  lateByMinutes: number;
  travelMinutes: [number, number];
  spaceGuaranteed: false;
  lines: Array<{ label: string; cost: Cost }>;
}

const fromAbs = (m: number): LocalDateTime => {
  const date = new Date(Math.floor(m / DAY) * DAY * 60_000).toISOString().slice(0, 10);
  return `${date}T${clock(m)}`;
};

export function evaluateOption(option: TravelOption, commitments: Commitment[], opts: EvaluateOptions): OptionEvaluation {
  const reasons: string[] = [];
  const unknowns: string[] = [];
  const lines: OptionEvaluation['lines'] = [];
  let known = 0;
  let lateBy = 0;
  const add = (label: string, cost: Cost) => {
    lines.push({ label, cost });
    if (cost.kind === 'known') known += cost.cents;
    else unknowns.push(cost.reason);
  };

  const sorted = [...commitments].sort((x, y) => abs(x.start) - abs(y.start));
  const first = sorted[0];
  const last = sorted.reduce<Commitment | undefined>((acc, c) => (!acc || abs(c.end) > abs(acc.end) ? c : acc), undefined);
  if (!first || !last) throw new Error('at least one commitment is required');

  if (option.earliestArrival) {
    const ea = abs(option.earliestArrival);
    if (ea > abs(first.start) - opts.arrivalBufferMinutes) {
      lateBy = Math.max(0, ea - abs(first.start));
      if (!opts.allowLateArrival) reasons.push(`arrives late (${clock(ea)}) for ${clock(abs(first.start))} start`);
    }
  }
  if (option.lastReturnDeparture) {
    const ready = abs(last.end) + option.walkMinutes;
    if (abs(option.lastReturnDeparture) < ready) {
      reasons.push(`last return service leaves at ${clock(abs(option.lastReturnDeparture))}, before you can reach it`);
    }
  }

  for (const fare of option.fares) add(fare.label, fare.cost);

  for (const stay of option.parking ?? []) {
    const covered = sorted.filter((c) => stay.commitmentIds.includes(c.id));
    if (covered.length === 0) continue;
    const arrive = Math.min(...covered.map((c) => abs(c.start))) - opts.arrivalBufferMinutes - option.walkMinutes;
    const depart = Math.max(...covered.map((c) => abs(c.end))) + option.walkMinutes;
    const r = parkingCost(stay.rule, fromAbs(arrive), fromAbs(depart));
    if (!r.ok) reasons.push(r.reason);
    else add(`Parking: ${stay.rule.name}`, r.cost);
  }

  let status: OptionStatus;
  if (reasons.length) status = 'infeasible';
  else if (known > opts.budgetCents) status = 'over-budget';
  else if (unknowns.length) status = 'unconfirmed';
  else status = 'within-budget';

  return {
    optionId: option.id,
    status,
    totalCents: unknowns.length ? null : known,
    knownCents: known,
    unknowns,
    reasons,
    lateByMinutes: lateBy,
    // Door to door: ride time each way plus the walk at each end.
    travelMinutes: [option.outboundMinutes[0] + option.returnMinutes[0] + 2 * option.walkMinutes, option.outboundMinutes[1] + option.returnMinutes[1] + 2 * option.walkMinutes],
    spaceGuaranteed: false,
    lines,
  };
}

export type OptionLabel = 'cheapest' | 'closest-parking' | 'best-transit';

export const OPTION_LABEL_TEXT: Record<OptionLabel, string> = {
  cheapest: 'Cheapest overall',
  'closest-parking': 'Closest practical parking',
  'best-transit': 'Best transit option',
};

/** Up to three cards, one per distinct option; an option may carry several labels. */
export function labelOptions(options: TravelOption[], evals: OptionEvaluation[]) {
  const byId = new Map(options.map((o) => [o.id, o]));
  const eligible = evals.filter((e) => e.status !== 'infeasible');
  const pick = (list: OptionEvaluation[], key: (e: OptionEvaluation) => number) =>
    list.reduce<OptionEvaluation | undefined>((best, e) => (!best || key(e) < key(best) ? e : best), undefined);

  const winners: Array<[OptionLabel, OptionEvaluation | undefined]> = [
    ['cheapest', pick(eligible.filter((e) => e.totalCents !== null), (e) => e.totalCents!)],
    ['closest-parking', pick(eligible.filter((e) => (byId.get(e.optionId)?.parking?.length ?? 0) > 0), (e) => byId.get(e.optionId)!.walkMinutes)],
    ['best-transit', pick(eligible.filter((e) => byId.get(e.optionId)?.mode === 'transit'), (e) => e.travelMinutes[1])],
  ];

  const cards: Array<{ optionId: string; labels: OptionLabel[]; evaluation: OptionEvaluation }> = [];
  for (const [label, e] of winners) {
    if (!e) continue;
    const existing = cards.find((c) => c.optionId === e.optionId);
    if (existing) existing.labels.push(label);
    else cards.push({ optionId: e.optionId, labels: [label], evaluation: e });
  }
  return cards.slice(0, 3);
}

export const formatCents = (c: number) => `$${(c / 100).toFixed(2)}`;
