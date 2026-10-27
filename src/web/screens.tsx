import { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import type { Candidate, GraphPath, Meeting } from '../domain/graph-types';
import type { ConferenceId, EventRecord, ExternalEventRecord, Goal, SessionRecord } from '../domain/types';
import { GOAL_LABELS } from '../domain/types';
import { matchesGoals, type Recommendation } from '../domain/recommend';
import type { HiringConnection } from '../domain/careers';
import type { ScheduleItem, Conflict } from '../domain/schedule';
import { BADGE_TEXT, ACCESSORY, unlockedAccessories, type RewardState, type Badge } from '../domain/rewards';
import { validateProfileLink, type LinkKind } from '../domain/urls';
import { personId } from '../domain/ids';
import { COMPANIONS, CONFERENCES, INTEREST_OPTIONS, SIDE_QUESTS, WAD_GOODIES, WAD_GOODIES_SOURCE, WAD_RUN, type CompanionKind, type DemoProfile, type SideQuest } from '../data/demo';
import type { Backend, ResearchResponse } from './backend';
import { Companion } from './Companion';
import PEOPLE_LINKS from '../data/people-links.json';
import { slug } from '../domain/ids';
import { ROLES } from '../data/demo';
import { Icon, type IconName } from './Icon';
import { compareTravel, TravelOptions } from './TravelOptions';
import { fmtDay, fmtRange, fmtStamp, fmtTime, localOf, money, navigateTabs, PathView, Sheet, SourceLine } from './ui';

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
  /** Self-reported applications; ezcon never applies on the user's behalf. */
  applications?: Array<{ roleId: string; title: string; company: string; applyUrl: string; eventId: string; appliedAt: string; fictional?: boolean }>;
  /** Raffle ticket and reminder details stay on this device/profile. */
  raffleTickets?: Array<{ questId: string; number: string; photo?: string; savedAt: string; remindAt?: string; drawAt?: string; remindedAt?: string }>;
  /** Demo history has been written to the graph once. */
  seeded?: boolean;
  /** Public event pages imported by the user; saved only in this browser profile. */
  liveEvents?: ExternalEventRecord[];
  /** Self-reported meetings at imported events; kept in this local browser profile. */
  externalMeetings?: Meeting[];
}

export interface Ctx {
  backend: Backend;
  ps: PState;
  now: string;
  conference: ConferenceId;
  sessions: EventRecord[];
  recs: Recommendation[];
  hiring: HiringConnection[];
  candidates: Candidate[];
  meetings: Meeting[];
  exploreSection: 'quests' | 'side-quests';
  setExploreSection: (section: 'quests' | 'side-quests') => void;
  update: (fn: (p: PState) => PState) => void;
  toggleGoal: (g: Goal) => void;
  add: (s: EventRecord) => void;
  remove: (eventId: string) => void;
  openWhy: (title: string, paths: GraphPath[], note?: string) => void;
  openCheckIn: (item: ScheduleItem) => void;
  openPerson: (id: string) => void;
  openTravel: (s: EventRecord) => void;
  openAchievements: () => void;
  openRaffles: () => void;
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
  const liveIds = new Set((ps.liveEvents ?? []).map((s) => s.id));
  const upcoming = ps.schedule.filter((s) => (s.eventId.startsWith(`${ctx.conference}:`) || liveIds.has(s.eventId)) && Date.parse(s.end) > Date.parse(now)).sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  const past = CONFERENCES[ctx.conference].mode === 'past' && upcoming.length === 0;
  const next = upcoming[0];
  const start = !next ? ctx.hiring.find((h) => !isScheduled(ctx, h.session.id)) : undefined;
  const prep = next ? prepFor(next, ctx) : undefined;
  const prepDone = next ? !!ps.prepDone[next.eventId] : false;
  const hiringIds = new Set(ctx.hiring.map((h) => h.session.id));
  const recommendation = ctx.recs.find((r) => matchesGoals(r.session, ps.profile.goals, hiringIds));
  const hasConnectionBadge = unlockedAccessories(ps.rewards).length > 0;
  const sideQuest = SIDE_QUESTS.find((q) => q.conference === ctx.conference && !q.historical);
  const applied = (ps.applications ?? []).length > 0;
  const steps: Array<{ label: string; done: boolean; action: string; go: () => void }> = [
    { label: 'Add an opportunity to Schedule', done: upcoming.length > 0, action: 'Explore', go: () => ctx.goTab('discover') },
    { label: 'Get ready for it', done: upcoming.some((s) => ps.prepDone[s.eventId]), action: 'Schedule', go: () => ctx.goTab('schedule') },
    { label: 'Choose how you’ll get there', done: !!ps.travelChoice, action: 'Schedule', go: () => ctx.goTab('schedule') },
    { label: 'Apply to the role', done: applied, action: 'Explore', go: () => ctx.goTab('discover') },
  ];
  const doneCount = steps.filter((x) => x.done).length;
  const nextStep = steps.find((x) => !x.done);
  if (past) return <div className="stack">
    <header className="page-head"><h1>Event recap</h1><p className="muted">{CONFERENCES[ctx.conference].name} has ended. Keep your connections moving.</p></header>
    <section className="card stack"><h2>Your next step</h2><p>Review your notes and draft a follow-up to someone you met.</p>
      <button className="btn primary" onClick={() => ctx.goTab('people')}>See people &amp; follow up</button>
      <button className="btn" onClick={() => ctx.goTab('schedule')}>Review past schedule</button>
    </section>
    <button className="btn" onClick={ctx.openAchievements}>Achievements · {ps.rewards.awards.length} badges</button>
  </div>;

  return (
    <div className="stack">
      <header className="page-head">
        <div className="between today-greeting">
          <div>
            <h1>Today</h1>
            <p className="muted">Good things are ahead.</p>
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

      {recommendation && (
        <section className="card stack today-recommendation" aria-labelledby="today-recommendation-h">
          <span className="eyebrow">Picked for your goals</span>
          <h2 id="today-recommendation-h">{recommendation.session.title}</h2>
          <p className="small muted">
            {fmtRange(recommendation.session.start, recommendation.session.end)}
            {recommendation.session.location ? ` · ${recommendation.session.location}` : ''}
          </p>
          {recommendation.session.speakers[0] && <p className="small muted">{recommendation.session.speakers[0].name}{recommendation.session.speakers[0].company ? ` · ${recommendation.session.speakers[0].company}` : ''}</p>}
          <p className="small">{recommendation.reasons[0] ?? 'A good fit for your conference goals.'}</p>
          <div className="row">
            <button className="btn primary small" onClick={() => ctx.add(recommendation.session)}>Add to my day</button>
            <button className="btn small" onClick={() => ctx.openWhy(recommendation.session.title, recommendation.paths, whyNote(ctx))}>Why this fits</button>
          </div>
        </section>
      )}

      {sideQuest && (
        <button className="card today-side-quest" onClick={ctx.openRaffles} aria-label="View raffle details">
          <span className="side-quest-icon" aria-hidden="true">🎟️</span>
          <span>
            <span className="eyebrow">Optional side quest</span>
            <b>{sideQuest.title}</b>
            <span className="small muted">{sideQuest.prize} · {sideQuest.where}</span>
            <span className="tiny muted">{sideQuest.draw ?? sideQuest.unknowns.find((x) => x.toLowerCase().includes('draw time')) ?? 'Draw time not published'}</span>
          </span>
          <span className="badge">View details ›</span>
        </button>
      )}

      {prep && next && (
        <section className="card soft between" aria-label="Get ready">
          <span className="small">
            <b>Get ready:</b> {prep.main}
          </span>
          <button className="btn small" aria-pressed={prepDone} onClick={() => ctx.update((p) => ({ ...p, prepDone: { ...p.prepDone, [next.eventId]: !prepDone } }))}>
            {prepDone ? '✓ Prep complete' : 'Mark prep complete'}
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

      <section className="card stack" aria-labelledby="plan-h">
        <div className="between">
          <h2 id="plan-h">
            Your plan · {doneCount} of {steps.length} done
          </h2>
        </div>
        <ol className="stack" style={{ margin: 0, padding: 0, listStyle: 'none', gap: 6 }}>
          {steps.map((x, i) => (
            <li key={x.label} className="between" style={{ opacity: x.done ? 0.7 : 1 }}>
              <span className="small" style={{ fontWeight: x === nextStep ? 800 : 600 }}>
                <span className={`badge ${x.done ? 'good' : x === nextStep ? 'accent' : ''}`} style={{ marginRight: 8 }}>
                  {x.done ? '✓' : i + 1}
                </span>
                {x.label}
              </span>
              {x === nextStep && (
                <button className="btn primary small" onClick={x.go}>
                  {x.action}
                </button>
              )}
            </li>
          ))}
        </ol>
      </section>

      <button className="card today-badge-strip" onClick={ctx.openAchievements} aria-label={hasConnectionBadge ? 'Connection badge earned. View achievements' : 'Next up: Connection badge. Meet someone to unlock a star scarf'}>
        <Companion kind={ps.profile.companion} color={ps.profile.color} size={42} label="" />
        <span>
          <b>{hasConnectionBadge ? 'Connection badge earned!' : 'Next up: Connection badge'}</b>
          <span className="small muted">{hasConnectionBadge ? 'Your companion has a new accessory.' : 'Meet someone to unlock a star scarf.'}</span>
        </span>
        <span className="badge">{ps.rewards.awards.length} {ps.rewards.awards.length === 1 ? 'badge' : 'badges'} ›</span>
      </button>
    </div>
  );
}

export function ComingNext() {
  const items: Array<[IconName, string, string]> = [
    ['map', 'Booth route optimization', 'Compare verified walking routes between booths, talks and events.'],
    ['ticket', 'Ticket photo auto-reading', 'Read a ticket number for your confirmation before saving.'],
    ['people', 'Attendee list sync', 'Show verified attendee records when an event makes them available.'],
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
  const [open, setOpen] = useState(false);
  return (
    <article className="card career stack" aria-label={`Hiring connection: ${h.role.title} at ${h.role.company}`}>
      <div className="row">
        <span className="badge good">Open role · checked {fmtStamp(h.role.checkedAt)}</span>
      </div>
      <div>
        <h3>
          <button className="card-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
            {h.role.title}
            <span className="tiny muted">{open ? 'Less' : 'More info'}</span>
          </button>
        </h3>
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
        <AppliedToggle ctx={ctx} h={h} />
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
      {open && (
        <div className="stack" style={{ gap: 8, borderTop: '1px dashed var(--line)', paddingTop: 10 }}>
          <p className="small">
            <b>Role requirements:</b> {h.role.requirementSummary || 'Not stated in the listing summary.'}
          </p>
          <p className="small">
            <b>Why this pairing:</b> {h.explanation}
          </p>
          <SourceLine source={h.role.source} label="Role source" />
          <SessionDetails session={h.session} />
        </div>
      )}
    </article>
  );
}

function SessionDetails({ session }: { session: EventRecord }) {
  const links = PEOPLE_LINKS as Record<string, { status: string; url?: string }>;
  return (
    <div className="stack" style={{ gap: 8, borderTop: '1px dashed var(--line)', paddingTop: 10 }}>
      {session.summary && <p className="small">{session.summary}</p>}
      {session.speakers.length > 0 && (
        <ul className="stack small" style={{ margin: 0, paddingLeft: 18, gap: 4 }}>
          {session.speakers.map((sp) => {
            const li = links[personId(sp.name, sp.company)];
            return (
              <li key={sp.name}>
                <b>{sp.name}</b>
                {[sp.title, sp.company].filter(Boolean).length ? ` — ${[sp.title, sp.company].filter(Boolean).join(', ')}` : ''}
                {li?.status === 'found' && li.url && (
                  <>
                    {' '}
                    ·{' '}
                    <a href={li.url} target="_blank" rel="noopener noreferrer">
                      LinkedIn ↗
                    </a>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className="tiny muted">
        {[session.sessionType, ...session.topics].filter(Boolean).join(' · ') || 'No topics listed'}
      </p>
      <SourceLine source={session.source} />
    </div>
  );
}

function SessionCard({ ctx, session, reasons, paths }: { ctx: Ctx; session: EventRecord; reasons?: string[]; paths: GraphPath[] }) {
  const scheduled = isScheduled(ctx, session.id);
  const past = Date.parse(session.start) <= Date.parse(ctx.now);
  const [open, setOpen] = useState(false);
  return (
    <article className="card stack">
      <h3>
        <button className="card-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
          {session.title}
          <span className="tiny muted">{open ? 'Less' : 'More info'}</span>
        </button>
      </h3>
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
        {(ctx.conference === 'universe26' || session.conference === 'external') && !past && (
          <button className="btn small" onClick={() => ctx.openTravel(session)}>
            Getting there
          </button>
        )}
        <button className="btn ghost small" disabled={paths.length === 0} onClick={() => ctx.openWhy(session.title, paths, whyNote(ctx))}>
          {paths.length ? 'Why this fits' : 'No path from your interests'}
        </button>
      </div>
      {open && <SessionDetails session={session} />}
    </article>
  );
}

// ---------------------------------------------------------------------------------------
// Explore

export function Explore(ctx: Ctx) {
  const conf = CONFERENCES[ctx.conference];
  const upcoming = localOf(ctx.now).slice(0, 10) <= conf.endDate;
  const section = ctx.exploreSection;
  const setSection = ctx.setExploreSection;
  const hiringIds = new Set(ctx.hiring.map((h) => h.session.id));
  const matchingRecs = ctx.recs.filter((r) => matchesGoals(r.session, ctx.ps.profile.goals, hiringIds));
  const recIds = new Set(matchingRecs.map((r) => r.session.id));
  const rest = ctx.sessions
    .filter((s) => s.conference !== 'external' && s.catalogs.includes('quest') && matchesGoals(s, ctx.ps.profile.goals, hiringIds) && !hiringIds.has(s.id) && !recIds.has(s.id) && (!upcoming || Date.parse(s.start) > Date.parse(ctx.now)))
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  return (
    <div className="stack">
      <header className="page-head">
        <h1>Explore</h1>
        <p className="muted">{upcoming ? 'What could I do?' : 'What can I still do from this event?'}</p>
      </header>
      <div className="segmented explore-sections" role="tablist" onKeyDown={navigateTabs} aria-label="Explore sections">
        <button role="tab" aria-selected={section === 'quests'} tabIndex={section === 'quests' ? 0 : -1} onClick={() => setSection('quests')}>Quests</button>
        <button role="tab" aria-selected={section === 'side-quests'} tabIndex={section === 'side-quests' ? 0 : -1} onClick={() => setSection('side-quests')}>Side quests</button>
      </div>
      {section === 'quests' ? (
        <div className="stack" role="tabpanel" aria-label="Quests">
          <LiveEventSearch ctx={ctx} />
          {upcoming ? (
            <div className="stack">
            <div className="row" role="group" aria-label="Goals (optional, choose any)">
              {(Object.keys(GOAL_LABELS) as Goal[]).map((g) => (
                <button key={g} className="chip" aria-pressed={ctx.ps.profile.goals.includes(g)} onClick={() => ctx.toggleGoal(g)}>
                  {GOAL_LABELS[g]}
                </button>
              ))}
            </div>
            {ctx.ps.profile.goals.includes('career') && <HiringSection {...ctx} />}
            <section className="stack" aria-labelledby="quests-h">
              <div className="section-title">
                <h2 id="quests-h">Quests</h2>
                <span className="tiny muted">Matches any selected goal</span>
              </div>
              {matchingRecs.map((r) => (
                <SessionCard key={r.session.id} ctx={ctx} session={r.session} reasons={r.reasons} paths={r.paths} />
              ))}
              {!matchingRecs.length && !rest.length && <p className="muted">No sessions match these goals. Try another goal{ctx.ps.profile.goals.includes('fun') ? ' or open Side quests for giveaways and raffles' : ''}.</p>}
              {rest.map((s) => (
                <SessionCard key={s.id} ctx={ctx} session={s} paths={pathsFor(ctx, s.id)} />
              ))}
            </section>
            <ResearchPanel ctx={ctx} />
            </div>
          ) : <PastExplore {...ctx} />}
        </div>
      ) : (
        <div className="stack" role="tabpanel" aria-label="Side quests">
          <h2>Side quests</h2>
          <p className="muted">Optional fun, giveaways and raffles. Add them only if they fit your time and budget.</p>
          <RaffleSection {...ctx} />
          <div className="card"><ComingNext /></div>
        </div>
      )}
    </div>
  );
}

/** Live discovery stays on Luma; event links can be researched with Bright Data locally,
 * or entered manually in cached mode. Imported facts retain their source and confidence. */
function LiveEventSearch({ ctx }: { ctx: Ctx }) {
  const [query, setQuery] = useState('');
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [location, setLocation] = useState('');
  const [summary, setSummary] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [researchSources, setResearchSources] = useState<Array<{ url: string; title: string }>>([]);
  const [importedSource, setImportedSource] = useState<ExternalEventRecord['source'] | null>(null);
  const [importedTimezone, setImportedTimezone] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Array<{ title: string; url: string; summary: string | null; start: string | null; location: string | null; sources: Array<{ url: string; title: string }> }>>([]);
  const [searching, setSearching] = useState(false);
  const [detailsEdited, setDetailsEdited] = useState(false);
  const formRevision = useRef(0);

  const fill = (event: EventRecord) => {
    setTitle(event.title);
    setStart(eventLocalDateTime(event.start, event.timezone));
    setEnd(eventLocalDateTime(event.end, event.timezone));
    setLocation(event.location ?? '');
    setSummary(event.summary ?? '');
    setImportedSource(event.source);
    setImportedTimezone(event.timezone);
    setDetailsEdited(false);
    setMessage(event.source.via === 'openai-web-search'
      ? 'AI-assisted details found. Check the source links and fields before adding.'
      : 'Details pulled from the public Luma page. Check them, then add it.');
  };
  const pull = async () => {
    setError(''); setMessage('');
    setResearchSources([]); setImportedSource(null); setDetailsEdited(false);
    let parsed: URL;
    try { parsed = new URL(url); } catch { setError('Paste a valid Luma event link.'); return; }
    if (parsed.protocol !== 'https:' || !['luma.com', 'www.luma.com'].includes(parsed.hostname.toLowerCase()) || parsed.pathname === '/sf') {
      setError('Use an individual event page from luma.com, not a search or city page.'); return;
    }
    const revision = formRevision.current;
    const requestedUrl = parsed.toString();
    setBusy(true);
    try {
      if (!ctx.backend.research) {
        setMessage('Live page import is unavailable in this cached build. Open the event page, then enter its details below; the source will stay marked unconfirmed.');
        window.open(parsed.toString(), '_blank', 'noopener,noreferrer');
        return;
      }
      const result = await ctx.backend.research('luma-event', requestedUrl);
      if (formRevision.current !== revision || url.trim() !== requestedUrl) {
        setMessage('The form changed while details were loading. Your edits were kept; pull details again if you still want this page.');
        return;
      }
      const record = result.records[0];
      if (!record) throw new Error(result.error ?? 'No structured event details found on that page.');
      setUrl(record.url);
      setResearchSources(result.sources ?? []);
      fill(record);
      if (result.error) setMessage(result.error);
    } catch (e) {
      setError(`Could not pull event details: ${(e as Error).message}`);
    } finally { setBusy(false); }
  };
  const add = () => {
    setError('');
    let parsed: URL;
    try { parsed = new URL(url); } catch { setError('Add the event page link first.'); return; }
    if (parsed.protocol !== 'https:' || !['luma.com', 'www.luma.com'].includes(parsed.hostname.toLowerCase()) || !title.trim() || !location.trim() || !start || !end || !Number.isFinite(Date.parse(start)) || !Number.isFinite(Date.parse(end)) || Date.parse(end) <= Date.parse(start)) {
      setError('Check the Luma link, event name, venue, start time and end time.'); return;
    }
    const slugPart = parsed.pathname.split('/').filter(Boolean).at(-1)!.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 80) || 'event';
    const imported = !detailsEdited && importedSource?.url === parsed.toString() ? importedSource : null;
    const timezone = importedTimezone ?? (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
    const record: ExternalEventRecord = {
      id: `luma:${slugPart}`, conference: 'external', sourceRecordId: slugPart,
      title: title.trim(), summary: summary.trim() || undefined,
      start: eventDateTimeToIso(start, timezone) ?? new Date(start).toISOString(), end: eventDateTimeToIso(end, timezone) ?? new Date(end).toISOString(),
      timezone, location: location.trim(),
      speakers: [], topics: [], sessionType: 'Event', url: parsed.toString(), catalogs: ['quest'],
      source: imported ?? { url: parsed.toString(), retrievedAt: new Date().toISOString(), via: 'manual-browser', status: 'unconfirmed', note: 'Details entered or edited by the user; verify against the linked event page.' },
    };
    ctx.openTravel(record);
    setMessage(`Review commute options for “${record.title}”, then add it to your schedule.`);
  };
  const search = async () => {
    setError(''); setSearchResults([]);
    if (!ctx.backend.eventSearch) { setError('Live search needs the OpenAI API key on the local server.'); return; }
    if (query.trim().length < 2) { setError('Enter at least two characters to search.'); return; }
    setSearching(true);
    try {
      const result = await ctx.backend.eventSearch(query.trim());
      if (result.status !== 'ok') throw new Error(result.error ?? 'No cited event results found.');
      setSearchResults(result.events);
    } catch (e) { setError((e as Error).message); }
    finally { setSearching(false); }
  };

  return <section className="card stack" aria-labelledby="live-events-h">
    <div className="between"><div><h2 id="live-events-h">Find a real event</h2><p className="small muted">Search what’s happening, check the route, then add a stop.</p></div><span className={`badge ${ctx.backend.eventSearch ? 'accent' : ''}`}>{ctx.backend.eventSearch ? 'Live search' : 'Manual import'}</span></div>
    <label className="field"><span className="small">What are you looking for?</span><input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void search()} placeholder="AI meetup, hackathon, hiring event…" /></label>
    <button className="btn small" disabled={searching || query.trim().length < 2} onClick={() => void search()}>{searching ? 'Searching live sources…' : 'Search Bay Area events'}</button>
    <a className="btn ghost small" href="https://luma.com/sf" target="_blank" rel="noopener noreferrer">Browse Luma ↗</a>
    {!!searchResults.length && <div className="stack" aria-label="Live event results">{searchResults.map((event) => <article className="card soft stack" key={event.url}>
      <div className="between"><strong>{event.title}</strong><a href={event.url} target="_blank" rel="noopener noreferrer">Open page ↗</a></div>
      <p className="small muted">{[event.start, event.location].filter(Boolean).join(' · ') || 'Date and venue not established; open the event page to check.'}</p>
      {event.summary && <p className="small">{event.summary}</p>}
      <button className="btn ghost small" onClick={() => { formRevision.current += 1; setUrl(event.url); setTitle(''); setStart(''); setEnd(''); setLocation(''); setSummary(''); setImportedSource(null); setImportedTimezone(null); setDetailsEdited(false); setResearchSources(event.sources); setError(''); }}>Use this event</button>
    </article>)}</div>}
    <label className="field"><span className="small">Luma event link</span><input type="url" value={url} onChange={(e) => { formRevision.current += 1; setUrl(e.target.value); setImportedSource(null); setImportedTimezone(null); }} placeholder="https://luma.com/your-event" /></label>
    <div className="row"><button className="btn small" disabled={busy || !url} onClick={pull}>{busy ? 'Pulling event details…' : 'Pull details from event page'}</button>{url && <a className="btn ghost small" href={url} target="_blank" rel="noopener noreferrer">Open event page ↗</a>}</div>
    <p className="tiny muted">{ctx.backend.mode === 'live' ? 'Live search uses OpenAI web search; Bright Data reads event pages first, with OpenAI as a fallback. AI-assisted details stay unconfirmed.' : 'Cached app: event details can be entered manually and will be marked unconfirmed.'}</p>
    {!!researchSources.length && <div className="small stack" aria-label="Research sources"><strong>Sources to check</strong>{researchSources.map((s) => <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer">{s.title} ↗</a>)}</div>}
    <details>
      <summary style={{ cursor: 'pointer', fontWeight: 700 }}>Review or enter event details</summary>
      <div className="stack" style={{ marginTop: 10 }}>
        <label className="field"><span className="small">Event name</span><input value={title} onChange={(e) => { formRevision.current += 1; setTitle(e.target.value); setDetailsEdited(true); }} /></label>
        <div className="row"><label className="field"><span className="small">Starts</span><input type="datetime-local" value={start} onChange={(e) => { formRevision.current += 1; setStart(e.target.value); setDetailsEdited(true); }} /></label><label className="field"><span className="small">Ends</span><input type="datetime-local" value={end} onChange={(e) => { formRevision.current += 1; setEnd(e.target.value); setDetailsEdited(true); }} /></label></div>
        <label className="field"><span className="small">Venue / address</span><input value={location} onChange={(e) => { formRevision.current += 1; setLocation(e.target.value); setDetailsEdited(true); }} /></label>
        <label className="field"><span className="small">What’s happening? (optional)</span><textarea value={summary} onChange={(e) => { formRevision.current += 1; setSummary(e.target.value); setDetailsEdited(true); }} /></label>
        <button className="btn primary" disabled={!title || !location || !start || !end} onClick={add}>Review commute &amp; add</button>
      </div>
    </details>
    {message && <p className="notice" role="status">{message}</p>}{error && <p className="error" role="alert">{error}</p>}
  </section>;
}

function SpeakerAvatar({ name, photoUrl }: { name: string; photoUrl?: string }) {
  const [failed, setFailed] = useState(false);
  return photoUrl && !failed
    ? <img className="speaker-photo" src={photoUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
    : <span className="speaker-photo speaker-fallback" aria-hidden="true">{name.split(/\s+/).map((n) => n[0]).slice(0, 2).join('').toUpperCase()}</span>;
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
  const liveIds = new Set((ps.liveEvents ?? []).map((s) => s.id));
  const mine = ps.schedule.filter((s) => s.eventId.startsWith(`${ctx.conference}:`) || liveIds.has(s.eventId));
  const days = [...new Set(mine.map((s) => localOf(s.start).slice(0, 10)))].sort();
  const [day, setDay] = useState<string | undefined>(days[0]);
  const activeDay = day && days.includes(day) ? day : days[0];
  const items = mine.filter((s) => localOf(s.start).slice(0, 10) === activeDay);
  const past = items.length > 0 && items.every((s) => Date.parse(s.end) <= Date.parse(now));
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
          <div className="segmented" role="tablist" onKeyDown={navigateTabs} aria-label="Day">
            {days.map((d) => (
              <button key={d} role="tab" aria-selected={d === activeDay} tabIndex={d === activeDay ? 0 : -1} onClick={() => setDay(d)}>
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
      {past && items.length > 0 && items.every((s) => s.eventId.startsWith('wad26na:')) && <p className="tiny muted">Fictional demo history from a finished conference. Sessions are real listings; attendance and the meeting are made up for the demo, and nothing sends reminders.</p>}
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
          <div className="between prep-row">
            <span className="small">
              <b>Get ready:</b> {prep.main}
            </span>
            <button className="btn small" aria-pressed={done} onClick={() => ctx.update((p) => ({ ...p, prepDone: { ...p.prepDone, [item.eventId]: !done } }))}>
              {done ? '✓ Prep complete' : 'Mark prep complete'}
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
        {!ended && ctx.sessions.find((s) => s.id === item.eventId)?.conference === 'external' && (
          <button className="btn small" onClick={() => ctx.openTravel(ctx.sessions.find((s) => s.id === item.eventId)!)}>Getting there</button>
        )}
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
  const [customPerson, setCustomPerson] = useState('');
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
            {people.length === 0 && <p className="small muted">Add the person you met. This private note stays in this browser profile.</p>}
            {people.map((p) => (
              <label key={p.id} className="row small" style={{ minHeight: 44 }}>
                <input type="radio" name="who" value={p.id} checked={who === p.id} onChange={() => setWho(p.id)} />
                {p.name} <span className="muted">{p.detail}</span>
              </label>
            ))}
          </fieldset>
          {people.length === 0 && <label className="field"><span className="small">Name</span><input value={customPerson} maxLength={120} onChange={(e) => setCustomPerson(e.target.value)} placeholder="Who did you meet?" /></label>}
          <label className="field">
            <span className="small">Private note (optional)</span>
            <textarea value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="What did you talk about?" />
          </label>
          {ctx.ps.profile.fictional && <p className="tiny muted">Demo profile: this meeting is fictional and labeled as such.</p>}
          <button
            className="btn primary"
            disabled={people.length ? !who : !customPerson.trim()}
            onClick={() => {
              const selected = people.find((x) => x.id === who);
              const name = selected?.name ?? customPerson.trim();
              onSubmit('met', { id: selected?.id ?? personId(name), name }, note.trim() || undefined);
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
  const meetings = ctx.meetings.filter((m) => m.eventId.startsWith(`${ctx.conference}:`) || (m.eventId.startsWith('luma:') && (ctx.ps.liveEvents ?? []).some((event) => event.id === m.eventId)));
  const metIds = new Set(meetings.map((m) => m.personId));
  const want = new Map<string, { name: string; detail: string; why: string; photoUrl?: string }>();
  const addPerson = (s: EventRecord, why: string) =>
    s.speakers.forEach((sp) => {
      const id = personId(sp.name, sp.company);
      if (!metIds.has(id) && !want.has(id)) {
        const goalReason = s.topics.some((topic) => ctx.ps.profile.interests.some((interest) => topic.toLowerCase().includes(interest.toLowerCase()) || interest.toLowerCase().includes(topic.toLowerCase())))
          ? `Matches your ${ctx.ps.profile.goals.map((g) => GOAL_LABELS[g]).join(' and ')} goals`
          : why;
        want.set(id, { name: sp.name, detail: [sp.title, sp.company].filter(Boolean).join(', '), why: `${goalReason}: ${s.title}`, photoUrl: sp.photoUrl });
      }
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
        <div className="segmented" role="tablist" onKeyDown={navigateTabs} aria-label="People lists">
          <button role="tab" aria-selected={tab === 'want'} tabIndex={tab === 'want' ? 0 : -1} onClick={() => setTab('want')}>
            Want to meet
          </button>
          <button role="tab" aria-selected={tab === 'met'} tabIndex={tab === 'met' ? 0 : -1} onClick={() => setTab('met')}>
            Met ({meetings.length})
          </button>
        </div>
      </div>
      <p className="tiny muted">Public facts come from the conference catalog. Being listed is not attendance or availability.</p>
      {tab === 'want' &&
        (want.size ? (
          [...want].map(([id, p]) => (
            <button key={id} className="card stack" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => ctx.openPerson(id)}>
              <div className="row"><SpeakerAvatar name={p.name} photoUrl={p.photoUrl} /><b>{p.name}</b></div>
              <span className="small muted">{p.detail}</span>
              <span className="small">{p.why}</span>
            </button>
          ))
        ) : (
          <p className="card soft">Add sessions or pick goals to see people worth meeting.</p>
        ))}
      {tab === 'met' &&
        (meetings.length ? (
          meetings.map((m) => (
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
    ? `Hi ${first},\n\nThanks for the conversation after “${ctx.sessions.find((s) => s.id === meeting.eventId)?.title ?? 'your session'}” at ${CONFERENCES[ctx.conference].name}.${meeting.note ? ` I appreciated what you shared about ${meeting.note.replace(/\.$/, '')}.` : ''} I’m an early-career developer working with React and Python and exploring AI tools, and I’d love to stay in touch.${myLink ? `\n\nMy work: ${myLink}` : ''}\n\n— ${ctx.ps.profile.name || 'Me'}`
    : '';
  const fu = ctx.ps.followups[draftKey];
  const [draft, setDraft] = useState(fu?.text ?? defaultDraft);
  const [copied, setCopied] = useState(false);
  const note = ctx.ps.notes[id] ?? '';
  return (
    <Sheet title={sp?.name ?? meeting?.personName ?? 'Person'} onClose={onClose}>
      <section className="card stack">
        <h3>Public professional profile</h3>
        {sp?.photoUrl && <img className="speaker-photo profile-photo" src={sp.photoUrl} alt={`${sp.name} profile`} referrerPolicy="no-referrer" />}
        <p className="small">
          {sp?.title ?? 'Title not listed'} · {sp?.company ?? 'Company not listed'}
        </p>
        <p className="small">Conference presence: listed speaker for {sessions.map((s) => `${s.title} (${fmtDay(s.start)} ${fmtTime(s.start)})`).join('; ') || '—'}</p>
        <LinkedInLine id={id} />
        <p className="tiny muted">Listing does not mean they attended or are available.</p>
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
// Achievements, profile and QR

export function AchievementsSheet({ ps, onClose, onToggleAccessory, onCustomize }: { ps: PState; onClose: () => void; onToggleAccessory: () => void; onCustomize: () => void }) {
  const unlocked = unlockedAccessories(ps.rewards).includes(ACCESSORY.id);
  const count = (s: Badge) => ps.rewards.awards.filter((a) => a.badge === s);
  return (
    <Sheet title="Achievements" onClose={onClose}>
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
      <div className="badge-grid">
        {([
          ['explorer', '🧭', 'Explore a booth or event'],
          ['connection', '🤝', 'Meet someone new'],
          ['follow-through', '✨', 'Prepare, apply or follow up'],
        ] as Array<[Badge, string, string]>).map(([s, icon, hint]) => (
          <div key={s} className={`badge-item ${count(s).length ? 'got pop' : ''}`}>
            <span aria-hidden="true" className="badge-emoji">{icon}</span>
            <b>{BADGE_TEXT[s]}</b>
            <span className="small">{count(s).length ? `Earned ×${count(s).length}` : `Ready to earn · ${hint}`}</span>
          </div>
        ))}
      </div>
      <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
        {ps.rewards.awards.map((a) => (
          <li key={a.id}>
            {BADGE_TEXT[a.badge]} — {a.label}
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
      <p className="tiny muted">Badges reflect self-confirmed actions and can be reversed. No points, streaks, spending or prize rewards.</p>
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
          <div className="segmented" role="tablist" onKeyDown={navigateTabs} aria-label="Link to share">
            {available.map((k) => (
              <button key={k} role="tab" aria-selected={k === kind} tabIndex={k === kind ? 0 : -1} onClick={() => setKind(k)}>
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

export function TravelSheet({ ctx, session, onClose }: { ctx: Ctx; session: EventRecord; onClose: () => void }) {
  return session.conference === 'external'
    ? <ExternalTravelSheet key={session.id} ctx={ctx} session={session} onClose={onClose} />
    : <ConferenceTravelSheet key={session.id} ctx={ctx} session={session} onClose={onClose} />;
}

function ConferenceTravelSheet({ ctx, session, onClose }: { ctx: Ctx; session: SessionRecord; onClose: () => void }) {
  const travel = compareTravel([{ eventId: session.id, start: session.start, end: session.end }], ctx.ps.profile.budgetCents);
  const scheduled = isScheduled(ctx, session.id);
  const [route, setRoute] = useState<string | undefined>(ctx.ps.travelChoice);
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
      <p className="small">
        <b>Choose a route (optional)</b> — it sets your leave-by time and travel cost on Schedule.
      </p>
      {travel && <TravelOptions travel={travel} chosenId={route} onChoose={(id) => setRoute(route === id ? undefined : id)} origin={ctx.ps.profile.origin} budgetCents={ctx.ps.profile.budgetCents} />}
      <button
        className="btn primary"
        disabled={scheduled}
        onClick={() => {
          if (route) ctx.update((p) => ({ ...p, travelChoice: route }));
          ctx.add(session);
          onClose();
        }}
      >
        {scheduled ? 'On your schedule' : route ? `Add to Schedule with ${travel?.options.find((o) => o.id === route)?.name ?? 'this route'}` : 'Add event to Schedule'}
      </button>
    </Sheet>
  );
}

function ExternalTravelSheet({ ctx, session, onClose }: { ctx: Ctx; session: ExternalEventRecord; onClose: () => void }) {
  const destination = session.location ?? '';
  const origin = ctx.ps.profile.origin || 'San Leandro Marina, CA';
  const url = (mode: 'driving' | 'transit') => `https://www.google.com/maps/dir/?api=1&${new URLSearchParams({ origin, destination, travelmode: mode })}`;
  const parking = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`parking near ${destination}`)}`;
  const [mode, setMode] = useState<'driving' | 'transit' | undefined>();
  const scheduled = isScheduled(ctx, session.id);
  return <Sheet title="Getting there" onClose={onClose}>
    <div className="stack">
      <p><b>{session.title}</b><br /><span className="small muted">{fmtRange(session.start, session.end)} · {destination}</span></p>
      <p className="notice">Live route choices open Google Maps for current directions. Ezcon has no verified fare, drive time or parking price for this venue yet.</p>
      <a className="btn" href={url('transit')} target="_blank" rel="noopener noreferrer" onClick={() => setMode('transit')}>Transit directions ↗</a>
      <a className="btn" href={url('driving')} target="_blank" rel="noopener noreferrer" onClick={() => setMode('driving')}>Driving directions ↗</a>
      <a className="btn" href={parking} target="_blank" rel="noopener noreferrer">Find nearby parking ↗</a>
      <SourceLine source={session.source} label="Event details" />
      <p className="tiny muted">Origin: {origin}. Set a different home area in your profile to update these links. Check event times, parking signs and prices before you leave.</p>
      <button className="btn primary" disabled={scheduled} onClick={() => { if (mode) ctx.update((p) => ({ ...p, travelChoice: `live-${mode}` })); ctx.add(session); onClose(); }}>
        {scheduled ? 'On your schedule' : 'Add event to Schedule'}
      </button>
    </div>
  </Sheet>;
}

function LinkedInLine({ id }: { id: string }) {
  const m = (PEOPLE_LINKS as Record<string, { status: string; url?: string; checkedAt: string }>)[id];
  if (!m) return <p className="tiny muted">LinkedIn: not looked up yet.</p>;
  if (m.status !== 'found' || !m.url) return <p className="tiny muted">LinkedIn: no public profile matched both name and company (Bright Data search via TrueForge, {fmtStamp(m.checkedAt)}).</p>;
  return (
    <p className="small">
      <a className="btn small" href={m.url} target="_blank" rel="noopener noreferrer">
        LinkedIn profile ↗
      </a>{' '}
      <span className="tiny muted">Public search match on name + company (Bright Data via TrueForge, {fmtStamp(m.checkedAt)}). Confirm it’s the right person before connecting.</span>
    </p>
  );
}

/** A finished event: only what is still actionable — open roles at its companies and follow-ups. */
function PastExplore(ctx: Ctx) {
  const companies = [...new Set(ctx.sessions.flatMap((s) => s.speakers.map((sp) => sp.company).filter((c): c is string => !!c)))].sort();
  const roles = ROLES.filter((r) => r.status === 'open' && companies.some((c) => slug(c) === slug(r.company)));
  const met = ctx.meetings.filter((m) => ctx.sessions.some((s) => s.id === m.eventId));
  const applied = (ctx.ps.applications ?? []).filter((a) => ctx.sessions.some((s) => s.id === a.eventId));
  return (
    <div className="stack">
      <p className="notice">Past event · replay. Its sessions are over; they stay on Schedule as history.</p>
      <section className="stack" aria-labelledby="past-roles-h">
        <h2 id="past-roles-h">Open roles at companies from this event</h2>
        {roles.length ? (
          roles.map((r) => (
            <article key={r.id} className="card career stack">
              <span className="badge good">Open role · checked {fmtStamp(r.checkedAt)}</span>
              <h3>{r.title}</h3>
              <p className="small muted">{r.company} · {r.location}</p>
              <a className="btn career small" href={r.applyUrl} target="_blank" rel="noopener noreferrer">View role &amp; apply ↗</a>
            </article>
          ))
        ) : (
          <p className="card soft small">No verified open roles yet at {companies.join(', ')}. ezcon only shows roles checked on the employer’s own careers site.</p>
        )}
      </section>
      <section className="stack" aria-labelledby="past-apps-h">
        <h2 id="past-apps-h">Your applications from this event</h2>
        {applied.length ? (
          applied.map((a) => (
            <article key={a.roleId} className="card between">
              <span>
                <b>{a.title}</b>
                <br />
                <span className="small muted">
                  {a.company} · marked applied {fmtStamp(a.appliedAt)} · linked to {ctx.sessions.find((s) => s.id === a.eventId)?.title}
                </span>
              </span>
              {a.fictional ? <span className="badge">No application was submitted</span> : <a className="btn small" href={a.applyUrl} target="_blank" rel="noopener noreferrer">Listing ↗</a>}
            </article>
          ))
        ) : (
          <p className="card soft small">No applications logged from this event. Use “Mark as applied” on a hiring connection; ezcon never applies for you.</p>
        )}
      </section>
      <section className="stack" aria-labelledby="past-follow-h">
        <h2 id="past-follow-h">Follow up</h2>
        {met.length ? (
          met.map((m) => (
            <button key={m.meetingId} className="card between" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => ctx.openPerson(m.personId)}>
              <span>
                <b>{m.personName}</b>
                <br />
                <span className="small muted">{ctx.ps.followups[m.meetingId]?.done ? 'Follow-up drafted' : 'Draft a follow-up'}</span>
              </span>
              <span className="btn small">Open</span>
            </button>
          ))
        ) : (
          <p className="card soft small">No meetings recorded at this event.</p>
        )}
      </section>
      <ResearchPanel ctx={ctx} />
    </div>
  );
}

function AppliedToggle({ ctx, h }: { ctx: Ctx; h: HiringConnection }) {
  const applied = (ctx.ps.applications ?? []).some((a) => a.roleId === h.role.id);
  return (
    <button
      className="btn small"
      aria-pressed={applied}
      onClick={() =>
        ctx.update((p) => ({
          ...p,
          applications: applied
            ? (p.applications ?? []).filter((a) => a.roleId !== h.role.id)
            : [...(p.applications ?? []), { roleId: h.role.id, title: h.role.title, company: h.role.company, applyUrl: h.applyUrl, eventId: h.session.id, appliedAt: new Date().toISOString() }],
        }))
      }
    >
      {applied ? '✓ Applied' : 'Mark as applied'}
    </button>
  );
}

/** Shrink a photo to a small JPEG data URL so it fits in browser storage. Stays on this device. */
async function shrinkPhoto(file: File, max = 480): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.7);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function eventLocalDateTime(iso: string | undefined, timezone: string) {
  if (!iso) return '';
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(iso));
  const value = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return `${value('year')}-${value('month')}-${value('day')}T${value('hour')}:${value('minute')}`;
}

function eventDateTimeToIso(value: string, timezone: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return undefined;
  const [, y, mo, d, h, mi] = match;
  const wanted = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi));
  let guess = wanted;
  for (let i = 0; i < 3; i++) {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(guess));
    const part = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
    guess += wanted - Date.UTC(part('year'), part('month') - 1, part('day'), part('hour'), part('minute'));
  }
  return new Date(guess).toISOString();
}

export function RaffleSection(ctx: Ctx) {
  const quests = SIDE_QUESTS.filter((x) => x.conference === ctx.conference);
  if (!quests.length) return <p className="card soft small">No sourced raffles for this conference.</p>;
  return (
    <section className="stack" aria-labelledby="raffle-h">
      <div className="section-title">
        <h2 id="raffle-h">Raffles</h2>
        <span className="tiny muted">Optional · prizes never count toward your budget</span>
      </div>
      {quests.map((q) => <RaffleCard key={q.id} q={q} ctx={ctx} />)}
      {ctx.conference === 'wad26na' && (
        <section className="stack" aria-labelledby="past-goodies-h">
          <div className="section-title">
            <h2 id="past-goodies-h">Past giveaways</h2>
            <span className="tiny muted">Listed in the event app</span>
          </div>
          <p className="tiny muted">Historical listings only; availability and giveaway conditions were not shown in the catalog.</p>
          <ul className="goodies-list">
            {WAD_GOODIES.map((item) => <li key={`${item.host}:${item.name}`}><b>{item.name}</b><span>{item.host}</span></li>)}
          </ul>
          <SourceLine source={WAD_GOODIES_SOURCE} label="Event app catalog" />
        </section>
      )}
    </section>
  );
}

function RaffleCard({ q, ctx }: { q: SideQuest; ctx: Ctx }) {
  const saved = (ctx.ps.raffleTickets ?? []).find((t) => t.questId === q.id);
  const [photo, setPhoto] = useState<string | undefined>(saved?.photo);
  const [number, setNumber] = useState(saved?.number ?? '');
  const [error, setError] = useState<string>();
  const [permission, setPermission] = useState(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);
  const saveDraft = (fields: { number?: string; photo?: string }) => ctx.update((p) => {
    const old = (p.raffleTickets ?? []).find((t) => t.questId === q.id);
    const next = { questId: q.id, number: fields.number ?? old?.number ?? '', photo: fields.photo ?? old?.photo, savedAt: old?.savedAt ?? new Date().toISOString(), remindAt: old?.remindAt, drawAt: old?.drawAt, remindedAt: old?.remindedAt };
    return { ...p, raffleTickets: [...(p.raffleTickets ?? []).filter((t) => t.questId !== q.id), next] };
  });
  const updateReminder = (field: 'remindAt' | 'drawAt', value: string) => ctx.update((p) => ({
    ...p,
    raffleTickets: (p.raffleTickets ?? []).map((t) => {
      if (t.questId !== q.id) return t;
      if (!value) return { ...t, [field]: undefined, remindedAt: undefined };
      const selected = eventDateTimeToIso(value, CONFERENCES[q.conference].timezone);
      if (!selected) return t;
      const remindAt = field === 'drawAt' ? new Date(Date.parse(selected) - 15 * 60_000).toISOString() : selected;
      return { ...t, [field]: selected, remindAt, remindedAt: undefined };
    }),
  }));
  return (
    <article className="card stack">
      <div className="between">
        <h3>{q.title}</h3>
        {q.historical && <span className="badge">Past event · replay</span>}
      </div>
      <p className="small muted">{q.prize} · {q.host} · {q.where}</p>
      {q.draw && <p className="small"><b>Draw:</b> {q.draw}.</p>}
      <p className="small">How to enter: {q.entry}</p>
      <p className="tiny muted">Still unknown: {q.unknowns.join('; ')}.</p>
      {q.sampleTicket && (
        <div className="sample-ticket" aria-label="Fictional sample ticket">
          <span aria-hidden="true">🎟️</span>
          <span><b>Fictional sample ticket · {q.sampleTicket}</b><br /><small>No real entry, reminder or reward is recorded.</small></span>
        </div>
      )}
      {q.historical ? null : <>
        {saved && <div className="between"><span className="small"><b>Ticket saved</b> · {saved.number ? `#${saved.number}` : 'photo saved'} · {fmtStamp(saved.savedAt)}</span><button className="btn ghost small" onClick={() => ctx.update((p) => ({ ...p, raffleTickets: (p.raffleTickets ?? []).filter((t) => t.questId !== q.id) }))}>Remove</button></div>}
        <RaffleTicketForm q={q} photo={photo} number={number} error={error}
          setPhoto={(v) => { setPhoto(v); if (v) saveDraft({ photo: v }); }}
          setNumber={(v) => { setNumber(v); if (v) saveDraft({ number: v }); }} setError={setError} />
        {saved && <section className="card soft stack" aria-label="Raffle reminder">
          <b>Set a reminder</b>
          <p className="tiny muted">Choose the reminder time, or enter the raffle draw time and ezcon will remind you 15 minutes before. Enter times in {CONFERENCES[q.conference].timezone}.</p>
          <label className="field"><span className="small">Remind me at</span><input type="datetime-local" aria-label={`Reminder time for ${q.title}`} value={eventLocalDateTime(saved.remindAt, CONFERENCES[q.conference].timezone)} onChange={(e) => updateReminder('remindAt', e.target.value)} /></label>
          <label className="field"><span className="small">Raffle draw time (optional)</span><input type="datetime-local" aria-label={`Draw time for ${q.title}`} value={eventLocalDateTime(saved.drawAt, CONFERENCES[q.conference].timezone)} onChange={(e) => updateReminder('drawAt', e.target.value)} /></label>
          {saved.remindAt && <p className="small">Reminder set for {fmtStamp(saved.remindAt)}{saved.remindedAt ? ' · delivered' : permission === 'granted' ? ' · system alert while ezcon is open' : ' · open ezcon at that time'}</p>}
          {permission === 'granted' ? <p className="tiny">System notifications allowed</p> : permission === 'unsupported' ? <p className="tiny muted">This browser does not support system alerts; the reminder will appear in ezcon.</p> : permission === 'denied' ? <p className="tiny muted">System notifications are blocked in site settings. The reminder can still appear in ezcon when it is open.</p> : <button className="btn small" onClick={async () => { const result = await Notification.requestPermission(); setPermission(result); }}>{saved.remindAt ? 'Allow system notifications' : 'Enable browser alerts'}</button>}
        </section>}
      </>}
      <SourceLine source={q.source} />
    </article>
  );
}

function RaffleTicketForm({ q, photo, number, error, setPhoto, setNumber, setError }: {
  q: SideQuest; photo?: string; number: string; error?: string;
  setPhoto: (value?: string) => void; setNumber: (value: string) => void; setError: (value?: string) => void;
}) {
  return (
    <div className="stack" style={{ gap: 8 }}>
      <label className="btn small" style={{ width: 'fit-content' }}>
        {photo ? 'Retake photo' : 'Snap ticket photo'}
        <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          try { setPhoto(await shrinkPhoto(f)); setError(undefined); }
          catch { setError('Couldn’t read that photo. Try another one.'); }
        }} />
      </label>
      {photo && <img src={photo} alt="Ticket photo preview" style={{ width: 120, borderRadius: 12 }} />}
      <label className="field"><span className="small">Ticket number (check it against the photo)</span>
        <input inputMode="numeric" value={number} maxLength={20} onChange={(e) => setNumber(e.target.value.replace(/[^0-9A-Za-z-]/g, ''))} />
      </label>
      {error && <p className="error">{error}</p>}
      <p className="tiny muted">Your number and photo save automatically on this device. Keep ticket photos out of recordings; they may contain barcodes.</p>
    </div>
  );
}
