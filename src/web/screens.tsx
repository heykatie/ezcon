import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import type { Candidate, GraphPath, Meeting } from '../domain/graph-types';
import type { ConferenceId, Goal, SessionRecord } from '../domain/types';
import { GOAL_LABELS } from '../domain/types';
import type { Recommendation } from '../domain/recommend';
import type { HiringConnection } from '../domain/careers';
import type { ScheduleItem, Conflict } from '../domain/schedule';
import { STAMP_TEXT, ACCESSORY, unlockedAccessories, type RewardState, type Stamp } from '../domain/rewards';
import { validateProfileLink, type LinkKind } from '../domain/urls';
import { personId } from '../domain/ids';
import { COMPANIONS, CONFERENCES, INTEREST_OPTIONS, WAD_RUN, type CompanionKind, type DemoProfile } from '../data/demo';
import type { Backend, ResearchResponse } from './backend';
import { Companion } from './Companion';
import { Icon, type IconName } from './Icon';
import { searchEvents } from '../domain/events';
import { UPCOMING_EVENTS } from '../data/events';
import { compareTravel, TravelOptions } from './TravelOptions';
import { fmtDay, fmtRange, fmtStamp, fmtTime, localOf, money, PathView, Sheet, SourceLine } from './ui';

export type CheckIn = 'met' | 'went' | 'skipped' | 'later';

export interface PState {
  profile: DemoProfile;
  schedule: ScheduleItem[];
  rewards: RewardState;
  checkins: Record<string, CheckIn>;
  prepDone: Record<string, boolean>;
  notes: Record<string, string>;
  followups: Record<string, { text: string; done: boolean }>;
  travelChoice?: string;
  accessoryOn: boolean;
  visited: string[];
  /** Demo history has been written to the graph once. */
  seeded?: boolean;
}

export interface Ctx {
  backend: Backend;
  ps: PState;
  now: string;
  conference: ConferenceId;
  sessions: SessionRecord[];
  recs: Recommendation[];
  hiring: HiringConnection[];
  candidates: Candidate[];
  meetings: Meeting[];
  update: (fn: (p: PState) => PState) => void;
  toggleGoal: (g: Goal) => void;
  add: (s: SessionRecord) => void;
  remove: (eventId: string) => void;
  openWhy: (title: string, paths: GraphPath[], note?: string) => void;
  openCheckIn: (item: ScheduleItem) => void;
  openPerson: (id: string) => void;
  openTravel: (s: SessionRecord) => void;
  openLevelUp: () => void;
  openProfile: () => void;
  goTab: (t: 'today' | 'discover' | 'schedule' | 'people') => void;
}

const pathsFor = (ctx: Ctx, sessionId: string) => ctx.candidates.filter((c) => c.sessionId === sessionId).map((c) => c.path);
const isScheduled = (ctx: Ctx, id: string) => ctx.ps.schedule.some((s) => s.eventId === id);
const whyNote = (ctx: Ctx) =>
  ctx.backend.mode === 'live' ? 'Paths returned by a parameterized FalkorDB query.' : 'Paths computed by the in-browser graph from the cached snapshot (FalkorDB in the live version).';

// ---------------------------------------------------------------------------------------
// Today

export function Today(ctx: Ctx) {
  const { ps, now } = ctx;
  const upcoming = ps.schedule.filter((s) => Date.parse(s.end) > Date.parse(now));
  const next = upcoming[0];
  const start = !next ? ctx.hiring.find((h) => !isScheduled(ctx, h.session.id)) : undefined;
  const prep = next ? prepFor(next, ctx) : undefined;
  const prepDone = next ? !!ps.prepDone[next.eventId] : false;
  const steps: Array<[string, boolean]> = [
    ['Opportunity', upcoming.length > 0],
    ['Scheduled', upcoming.length > 0],
    ['Prepared', Object.values(ps.prepDone).some(Boolean)],
    ['Commute', !!ps.travelChoice],
  ];
  return (
    <div className="stack">
      <header className="page-head">
        <div className="between">
          <div>
            <h1>Today</h1>
            <p className="muted">What should I do now?</p>
          </div>
          <button className="icon-btn" style={{ width: 64, height: 64, padding: 0 }} onClick={ctx.openProfile} aria-label="Customize companion and profile">
            <Companion kind={ps.profile.companion} color={ps.profile.color} size={60} label={`${ps.profile.companionName}, your ${COMPANIONS[ps.profile.companion]}`} />
          </button>
        </div>
      </header>

      <section className="card stack" aria-labelledby="next-h">
        <h2 id="next-h">{next ? 'Next up' : start ? 'Start here' : 'Next up'}</h2>
        {next ? (
          <>
            <p className="big">{next.title}</p>
            <p className="small muted">
              {fmtRange(next.start, next.end)} · {next.location}
            </p>
            <div className="row">
              <button className="btn primary" onClick={() => ctx.goTab('schedule')}>
                See my day
              </button>
            </div>
          </>
        ) : start ? (
          <>
            <p className="big">
              {start.role.title} · {start.role.company}
            </p>
            <p className="small muted">
              Go to “{start.session.title}” · {fmtRange(start.session.start, start.session.end)}
            </p>
            <div className="row">
              <button className="btn primary" onClick={() => ctx.add(start.session)}>
                Add event to Schedule
              </button>
              <button className="btn" onClick={() => ctx.goTab('discover')}>
                Explore
              </button>
            </div>
          </>
        ) : (
          <>
            <p>Let’s plan your first stop.</p>
            <button className="btn primary" onClick={() => ctx.goTab('discover')}>
              Explore
            </button>
          </>
        )}
      </section>

      {prep && next && (
        <section className="card soft between" aria-label="Get ready">
          <span className="small">
            <b>Get ready:</b> {prep.main}
          </span>
          <button className="btn small" aria-pressed={prepDone} onClick={() => ctx.update((p) => ({ ...p, prepDone: { ...p.prepDone, [next.eventId]: !prepDone } }))}>
            {prepDone ? '✓ Ready' : 'Done'}
          </button>
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="card stack" aria-labelledby="day-h">
          <div className="between">
            <h2 id="day-h">Your day</h2>
            <button className="btn ghost small" onClick={() => ctx.goTab('schedule')}>
              Full schedule
            </button>
          </div>
          <ul className="stack" style={{ margin: 0, padding: 0, listStyle: 'none', gap: 6 }}>
            {upcoming.slice(0, 4).map((s) => (
              <li key={s.eventId} className="row" style={{ flexWrap: 'nowrap' }}>
                <span className="tl-time" style={{ minWidth: 64 }}>
                  {fmtTime(s.start)}
                </span>
                <span className="small">{s.title}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card passport-strip between" aria-label="Plan progress">
        <ol className="row" style={{ margin: 0, padding: 0, listStyle: 'none', gap: 6 }}>
          {steps.map(([label, done]) => (
            <li key={label} className={`badge ${done ? 'good' : ''}`}>
              {done ? '✓ ' : ''}
              {label}
            </li>
          ))}
        </ol>
        <button className="btn small" onClick={ctx.openLevelUp}>
          Level Up
        </button>
      </section>
    </div>
  );
}

export function ComingNext() {
  const items: Array<[IconName, string, string]> = [
    ['map', 'Booth routing', 'Walk between booths and talks on a verified venue map.'],
    ['ticket', 'Raffles', 'Sourced raffles with entry rules and draw times.'],
    ['flag', 'Side quests', 'Optional parties, meetups and goodies, same budget checks.'],
    ['badge', 'Passport rewards', 'Stamps and a companion accessory for following through.'],
  ];
  return (
    <section className="stack" aria-labelledby="next-concepts-h">
      <div className="between">
        <h3 id="next-concepts-h">Coming next</h3>
        <span className="badge warn">Concept preview — not working yet</span>
      </div>
      <ul className="stack" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {items.map(([icon, title, text]) => (
          <li key={title} className="row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
            <span className="muted" style={{ paddingTop: 2 }}>
              <Icon name={icon} />
            </span>
            <span className="small">
              <b>{title}</b> <span className="badge">Preview</span>
              <br />
              <span className="muted">{text}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function HiringSection(ctx: Ctx) {
  return (
    <section className="stack" aria-labelledby="hiring-h">
      <div className="section-title">
        <h2 id="hiring-h">Hiring connections</h2>
        <span className="tiny muted">{ctx.backend.mode === 'live' ? 'Open on employer sites' : 'open when last checked (cached snapshot)'}</span>
      </div>
      {ctx.hiring.length === 0 ? (
        <p className="card soft small">No verified open role connects to an upcoming talk right now.</p>
      ) : (
        ctx.hiring.map((h) => <HiringCard key={h.role.id} ctx={ctx} h={h} />)
      )}
    </section>
  );
}

export function HiringCard({ ctx, h }: { ctx: Ctx; h: HiringConnection }) {
  const scheduled = isScheduled(ctx, h.session.id);
  return (
    <article className="card career stack" aria-label={`Hiring connection: ${h.role.title} at ${h.role.company}`}>
      <div className="row">
        <span className="badge good">Open role · checked {fmtStamp(h.role.checkedAt)}</span>
      </div>
      <div>
        <h3>{h.role.title}</h3>
        <p className="small muted">
          {h.role.company} · {h.role.location}
        </p>
      </div>
      <div className="card soft" style={{ padding: 10 }}>
        <p className="small">
          <b>Go to:</b> {h.session.title}
        </p>
        <p className="small muted">
          {h.person.name} ({h.role.company}) · {fmtRange(h.session.start, h.session.end)} · {h.session.location}
        </p>
      </div>
      <p className="tiny">
        <b>Fit:</b> {h.role.minYearsExperience === 0 ? 'no minimum years listed' : `asks for ${h.role.minYearsExperience}+ years`} — check location and team in the listing. A listed speaker isn’t a referral; ezcon never applies for you.
      </p>
      <div className="row">
        <a className="btn career small" href={h.applyUrl} target="_blank" rel="noopener noreferrer">
          View role &amp; apply ↗
        </a>
        <button className="btn primary small" disabled={scheduled} onClick={() => ctx.add(h.session)}>
          {scheduled ? 'Event on your schedule' : 'Add event to Schedule'}
        </button>
        <button className="btn small" onClick={() => ctx.openTravel(h.session)}>
          Getting there
        </button>
        <button
          className="btn ghost small"
          onClick={() => ctx.openWhy(`Why ${h.role.company} × ${h.session.title}`, [h.path, ...h.otherTouchpoints.map((t) => t.path)], `${h.explanation} ${whyNote(ctx)}`)}
        >
          Why this fits
        </button>
      </div>
    </article>
  );
}

function SessionCard({ ctx, session, reasons, paths }: { ctx: Ctx; session: SessionRecord; reasons?: string[]; paths: GraphPath[] }) {
  const scheduled = isScheduled(ctx, session.id);
  const past = Date.parse(session.start) <= Date.parse(ctx.now);
  return (
    <article className="card stack">
      <h3>{session.title}</h3>
      <p className="small muted">
        {session.sessionType ?? 'Session'} · {fmtRange(session.start, session.end)} · {session.location ?? 'Location not listed'}
      </p>
      {reasons?.map((r) => (
        <p key={r} className="small row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start', gap: 6 }}>
          <span style={{ color: 'var(--accent)' }}>
            <Icon name="spark" size={16} />
          </span>
          {r}
        </p>
      ))}
      <div className="row">
        <button className="btn primary small" disabled={scheduled || past} onClick={() => ctx.add(session)}>
          {scheduled ? 'On your schedule' : past ? 'Already started' : 'Add to Schedule'}
        </button>
        {ctx.conference === 'universe26' && !past && (
          <button className="btn small" onClick={() => ctx.openTravel(session)}>
            Getting there
          </button>
        )}
        <button className="btn ghost small" disabled={paths.length === 0} onClick={() => ctx.openWhy(session.title, paths, whyNote(ctx))}>
          {paths.length ? 'Why this fits' : 'No path from your interests'}
        </button>
      </div>
      <SourceLine source={session.source} />
    </article>
  );
}

// ---------------------------------------------------------------------------------------
// Explore

export function Explore(ctx: Ctx) {
  const conf = CONFERENCES[ctx.conference];
  const upcoming = conf.mode === 'upcoming';
  const hiringIds = new Set(ctx.hiring.map((h) => h.session.id));
  const recIds = new Set(ctx.recs.map((r) => r.session.id));
  const rest = ctx.sessions
    .filter((s) => s.catalogs.includes('quest') && !hiringIds.has(s.id) && !recIds.has(s.id) && (!upcoming || Date.parse(s.start) > Date.parse(ctx.now)))
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  return (
    <div className="stack">
      <header className="page-head">
        <h1>Explore</h1>
        <p className="muted">What could I do?</p>
      </header>
      <EventSearch now={ctx.now} />
      <div className="row" role="group" aria-label="Goals (optional, choose any)">
        {(Object.keys(GOAL_LABELS) as Goal[]).map((g) => (
          <button key={g} className="chip" aria-pressed={ctx.ps.profile.goals.includes(g)} onClick={() => ctx.toggleGoal(g)}>
            {GOAL_LABELS[g]}
          </button>
        ))}
      </div>
      {!upcoming && <p className="notice">Past event · replay. Sessions are for recall and research; nothing sends reminders.</p>}
      {upcoming && ctx.ps.profile.goals.includes('career') && <HiringSection {...ctx} />}

      <section className="stack" aria-labelledby="quests-h">
        <div className="section-title">
          <h2 id="quests-h">Quests</h2>
          <span className="tiny muted">Learning & networking for your goals</span>
        </div>
        {ctx.recs.map((r) => (
          <SessionCard key={r.session.id} ctx={ctx} session={r.session} reasons={r.reasons} paths={r.paths} />
        ))}
        {rest.map((s) => (
          <SessionCard key={s.id} ctx={ctx} session={s} paths={pathsFor(ctx, s.id)} />
        ))}
      </section>

      <section className="card soft" aria-label="Side quests">
        <ComingNext />
      </section>
      <ResearchPanel ctx={ctx} />
    </div>
  );
}

function EventSearch({ now }: { now: string }) {
  const [q, setQ] = useState('');
  const results = searchEvents(UPCOMING_EVENTS, q, now);
  const day = (d: string) => fmtDay(`${d}T12:00:00-08:00`);
  return (
    <section className="stack" aria-label="Search conferences and events" style={{ gap: 8 }}>
      <label className="field search" style={{ position: 'relative' }}>
        <span className="muted" style={{ position: 'absolute', left: 18, top: 16, pointerEvents: 'none' }}>
          <Icon name="search" />
        </span>
        <span className="sr-only">Search conferences &amp; events</span>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search events or cities" />
      </label>
      <p className="tiny muted" role="status" aria-live="polite">
        {results.length} verified upcoming {results.length === 1 ? 'event' : 'events'}
      </p>
      <ul className="stack" style={{ margin: 0, padding: 0, listStyle: 'none', gap: 6 }}>
        {results.map((e) => (
          <li key={e.id} className="card soft" style={{ padding: '10px 12px' }}>
            <div className="between">
              <b className="small">{e.name}</b>
              <span className={`badge ${e.supported ? 'good' : ''}`}>{e.supported ? 'Planning available' : 'Listing only'}</span>
            </div>
            <span className="tiny muted">
              {day(e.startDate)}–{day(e.endDate)} · {e.location} ·{' '}
              <a href={e.source.url} target="_blank" rel="noopener noreferrer">
                source
              </a>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ResearchPanel({ ctx }: { ctx: Ctx }) {
  const [result, setResult] = useState<ResearchResponse>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const url = 'https://www.wearedevelopers.com/events/world-congress-2026-north-america/sessions/1917-making-works-on-all';
  const run = async () => {
    if (!ctx.backend.research) return;
    setBusy(true);
    setError(undefined);
    try {
      setResult(await ctx.backend.research('wad-session', url));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const recorded = !result && ctx.backend.mode === 'cached';
  return (
    <details className="card">
      <summary style={{ cursor: 'pointer', fontWeight: 800, minHeight: 32 }}>Research a source {ctx.backend.mode === 'live' ? '(live)' : '(recorded run)'}</summary>
      <div className="stack" style={{ marginTop: 10 }}>
        <p className="small muted">
          The companion asks TrueForge (OpenAI) to call one allowlisted Bright Data tool. ezcon then extracts fields from the raw page with a deterministic, container-scoped parser — the model never supplies the facts.
        </p>
        <p className="small">
          Source: WeAreDevelopers World Congress 2026 North America session page <span className="badge">Past event</span>
        </p>
        {ctx.backend.research ? (
          <button className="btn primary small" onClick={run} disabled={busy}>
            {busy ? 'Researching… (up to ~60s)' : 'Run live research'}
          </button>
        ) : (
          <p className="notice">Live research runs only in the local version. Below is the recorded result from the Oct 24 live run.</p>
        )}
        {error && <p className="error">Research failed: {error}. Cached data is unchanged.</p>}
        {(result || recorded) && <ResearchTrace r={result} />}
      </div>
    </details>
  );
}

function ResearchTrace({ r }: { r?: ResearchResponse }) {
  const rec = r ? r.records[0] : undefined;
  const trace = r?.trace ?? (WAD_RUN.trace as ResearchResponse['trace']);
  const usage = r?.usage ?? WAD_RUN.usage;
  return (
    <div className="stack">
      <div className="trace" aria-label="Tool trace">
        {r ? `status: ${r.status}${r.error ? ` (${r.error})` : ''}\n` : 'recorded run · '}
        {`model: ${r?.model ?? WAD_RUN.model} · ${(((r?.durationMs ?? WAD_RUN.durationMs) as number) / 1000).toFixed(1)}s · tokens in ${usage.inputTokens} / out ${usage.outputTokens}\n`}
        {trace.map((t) => `→ ${t.tool} ${JSON.stringify(t.args)}  ⇢ ${t.responseChars.toLocaleString()} chars\n`).join('')}
      </div>
      {r && (
        <div className="card soft small">
          {rec ? (
            <>
              <b>Extracted (deterministic parser):</b> {rec.title} · {rec.speakers.map((s) => `${s.name}, ${s.title} · ${s.company}`).join('; ')} · {fmtRange(rec.start, rec.end)} · {rec.location}
              <br />
              Retrieved {fmtStamp(r.retrievedAt)} via Bright Data
            </>
          ) : (
            'No fields extracted; nothing was written.'
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------------
// Schedule

interface Leg {
  at: string;
  kind: 'travel' | 'event' | 'open' | 'check';
  title: string;
  detail?: string;
  item?: ScheduleItem;
}

export function Schedule(ctx: Ctx) {
  const { ps, now } = ctx;
  const mine = ps.schedule.filter((s) => s.eventId.startsWith(`${ctx.conference}:`));
  const past = CONFERENCES[ctx.conference].mode === 'past';
  const days = [...new Set(mine.map((s) => localOf(s.start).slice(0, 10)))].sort();
  const [day, setDay] = useState<string | undefined>(days[0]);
  const activeDay = day && days.includes(day) ? day : days[0];
  const items = mine.filter((s) => localOf(s.start).slice(0, 10) === activeDay);
  const universe = ctx.conference === 'universe26';

  const travel = useMemo(() => (universe ? compareTravel(items, ps.profile.budgetCents) : undefined), [items, universe, ps.profile.budgetCents]);

  const chosenId = ps.travelChoice ?? travel?.cards[0]?.optionId;
  const chosen = travel?.options.find((o) => o.id === chosenId);
  const chosenEval = travel?.evals.find((e) => e.optionId === chosenId);

  const legs: Leg[] = [];
  if (items.length && chosen) {
    const first = items[0]!;
    const last = items.reduce((a, b) => (Date.parse(b.end) > Date.parse(a.end) ? b : a));
    const leave = new Date(Date.parse(first.start) - (15 + chosen.walkMinutes + chosen.outboundMinutes[1]) * 60_000).toISOString();
    legs.push({ at: leave, kind: 'travel', title: `Leave ${ps.profile.origin || 'home'}`, detail: `${chosen.name} · ${chosen.outboundMinutes[0]}–${chosen.outboundMinutes[1]} min + ${chosen.walkMinutes} min walk (estimate)` });
    legs.push({ at: new Date(Date.parse(first.start) - 15 * 60_000).toISOString(), kind: 'check', title: 'Arrive, badge check-in, find the room', detail: '15-minute buffer' });
    items.forEach((it, i) => {
      legs.push({ at: it.start, kind: 'event', title: it.title, detail: `${fmtTime(it.start)}–${fmtTime(it.end)} · ${it.location ?? ''}`, item: it });
      const nx = items[i + 1];
      if (nx) {
        const gap = (Date.parse(nx.start) - Date.parse(it.end)) / 60_000;
        if (gap >= 20) legs.push({ at: it.end, kind: 'open', title: `Open time · ${Math.round(gap)} min`, detail: 'Break, booths or a snack (food not counted in the travel budget)' });
        else if (gap > 0) legs.push({ at: it.end, kind: 'travel', title: `Walk to next room · ${Math.round(gap)} min`, detail: 'Estimated on-campus walk' });
      }
    });
    legs.push({ at: last.end, kind: 'travel', title: 'Head home', detail: `${chosen.returnMinutes[0]}–${chosen.returnMinutes[1]} min (estimate)${chosen.lastReturnDeparture ? ` · last listed train ${fmtTime(new Date(chosen.lastReturnDeparture + ':00-07:00').toISOString())}` : ''}` });
  }

  if (items.length && !chosen) items.forEach((it) => legs.push({ at: it.start, kind: 'event', title: it.title, detail: `${fmtTime(it.start)}–${fmtTime(it.end)} · ${it.location ?? ''}`, item: it }));

  return (
    <div className="stack">
      <div className="stack" style={{ gap: 10 }}>
        <header className="page-head">
          <h1>Schedule</h1>
          <p className="muted">{past ? 'What I did at this event' : 'What have I committed to?'}</p>
        </header>
        {days.length > 1 && (
          <div className="segmented" role="tablist" aria-label="Day">
            {days.map((d) => (
              <button key={d} role="tab" aria-selected={d === activeDay} onClick={() => setDay(d)}>
                {fmtDay(d + 'T12:00:00-07:00')}
              </button>
            ))}
          </div>
        )}
      </div>
      {!items.length && (
        <div className="card stack">
          <p>Let’s plan your first stop.</p>
          <button className="btn primary small" onClick={() => ctx.goTab('discover')}>
            Browse quests
          </button>
        </div>
      )}
      {items.length > 0 && (
        <section className="card" aria-labelledby="tl-h">
          <div className="between">
            <h2 id="tl-h">
              {activeDay && fmtDay(activeDay + 'T12:00:00-07:00')} {past ? '' : 'at a glance'}
              {past && (
                <span className="badge" style={{ marginLeft: 8 }}>
                  Past event · replay
                </span>
              )}
            </h2>
            {chosenEval && <span className={`badge ${chosenEval.status === 'within-budget' ? 'good' : chosenEval.status === 'unconfirmed' ? 'warn' : 'bad'}`}>{chosenEval.totalCents !== null ? `${money(chosenEval.totalCents)} travel` : `≥ ${money(chosenEval.knownCents)} travel`}</span>}
          </div>
          <ol className="timeline" style={{ padding: 0 }}>
            {legs.map((l, i) => (
              <li key={i} className={`tl-item tl-kind-${l.kind}`} style={{ listStyle: 'none', opacity: l.item && ctx.ps.checkins[l.item.eventId] === 'skipped' ? 0.6 : 1 }}>
                <span className="tl-time">{fmtTime(l.at)}</span>
                <div className="tl-body stack" style={{ gap: 4 }}>
                  <span style={{ fontWeight: l.kind === 'event' ? 800 : 600 }}>{l.title}</span>
                  {l.detail && <span className="small muted">{l.detail}</span>}
                  {l.item && <EventActions ctx={ctx} item={l.item} />}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
      {travel && (
        <section className="stack" aria-labelledby="gt-h">
          <h2 id="gt-h">Getting there for the whole day</h2>
          <TravelOptions travel={travel} chosenId={chosenId} onChoose={(id) => ctx.update((p) => ({ ...p, travelChoice: id }))} origin={ps.profile.origin} budgetCents={ps.profile.budgetCents} />
        </section>
      )}
      {past && items.length > 0 && <p className="tiny muted">Fictional demo history from a finished conference. Sessions are real listings; attendance and the meeting are made up for the demo, and nothing sends reminders.</p>}
      <p className="tiny muted">Clock: {fmtStamp(now)}</p>
    </div>
  );
}

function prepFor(item: ScheduleItem, ctx: Ctx) {
  const session = ctx.sessions.find((s) => s.id === item.eventId);
  const hiring = ctx.hiring.find((h) => h.session.id === item.eventId);
  const main = hiring
    ? `Read the ${hiring.role.company} “${hiring.role.title}” listing and note one question about the work.`
    : session?.sessionType === 'Workshop'
      ? 'Bring a charged laptop and skim the workshop summary.'
      : 'Write down one question to ask after the session.';
  const more = [
    session?.summary && `What it covers: ${session.summary}`,
    item.location && `Leave a few minutes to find ${item.location}.`,
    'Keep My QR handy so sharing your links takes one tap.',
  ].filter(Boolean) as string[];
  return { main, more };
}

function EventActions({ ctx, item }: { ctx: Ctx; item: ScheduleItem }) {
  const [more, setMore] = useState(false);
  const ended = Date.parse(item.end) <= Date.parse(ctx.now);
  const ci = ctx.ps.checkins[item.eventId];
  const prep = prepFor(item, ctx);
  const done = !!ctx.ps.prepDone[item.eventId];
  return (
    <div className="stack" style={{ gap: 6 }}>
      {!ended && (
        <div className="card soft" style={{ padding: 10 }}>
          <div className="between">
            <span className="small">
              <b>Get ready:</b> {prep.main}
            </span>
            <button className="btn small" aria-pressed={done} onClick={() => ctx.update((p) => ({ ...p, prepDone: { ...p.prepDone, [item.eventId]: !done } }))}>
              {done ? '✓ Ready' : 'Done'}
            </button>
          </div>
          <button className="btn ghost small" aria-expanded={more} onClick={() => setMore(!more)}>
            {more ? 'Fewer tips' : 'More tips'}
          </button>
          {more && (
            <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
              {prep.more.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div className="row">
        {ended && ci === 'met' && ctx.meetings.some((m) => m.eventId === item.eventId) ? (
          <span className="badge good">Met {ctx.meetings.filter((m) => m.eventId === item.eventId).map((m) => m.personName).join(', ')}</span>
        ) : ended && (!ci || ci === 'later') ? (
          <button className="btn primary small" onClick={() => ctx.openCheckIn(item)}>
            How did it go?
          </button>
        ) : ci ? (
          <span className={`badge ${ci === 'skipped' ? '' : 'good'}`}>{{ met: 'Met someone', went: '✓ Went', skipped: 'Skipped', later: 'Later' }[ci]}</span>
        ) : null}
        {!ended && (
          <button className="btn ghost small" onClick={() => ctx.remove(item.eventId)}>
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

export function ConflictSheet({ item, conflicts, onChoose }: { item: ScheduleItem; conflicts: Conflict[]; onChoose: (c: 'keep' | 'replace' | 'cancel') => void }) {
  return (
    <Sheet title="This overlaps your plan" onClose={() => onChoose('cancel')}>
      <p>
        <b>{item.title}</b> · {fmtRange(item.start, item.end)}
      </p>
      <ul className="small">
        {conflicts.map((c) => (
          <li key={c.item.eventId}>
            {c.item.title} ({fmtTime(c.item.start)}–{fmtTime(c.item.end)}) — {c.reason === 'overlap' ? 'times overlap' : 'not enough time to walk between rooms'}
          </li>
        ))}
      </ul>
      <p className="small muted">Nothing changes unless you choose.</p>
      <div className="row">
        <button className="btn" onClick={() => onChoose('keep')}>
          Keep existing
        </button>
        <button className="btn primary" onClick={() => onChoose('replace')}>
          Replace
        </button>
        <button className="btn ghost" onClick={() => onChoose('cancel')}>
          Cancel
        </button>
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------------------
// Check-in

export function CheckInSheet({ ctx, item, onSubmit, onClose }: { ctx: Ctx; item: ScheduleItem; onSubmit: (c: CheckIn, person?: { id: string; name: string }, note?: string) => void; onClose: () => void }) {
  const [mode, setMode] = useState<CheckIn | undefined>();
  const [who, setWho] = useState('');
  const [note, setNote] = useState('');
  const session = ctx.sessions.find((s) => s.id === item.eventId);
  const people = (session?.speakers ?? []).map((s) => ({ id: personId(s.name, s.company), name: s.name, detail: [s.title, s.company].filter(Boolean).join(', ') }));
  return (
    <Sheet title="How did it go?" onClose={onClose}>
      <p className="small muted">{item.title}</p>
      <div className="row">
        <button className="btn" aria-pressed={mode === 'met'} onClick={() => setMode('met')}>
          Met someone
        </button>
        <button className="btn" onClick={() => onSubmit('went')}>
          Went, didn’t connect
        </button>
        <button className="btn" onClick={() => onSubmit('skipped')}>
          Skipped
        </button>
        <button className="btn ghost" onClick={() => onSubmit('later')}>
          Later
        </button>
      </div>
      {mode === 'met' && (
        <div className="stack">
          <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="small" style={{ fontWeight: 800 }}>
              Who did you meet?
            </legend>
            {people.length === 0 && <p className="small muted">No listed speakers for this event.</p>}
            {people.map((p) => (
              <label key={p.id} className="row small" style={{ minHeight: 44 }}>
                <input type="radio" name="who" value={p.id} checked={who === p.id} onChange={() => setWho(p.id)} />
                {p.name} <span className="muted">{p.detail}</span>
              </label>
            ))}
          </fieldset>
          <label className="field">
            <span className="small">Private note (optional)</span>
            <textarea value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="What did you talk about?" />
          </label>
          {ctx.ps.profile.fictional && <p className="tiny muted">Demo profile: this meeting is fictional and labeled as such.</p>}
          <button
            className="btn primary"
            disabled={!who}
            onClick={() => {
              const p = people.find((x) => x.id === who)!;
              onSubmit('met', { id: p.id, name: p.name }, note.trim() || undefined);
            }}
          >
            Confirm meeting
          </button>
        </div>
      )}
    </Sheet>
  );
}

// ---------------------------------------------------------------------------------------
// People

export function People(ctx: Ctx) {
  const [tab, setTab] = useState<'want' | 'met'>('want');
  const metIds = new Set(ctx.meetings.map((m) => m.personId));
  const want = new Map<string, { name: string; detail: string; why: string }>();
  const addPerson = (s: SessionRecord, why: string) =>
    s.speakers.forEach((sp) => {
      const id = personId(sp.name, sp.company);
      if (!metIds.has(id) && !want.has(id)) want.set(id, { name: sp.name, detail: [sp.title, sp.company].filter(Boolean).join(', '), why: `${why}: ${s.title}` });
    });
  ctx.hiring.forEach((h) => addPerson(h.session, `Listed with ${h.role.company} (open role)`));
  ctx.ps.schedule.forEach((it) => {
    const s = ctx.sessions.find((x) => x.id === it.eventId);
    if (s) addPerson(s, 'Speaking at a session on your schedule');
  });
  ctx.recs.forEach((r) => addPerson(r.session, 'Speaking at a recommended session'));
  return (
    <div className="stack">
      <div className="between">
        <h1>People</h1>
        <div className="segmented" role="tablist" aria-label="People lists">
          <button role="tab" aria-selected={tab === 'want'} onClick={() => setTab('want')}>
            Want to meet
          </button>
          <button role="tab" aria-selected={tab === 'met'} onClick={() => setTab('met')}>
            Met ({ctx.meetings.length})
          </button>
        </div>
      </div>
      <p className="tiny muted">Public facts come from the conference catalog. Being listed is not attendance or availability.</p>
      {tab === 'want' &&
        (want.size ? (
          [...want].map(([id, p]) => (
            <button key={id} className="card stack" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => ctx.openPerson(id)}>
              <b>{p.name}</b>
              <span className="small muted">{p.detail}</span>
              <span className="small">{p.why}</span>
            </button>
          ))
        ) : (
          <p className="card soft">Add sessions or pick goals to see people worth meeting.</p>
        ))}
      {tab === 'met' &&
        (ctx.meetings.length ? (
          ctx.meetings.map((m) => (
            <button key={m.meetingId} className="card stack" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => ctx.openPerson(m.personId)}>
              <div className="between">
                <b>{m.personName}</b>
                {m.fictional && <span className="badge warn">Fictional demo meeting</span>}
              </div>
              <span className="small muted">
                Met {fmtStamp(m.at)} · {ctx.sessions.find((s) => s.id === m.eventId)?.title}
              </span>
              <span className="small">{ctx.ps.followups[m.meetingId]?.done ? '✓ Follow-up drafted' : 'Next: draft a follow-up'}</span>
            </button>
          ))
        ) : (
          <p className="card soft">No confirmed meetings yet. After an event, use “How did it go?” on your schedule.</p>
        ))}
    </div>
  );
}

export function PersonSheet({ ctx, id, onClose, onUndoMeeting }: { ctx: Ctx; id: string; onClose: () => void; onUndoMeeting: (m: Meeting) => void }) {
  const sessions = ctx.sessions.filter((s) => s.speakers.some((sp) => personId(sp.name, sp.company) === id));
  const sp = sessions[0]?.speakers.find((x) => personId(x.name, x.company) === id);
  const meeting = ctx.meetings.find((m) => m.personId === id);
  const draftKey = meeting?.meetingId ?? '';
  const first = (sp?.name ?? meeting?.personName ?? '').split(' ')[0];
  const myLink = ctx.ps.profile.links.github || ctx.ps.profile.links.personal || ctx.ps.profile.links.linkedin;
  const defaultDraft = meeting
    ? `Hi ${first},\n\nThanks for the conversation after “${ctx.sessions.find((s) => s.id === meeting.eventId)?.title ?? 'your session'}” at GitHub Universe.${meeting.note ? ` I appreciated what you shared about ${meeting.note.replace(/\.$/, '')}.` : ''} I’m an early-career developer working with React and Python and exploring AI tools, and I’d love to stay in touch.${myLink ? `\n\nMy work: ${myLink}` : ''}\n\n— ${ctx.ps.profile.name || 'Me'}`
    : '';
  const fu = ctx.ps.followups[draftKey];
  const [draft, setDraft] = useState(fu?.text ?? defaultDraft);
  const [copied, setCopied] = useState(false);
  const note = ctx.ps.notes[id] ?? '';
  return (
    <Sheet title={sp?.name ?? meeting?.personName ?? 'Person'} onClose={onClose}>
      <section className="card stack">
        <h3>Public professional profile</h3>
        <p className="small">
          {sp?.title ?? 'Title not listed'} · {sp?.company ?? 'Company not listed'}
        </p>
        <p className="small">Conference presence: listed speaker for {sessions.map((s) => `${s.title} (${fmtDay(s.start)} ${fmtTime(s.start)})`).join('; ') || '—'}</p>
        <p className="tiny muted">Missing: bio, projects and professional links — no public enrichment has been run for this person. Listing does not mean they attended or are available.</p>
        {sessions[0] && <SourceLine source={sessions[0].source} />}
      </section>
      <section className="card stack">
        <h3>Private</h3>
        <label className="field">
          <span className="small">Your notes (stay on this device/profile)</span>
          <textarea value={note} maxLength={1000} onChange={(e) => ctx.update((p) => ({ ...p, notes: { ...p.notes, [id]: e.target.value } }))} />
        </label>
        {meeting && (
          <>
            <p className="small">
              Met {fmtStamp(meeting.at)}
              {meeting.fictional ? ' · fictional demo meeting' : ''}
              {meeting.note ? ` · “${meeting.note}”` : ''}
            </p>
            <label className="field">
              <span className="small">Follow-up draft (editable — ezcon never sends messages)</span>
              <textarea value={draft} onChange={(e) => setDraft(e.target.value)} />
            </label>
            <div className="row">
              <button
                className="btn primary small"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(draft);
                    setCopied(true);
                  } catch {
                    setCopied(false);
                  }
                  ctx.update((p) => ({ ...p, followups: { ...p.followups, [draftKey]: { text: draft, done: true } } }));
                }}
              >
                {copied ? 'Copied ✓' : 'Copy draft'}
              </button>
              <button className="btn small" onClick={() => ctx.update((p) => ({ ...p, followups: { ...p.followups, [draftKey]: { text: draft, done: !fu?.done } } }))}>
                {fu?.done ? 'Mark not done' : 'Mark follow-up done'}
              </button>
              <button className="btn ghost small" onClick={() => onUndoMeeting(meeting)}>
                Undo meeting
              </button>
            </div>
          </>
        )}
      </section>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------------------
// Passport, profile and QR

export function PassportSheet({ ps, onClose, onToggleAccessory, onCustomize }: { ps: PState; onClose: () => void; onToggleAccessory: () => void; onCustomize: () => void }) {
  const unlocked = unlockedAccessories(ps.rewards).includes(ACCESSORY.id);
  const count = (s: Stamp) => ps.rewards.awards.filter((a) => a.stamp === s);
  return (
    <Sheet title="Passport" onClose={onClose}>
      <div className="companion-hero card">
        <Companion kind={ps.profile.companion} color={ps.profile.color} size={110} scarf={unlocked && ps.accessoryOn} label={ps.profile.companionName} />
        <div className="stack" style={{ gap: 6 }}>
          <h3>{ps.profile.companionName}</h3>
          <p className="small muted">{COMPANIONS[ps.profile.companion]}</p>
          <button className="btn small" onClick={onCustomize}>
            Customize
          </button>
        </div>
      </div>
      <div className="stamps">
        {(['explorer', 'connection', 'follow-through'] as Stamp[]).map((s) => (
          <div key={s} className={`stamp ${count(s).length ? 'got pop' : ''}`}>
            {STAMP_TEXT[s]}
            <br />
            {count(s).length ? `×${count(s).length}` : 'not yet'}
          </div>
        ))}
      </div>
      <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
        {ps.rewards.awards.map((a) => (
          <li key={a.id}>
            {STAMP_TEXT[a.stamp]} — {a.label}
          </li>
        ))}
      </ul>
      <div className="card between">
        <div>
          <b>{ACCESSORY.name}</b>
          <p className="small muted">{unlocked ? 'Unlocked by your first Connection' : `Unlocks with your ${ACCESSORY.unlockedBy}`}</p>
        </div>
        <button className="btn small" disabled={!unlocked} aria-pressed={ps.accessoryOn} onClick={onToggleAccessory}>
          {ps.accessoryOn ? 'Take off' : 'Wear'}
        </button>
      </div>
      <p className="tiny muted">Stamps are self-confirmed and reversible. No points, streaks, spending or prize rewards.</p>
    </Sheet>
  );
}

const LINK_LABEL: Record<LinkKind, string> = { github: 'GitHub', linkedin: 'LinkedIn', personal: 'Personal / Portfolio' };

export function QrSheet({ ps, onClose, onEdit }: { ps: PState; onClose: () => void; onEdit: () => void }) {
  const available = (Object.keys(LINK_LABEL) as LinkKind[]).filter((k) => validateProfileLink(k, ps.profile.links[k]).ok);
  const [kind, setKind] = useState<LinkKind | undefined>(available[0]);
  const [src, setSrc] = useState<string>();
  const [copied, setCopied] = useState(false);
  const v = kind ? validateProfileLink(kind, ps.profile.links[kind]) : undefined;
  const url = v?.ok ? v.url : undefined;
  useEffect(() => {
    setCopied(false);
    if (!url) return setSrc(undefined);
    QRCode.toDataURL(url, { margin: 1, width: 520, errorCorrectionLevel: 'M' }).then(setSrc, () => setSrc(undefined));
  }, [url]);
  return (
    <Sheet title="My QR" onClose={onClose}>
      {available.length === 0 ? (
        <div className="stack">
          <p>Add a link to share it as a QR code.</p>
          <button className="btn primary" onClick={onEdit}>
            Add link
          </button>
        </div>
      ) : (
        <div className="stack" style={{ justifyItems: 'center', textAlign: 'center' }}>
          <div className="segmented" role="tablist" aria-label="Link to share">
            {available.map((k) => (
              <button key={k} role="tab" aria-selected={k === kind} onClick={() => setKind(k)}>
                {LINK_LABEL[k]}
              </button>
            ))}
          </div>
          {src && url && <img className="qr" src={src} alt={`QR code for ${url}`} />}
          <p className="small" style={{ wordBreak: 'break-all' }}>
            {url}
          </p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <a className="btn primary small" href={url} target="_blank" rel="noopener noreferrer">
              Open link
            </a>
            <button
              className="btn small"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(url ?? '');
                  setCopied(true);
                } catch {
                  setCopied(false);
                }
              }}
            >
              {copied ? 'Copied ✓' : 'Copy link'}
            </button>
            <button className="btn ghost small" onClick={onEdit}>
              Edit links
            </button>
          </div>
          {ps.profile.fictional && <p className="tiny muted">Demo persona is fictional; these links go to the ezcon creator’s real profiles.</p>}
          <p className="tiny muted">A plain URL QR generated on this device — not a platform-issued identity code.</p>
        </div>
      )}
    </Sheet>
  );
}

export function ProfileSheet({ ps, onClose, onSave }: { ps: PState; onClose: () => void; onSave: (p: DemoProfile) => void }) {
  const [p, setP] = useState(ps.profile);
  const errors = (Object.keys(LINK_LABEL) as LinkKind[]).reduce<Record<string, string>>((acc, k) => {
    const v = p.links[k].trim();
    const r = validateProfileLink(k, v);
    if (v && !r.ok) acc[k] = r.reason;
    return acc;
  }, {});
  const colors = ['#7c6cf2', '#f59e0b', '#14b8a6', '#ec4899', '#3b82f6'];
  return (
    <Sheet title={ps.profile.fictional ? 'Demo profile & companion' : 'Make it yours'} onClose={onClose}>
      <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend style={{ fontWeight: 800 }}>Companion</legend>
        <div className="row">
          {(Object.keys(COMPANIONS) as CompanionKind[]).map((k) => (
            <button key={k} className="chip" aria-pressed={p.companion === k} onClick={() => setP({ ...p, companion: k })} style={{ minHeight: 64 }}>
              <Companion kind={k} color={p.color} size={44} label="" /> {COMPANIONS[k]}
            </button>
          ))}
        </div>
        <div className="row" role="group" aria-label="Accent color">
          {colors.map((c) => (
            <button key={c} className="icon-btn" aria-label={`Color ${c}`} aria-pressed={p.color === c} onClick={() => setP({ ...p, color: c })} style={{ background: c, outline: p.color === c ? '3px solid var(--ink)' : undefined }} />
          ))}
        </div>
        <label className="field">
          <span className="small">Companion name</span>
          <input value={p.companionName} maxLength={24} onChange={(e) => setP({ ...p, companionName: e.target.value })} />
        </label>
      </fieldset>
      <label className="field">
        <span className="small">Your name</span>
        <input value={p.name} maxLength={40} onChange={(e) => setP({ ...p, name: e.target.value })} />
      </label>
      <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend style={{ fontWeight: 800 }}>Interests</legend>
        <div className="row">
          {INTEREST_OPTIONS.map((t) => (
            <button key={t} className="chip" aria-pressed={p.interests.includes(t)} onClick={() => setP({ ...p, interests: p.interests.includes(t) ? p.interests.filter((x) => x !== t) : [...p.interests, t] })}>
              {t}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend style={{ fontWeight: 800 }}>Links for My QR (optional, HTTPS only)</legend>
        {(Object.keys(LINK_LABEL) as LinkKind[]).map((k) => (
          <label key={k} className="field">
            <span className="small">{LINK_LABEL[k]}</span>
            <input type="url" inputMode="url" value={p.links[k]} placeholder="https://" aria-invalid={!!errors[k]} onChange={(e) => setP({ ...p, links: { ...p.links, [k]: e.target.value } })} />
            {errors[k] && <span className="error">{errors[k]}</span>}
          </label>
        ))}
      </fieldset>
      <label className="field">
        <span className="small">Starting area (keep it general; never shared)</span>
        <input value={p.origin} maxLength={80} onChange={(e) => setP({ ...p, origin: e.target.value })} />
      </label>
      <p className="tiny muted">Daily transport budget: {money(p.budgetCents)} round trip. Admission must be free or covered by your pass.</p>
      <button className="btn primary" disabled={Object.keys(errors).length > 0} onClick={() => onSave({ ...p, links: { github: p.links.github.trim(), linkedin: p.links.linkedin.trim(), personal: p.links.personal.trim() } })}>
        Save
      </button>
    </Sheet>
  );
}

export function WhySheet({ title, paths, note, onClose }: { title: string; paths: GraphPath[]; note?: string; onClose: () => void }) {
  return (
    <Sheet title="Why this fits" onClose={onClose}>
      <p className="small">
        <b>{title}</b>
      </p>
      {note && <p className="tiny muted">{note}</p>}
      {paths.slice(0, 4).map((p, i) => (
        <PathView key={i} path={p} />
      ))}
      {paths.length > 4 && <p className="tiny muted">+{paths.length - 4} more paths</p>}
    </Sheet>
  );
}

export function TravelSheet({ ctx, session, onClose }: { ctx: Ctx; session: SessionRecord; onClose: () => void }) {
  const travel = compareTravel([{ eventId: session.id, start: session.start, end: session.end }], ctx.ps.profile.budgetCents);
  const scheduled = isScheduled(ctx, session.id);
  return (
    <Sheet title="Getting there" onClose={onClose}>
      <p className="small">
        <b>{session.title}</b>
        <br />
        <span className="muted">
          {fmtRange(session.start, session.end)} · {session.location}
        </span>
      </p>
      <p className="tiny muted">Compared for this event alone: arrive 15 minutes early, head home when it ends. Your full-day plan on Schedule shares one commute across events.</p>
      {travel && <TravelOptions travel={travel} origin={ctx.ps.profile.origin} budgetCents={ctx.ps.profile.budgetCents} />}
      <button className="btn primary" disabled={scheduled} onClick={() => (ctx.add(session), onClose())}>
        {scheduled ? 'On your schedule' : 'Add event to Schedule'}
      </button>
    </Sheet>
  );
}
