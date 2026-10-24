import { parkingCost, evaluateOption, labelOptions, type ParkingRule, type TravelOption, type Commitment } from '../src/domain/travel';

// Rules below are test fixtures, not real lots.
const meteredWeekdays: ParkingRule = {
  id: 'meter',
  name: 'Metered block',
  windows: [
    { days: [1, 2, 3, 4, 5], start: '09:00', end: '18:00', pricing: { type: 'hourly', centsPerHour: 300 } },
    { days: [6], start: '11:00', end: '18:00', pricing: { type: 'hourly', centsPerHour: 400 } },
  ],
  outsideWindows: 'free',
};

const twoHourFree: ParkingRule = {
  id: 'two-hour',
  name: 'Two-hour street parking',
  windows: [{ days: [0, 1, 2, 3, 4, 5, 6], start: '08:00', end: '20:00', pricing: { type: 'hourly', centsPerHour: 0 }, maxStayMinutes: 120 }],
  outsideWindows: 'free',
};

const garage: ParkingRule = {
  id: 'garage',
  name: 'Garage (closes 7 PM)',
  windows: [{ days: [0, 1, 2, 3, 4, 5, 6], start: '06:00', end: '19:00', pricing: { type: 'tiered', tiersCents: [600, 1200, 1800, 2400, 3000] } }],
  outsideWindows: 'unknown',
  closesAt: '19:00',
};

const unknownLot: ParkingRule = {
  id: 'unknown',
  name: 'Lot with no verified rate',
  windows: [{ days: [0, 1, 2, 3, 4, 5, 6], start: '00:00', end: '24:00', pricing: { type: 'unknown', reason: 'no verified rate' } }],
  outsideWindows: 'unknown',
};

// Wednesday 2026-10-28 and Saturday 2026-10-31
const wed = (t: string) => `2026-10-28T${t}`;
const sat = (t: string) => `2026-10-31T${t}`;

describe('parking rules', () => {
  it('case 1: arriving 5 PM with enforcement until 6 PM still pays the first hour', () => {
    expect(parkingCost(meteredWeekdays, wed('17:00'), wed('21:00'))).toEqual({ ok: true, cost: { kind: 'known', cents: 300 } });
  });

  it('case 2: Saturday uses Saturday rules, not weekday defaults', () => {
    // Saturday enforcement starts 11:00 at $4/h: 11:00–13:00 = 2h.
    expect(parkingCost(meteredWeekdays, sat('10:00'), sat('13:00'))).toEqual({ ok: true, cost: { kind: 'known', cents: 800 } });
  });

  it('case 3: free two-hour parking cannot hold an eight-hour day', () => {
    const r = parkingCost(twoHourFree, wed('09:00'), wed('17:00'));
    expect(r.ok).toBe(false);
    expect(!r.ok && r.reason).toMatch(/time limit/);
  });

  it('case 4: a garage that closes before departure is rejected', () => {
    const r = parkingCost(garage, wed('09:00'), wed('21:00'));
    expect(r.ok).toBe(false);
    expect(!r.ok && r.reason).toMatch(/closes/);
    expect(parkingCost({ ...garage, lateRetrieval: true, outsideWindows: 'free' }, wed('09:00'), wed('21:00')).ok).toBe(true);
  });

  it('case 8: no verified rate stays unknown, never $0', () => {
    expect(parkingCost(unknownLot, wed('09:00'), wed('12:00'))).toEqual({ ok: true, cost: { kind: 'unknown', reason: 'no verified rate' } });
  });

  it('tiered pricing charges by started hour up to the daily maximum', () => {
    expect(parkingCost(garage, wed('09:00'), wed('10:30'))).toEqual({ ok: true, cost: { kind: 'known', cents: 1200 } });
    expect(parkingCost(garage, wed('09:00'), wed('18:30'))).toEqual({ ok: true, cost: { kind: 'known', cents: 3000 } });
  });
});

const morning: Commitment = { id: 'a', start: wed('10:00'), end: wed('11:00') };
const afternoon: Commitment = { id: 'b', start: wed('14:00'), end: wed('15:00') };

const drive = (over: Partial<TravelOption> = {}): TravelOption => ({
  id: 'drive',
  name: 'Drive and park',
  mode: 'drive',
  outboundMinutes: [30, 45],
  returnMinutes: [30, 45],
  walkMinutes: 5,
  fares: [
    { label: 'Fuel (estimate)', cost: { kind: 'known', cents: 450 }, direction: 'round-trip' },
    { label: 'Bridge toll', cost: { kind: 'known', cents: 850 }, direction: 'one-way' },
  ],
  parking: [{ rule: garage, commitmentIds: ['a', 'b'] }],
  ...over,
});

const transit = (over: Partial<TravelOption> = {}): TravelOption => ({
  id: 'transit',
  name: 'BART + Muni',
  mode: 'transit',
  outboundMinutes: [60, 75],
  returnMinutes: [60, 80],
  walkMinutes: 12,
  fares: [
    { label: 'BART', cost: { kind: 'known', cents: 450 }, direction: 'outbound' },
    { label: 'Muni', cost: { kind: 'known', cents: 285 }, direction: 'outbound' },
    { label: 'Muni', cost: { kind: 'known', cents: 285 }, direction: 'return' },
    { label: 'BART', cost: { kind: 'known', cents: 450 }, direction: 'return' },
  ],
  lastReturnDeparture: '2026-10-29T00:20',
  ...over,
});

const opts = { budgetCents: 2000, arrivalBufferMinutes: 15 };

describe('day-level travel evaluation', () => {
  it('case 5: two events sharing a garage are charged once for the whole stay', () => {
    const e = evaluateOption(drive(), [morning, afternoon], opts);
    // One stay 09:40–15:05 (walk + buffer) → 6 started hours → $30 max, plus fuel and one toll.
    expect(e.totalCents).toBe(3000 + 450 + 850);
    expect(e.status).toBe('over-budget');
  });

  it('case 6: moving the car to a second lot includes both charges and the move', () => {
    const e = evaluateOption(
      drive({
        parking: [
          { rule: garage, commitmentIds: ['a'] },
          { rule: garage, commitmentIds: ['b'] },
        ],
        fares: [...drive().fares, { label: 'Move car (fuel estimate)', cost: { kind: 'known', cents: 100 }, direction: 'between' }],
      }),
      [morning, afternoon],
      opts,
    );
    // Stay 1: 09:40–11:05 → 2h $12. Stay 2: 13:40–15:05 → 2h $12.
    expect(e.totalCents).toBe(1200 + 1200 + 450 + 850 + 100);
  });

  it('case 7: outbound works but the last return leaves too early → infeasible', () => {
    const late: Commitment = { id: 'c', start: wed('20:00'), end: wed('23:50') };
    const e = evaluateOption(transit({ lastReturnDeparture: wed('23:30') }), [late], opts);
    expect(e.status).toBe('infeasible');
    expect(e.reasons.join(' ')).toMatch(/return/);
  });

  it('case 8 (day): an unknown cost makes the day unconfirmed with a lower bound only', () => {
    const e = evaluateOption(drive({ parking: [{ rule: unknownLot, commitmentIds: ['a', 'b'] }] }), [morning, afternoon], opts);
    expect(e.status).toBe('unconfirmed');
    expect(e.totalCents).toBeNull();
    expect(e.knownCents).toBe(1300);
    expect(e.unknowns).toContain('no verified rate');
  });

  it('case 9: a one-direction toll is counted once', () => {
    const e = evaluateOption(drive({ parking: [] }), [morning], opts);
    expect(e.totalCents).toBe(450 + 850);
  });

  it('case 10: prizes and free food never reduce transportation cost', () => {
    const base = evaluateOption(transit(), [morning], opts);
    const withPrize = evaluateOption(transit(), [{ ...morning, prizeValueCents: 25000 } as Commitment], opts);
    expect(withPrize.totalCents).toBe(base.totalCents);
    expect(base.totalCents).toBe(1470);
    expect(base.status).toBe('within-budget');
  });

  it('case 11: the lowest-cost trip that arrives late is ineligible unless the user accepts it', () => {
    const cheapLate = transit({ id: 'early-bus', earliestArrival: wed('10:20') });
    const strict = evaluateOption(cheapLate, [morning], opts);
    expect(strict.status).toBe('infeasible');
    expect(strict.reasons.join(' ')).toMatch(/late/);
    const accepted = evaluateOption(cheapLate, [morning], { ...opts, allowLateArrival: true });
    expect(accepted.status).toBe('within-budget');
    expect(accepted.lateByMinutes).toBe(20);
  });

  it('case 12: results never promise a parking space', () => {
    expect(evaluateOption(drive(), [morning], opts).spaceGuaranteed).toBe(false);
  });

  it('a day over $20 is over budget, not silently accepted', () => {
    expect(evaluateOption(drive(), [morning, afternoon], opts).status).toBe('over-budget');
  });
});

describe('labeling getting-there options', () => {
  it('lets one option win several labels and never pads with filler', () => {
    const evals = [evaluateOption(transit(), [morning], opts), evaluateOption(drive(), [morning], opts)];
    const cards = labelOptions([transit(), drive()], evals);
    expect(cards).toHaveLength(2);
    expect(cards[0]).toMatchObject({ optionId: 'transit', labels: ['cheapest', 'best-transit'] });
    expect(cards[1]).toMatchObject({ optionId: 'drive', labels: ['closest-parking'] });
  });

  it('excludes infeasible options and does not call an unconfirmed option cheapest', () => {
    const unknownDrive = drive({ parking: [{ rule: unknownLot, commitmentIds: ['a'] }] });
    const evals = [evaluateOption(unknownDrive, [morning], opts)];
    const cards = labelOptions([unknownDrive], evals);
    expect(cards).toEqual([expect.objectContaining({ optionId: 'drive', labels: ['closest-parking'] })]);
  });
});
