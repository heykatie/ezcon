// Getting-there comparison: up to three labeled choices (never padded), with estimated
// round-trip cost and time from deterministic evaluation of recorded, sourced inputs.
import { evaluateOption, labelOptions, OPTION_LABEL_TEXT, type Commitment, type TravelOption } from '../domain/travel';
import type { ScheduleItem } from '../domain/schedule';
import { UNIVERSE_TRAVEL } from '../data/demo';
import { localOf, money, SourceLine } from './ui';

export function compareTravel(items: Pick<ScheduleItem, 'eventId' | 'start' | 'end'>[], budgetCents: number) {
  if (!items.length) return undefined;
  const commitments: Commitment[] = items.map((s) => ({ id: s.eventId, start: localOf(s.start), end: localOf(s.end) }));
  const options: TravelOption[] = UNIVERSE_TRAVEL.map((o) => (o.parking ? { ...o, parking: o.parking.map((p) => ({ ...p, commitmentIds: commitments.map((c) => c.id) })) } : o));
  const evals = options.map((o) => evaluateOption(o, commitments, { budgetCents, arrivalBufferMinutes: 15 }));
  return { options, evals, cards: labelOptions(options, evals) };
}

const STATUS = {
  'within-budget': ['good', 'Within budget'],
  'over-budget': ['bad', 'Over budget'],
  unconfirmed: ['warn', 'Cost unconfirmed'],
  infeasible: ['bad', 'Not feasible'],
} as const;

export function TravelOptions({
  travel,
  chosenId,
  onChoose,
  origin,
  budgetCents,
}: {
  travel: NonNullable<ReturnType<typeof compareTravel>>;
  chosenId?: string;
  onChoose?: (id: string) => void;
  origin: string;
  budgetCents: number;
}) {
  const chosen = travel.options.find((o) => o.id === chosenId) ?? travel.options.find((o) => o.id === travel.cards[0]?.optionId);

  return (
    <div className="stack">
      <p className="tiny muted">
        {origin || 'Origin not set'} → Fort Mason Center · budget {money(budgetCents)}/day round trip, food separate · recorded Oct 24 estimates, no live availability or guaranteed space.
      </p>
      {travel.cards.length < 2 && <p className="tiny muted">Only {travel.cards.length} verified option found; ezcon doesn’t add filler choices.</p>}
      {travel.cards.map((c) => {
        const o = travel.options.find((x) => x.id === c.optionId)!;
        const e = c.evaluation;
        const [tone, text] = STATUS[e.status];
        const selected = c.optionId === chosen?.id;
        return (
          <article key={c.optionId} className="option" aria-current={onChoose && selected ? 'true' : undefined} style={selected && onChoose ? { borderColor: 'var(--accent)' } : undefined}>
            <span className="row">
              {c.labels.map((l) => (
                <span key={l} className="badge accent">
                  {OPTION_LABEL_TEXT[l]}
                </span>
              ))}
              <span className={`badge ${tone}`}>{text}</span>
            </span>
            <span className="between">
              <b>{o.name}</b>
              <b>{e.totalCents !== null ? `${money(e.totalCents)} est.` : `≥ ${money(e.knownCents)}`}</b>
            </span>
            <span className="small muted">
              ~{e.travelMinutes[0]}–{e.travelMinutes[1]} min round trip door to door · {o.walkMinutes} min walk each way
            </span>
            <span className="lines">
              {e.lines.map((l, i) => (
                <span key={i} className="between">
                  <span>{l.label}</span>
                  <span>{l.cost.kind === 'known' ? money(l.cost.cents) : 'unknown'}</span>
                </span>
              ))}
            </span>
            {[...e.reasons, ...e.unknowns, ...(o.notes ?? [])].map((n) => (
              <span key={n} className="tiny muted">
                • {n}
              </span>
            ))}
            {o.sources?.map((s) => <SourceLine key={s.url} source={s} />)}
            {onChoose && (
              <button className="btn small" aria-pressed={selected} onClick={() => onChoose(c.optionId)}>
                {selected ? '✓ Using this for my day' : 'Use this option'}
              </button>
            )}
          </article>
        );
      })}
    </div>
  );
}
