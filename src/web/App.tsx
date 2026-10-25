import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Candidate, GraphPath, Meeting } from '../domain/graph-types';
import type { ConferenceId, EventRecord, Goal, SessionRecord } from '../domain/types';
import { rankRecommendations } from '../domain/recommend';
import { hiringConnections } from '../domain/careers';
import { addItem, defaultBuffer, removeItem, resolveConflict, type Conflict, type ScheduleItem } from '../domain/schedule';
import { award, emptyRewards, type RewardState } from '../domain/rewards';
import { BLANK_PROFILE, CONFERENCES, DEMO_CLOCKS, DEMO_PAST, DEMO_PROFILE, ROLES, SESSIONS, SIDE_QUESTS, type DemoProfile } from '../data/demo';
import { personId } from '../domain/ids';
import { connectBackend, type Backend } from './backend';
import { clearAll, load, profileKey, save } from './store';
import { Companion } from './Companion';
import { SponsorActivity } from './SponsorActivity';
import { checkinAfterUndo, meetingIdFor } from './checkins';
import { Icon, type IconName } from './Icon';
import { HeaderSearch } from './HeaderSearch';
import { toScheduleItem } from '../domain/recommend';
import { Sheet, Toast } from './ui';
import {
  AchievementsSheet, CheckInSheet, ConflictSheet, Explore, People, PersonSheet, ProfileSheet, QrSheet, Schedule, Today, TravelSheet, WhySheet,
  type CheckIn, type Ctx, type PState,
} from './screens';

type Tab = 'today' | 'discover' | 'schedule' | 'people';
type SheetState =
  | { kind: 'why'; title: string; paths: GraphPath[]; note?: string }
  | { kind: 'conflict'; item: ScheduleItem; conflicts: Conflict[] }
  | { kind: 'checkin'; item: ScheduleItem }
  | { kind: 'person'; id: string }
  | { kind: 'travel'; session: EventRecord }
  | { kind: 'qr' | 'profile' | 'menu' | 'achievements' }
  | null;

// The demo profile starts with a fictional, already-finished day at WAD 2026 so the past
// event reads as history: attended talks, one skipped, one remembered meeting.
const demoHistory = () => {
  const wad = SESSIONS.wad26na;
  const schedule = DEMO_PAST.map((p) => wad.find((s) => s.id === p.eventId)).filter((s) => !!s).map(toScheduleItem);
  const checkins = Object.fromEntries(DEMO_PAST.map((p) => [p.eventId, p.checkin]));
  return { schedule, checkins };
};

const fresh = (profile: DemoProfile): PState => ({
  profile,
  ...(profile.id === DEMO_PROFILE.id ? {
    ...demoHistory(),
    applications: [{ roleId: 'wad26na:1917:docker-demo-role', title: 'Software Engineer · Docker (fictional demo application)', company: 'Docker', applyUrl: 'https://www.docker.com/careers/', eventId: 'wad26na:1917', appliedAt: '2026-09-23T15:00:00-07:00', fictional: true }],
  } : { schedule: [], checkins: {} }),
  seeded: profile.id !== DEMO_PROFILE.id,
  rewards: emptyRewards(),
  prepDone: {},
  notes: {},
  followups: {},
  accessoryOn: true,
  visited: [],
});


/** Badges are derived from confirmed actions, so duplicates are impossible and undo reverses them. */
function deriveRewards(ps: PState, meetings: Meeting[], sessions: Record<string, string>): RewardState {
  let r = emptyRewards();
  for (const [eventId, c] of Object.entries(ps.checkins)) {
    if (c === 'went' || c === 'met') r = award(r, 'explorer', `visit:${eventId}`, `Went to ${sessions[eventId] ?? 'an event'} (self-reported)`);
  }
  for (const a of ps.applications ?? []) r = award(r, 'follow-through', `applied:${a.roleId}`, `Applied to ${a.title} at ${a.company} (self-reported${a.fictional ? ', fictional demo' : ''})`);
  for (const t of ps.raffleTickets ?? []) r = award(r, 'explorer', `raffle:${t.questId}`, `Entered the ${SIDE_QUESTS.find((q) => q.id === t.questId)?.title ?? 'raffle'} (self-reported)`);
  for (const id of ps.visited) r = award(r, 'explorer', `booth:${id}`, `Visited ${SIDE_QUESTS.find((q) => q.id === id)?.title ?? 'a booth'} (self-reported)`);
  for (const m of meetings) {
    r = award(r, 'connection', `meeting:${m.meetingId}`, `Met ${m.personName}${m.fictional ? ' (fictional demo)' : ''}`);
    if (ps.followups[m.meetingId]?.done) r = award(r, 'follow-through', `followup:meeting:${m.meetingId}`, `Follow-up drafted for ${m.personName}`);
  }
  for (const [eventId, done] of Object.entries(ps.prepDone)) if (done) r = award(r, 'follow-through', `prep:${eventId}`, `Got ready for ${sessions[eventId] ?? 'an event'}`);
  return r;
}

export function App() {
  const [backend, setBackend] = useState<Backend>();
  const [activeId, setActiveId] = useState<string | undefined>(() => load<string>('active'));
  const [clockId, setClockId] = useState<string>(() => load<string>('clock') ?? 'real');
  const [conference, setConference] = useState<ConferenceId>(() => load<ConferenceId>('conference') ?? 'universe26');
  const [tab, setTab] = useState<Tab>('today');
  const [exploreSection, setExploreSection] = useState<'quests' | 'side-quests'>('quests');
  const [sheet, setSheet] = useState<SheetState>(null);
  const [toast, setToast] = useState<{ message: string; action?: string; onAction?: () => void }>();
  const [ps, setPs] = useState<PState>();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [hiringPaths, setHiringPaths] = useState<GraphPath[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [roles, setRoles] = useState(ROLES);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState<string>();

  useEffect(() => {
    connectBackend().then(setBackend, (e) => setError(String(e)));
  }, []);

  useEffect(() => {
    // Graph data belongs to one profile; never show the previous profile's while the new one loads.
    setCandidates([]);
    setHiringPaths([]);
    setMeetings([]);
    if (!activeId) return setPs(undefined);
    const base = activeId === DEMO_PROFILE.id ? DEMO_PROFILE : BLANK_PROFILE;
    const stored = load<PState>(profileKey(activeId, 'state'));
    setPs(stored ? {
      ...fresh(base),
      ...stored,
      // Keep demo networking links current while preserving the user's other saved demo state.
      profile: activeId === DEMO_PROFILE.id
        ? { ...stored.profile, links: { ...stored.profile.links, github: DEMO_PROFILE.links.github, linkedin: DEMO_PROFILE.links.linkedin } }
        : stored.profile,
    } : fresh(base));
  }, [activeId]);

  const update = useCallback(
    (fn: (p: PState) => PState) =>
      setPs((prev) => {
        if (!prev) return prev;
        const next = fn(prev);
        save(profileKey(next.profile.id, 'state'), next);
        return next;
      }),
    [],
  );

  // Local raffle reminders use the browser notification API while ezcon is open. If the
  // app was closed or a background timer was throttled, deliver once when it resumes.
  const raffleReminderKey = JSON.stringify((ps?.raffleTickets ?? []).map((t) => [t.questId, t.remindAt, t.remindedAt]));
  useEffect(() => {
    if (!ps) return;
    const cleanups: Array<() => void> = [];
    for (const ticket of ps.raffleTickets ?? []) {
      if (!ticket.remindAt || ticket.remindedAt) continue;
      const dueAt = Date.parse(ticket.remindAt);
      if (!Number.isFinite(dueAt)) continue;
      let timer: number | undefined;
      let fired = false;
      const cancel = () => {
        fired = true;
        if (timer !== undefined) window.clearTimeout(timer);
        document.removeEventListener('visibilitychange', checkWhenVisible);
      };
      const fire = () => {
        if (fired) return;
        fired = true;
        document.removeEventListener('visibilitychange', checkWhenVisible);
        update((current) => ({
          ...current,
          raffleTickets: (current.raffleTickets ?? []).map((item) => item.questId === ticket.questId && item.remindAt === ticket.remindAt && !item.remindedAt ? { ...item, remindedAt: new Date().toISOString() } : item),
        }));
        const title = SIDE_QUESTS.find((q) => q.id === ticket.questId)?.title ?? 'your raffle';
        setToast({ message: `Raffle reminder: ${title}`, action: 'Open Explore', onAction: () => setTab('discover') });
        try {
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            const notification = new Notification('ezcon raffle reminder', { body: `Check the draw for ${title}.` });
            notification.onclick = () => window.focus();
          }
        } catch {
          // In-app reminder remains available when system notifications are unsupported.
        }
      };
      function checkWhenVisible() {
        if (!document.hidden && Date.now() >= dueAt) fire();
      }
      const scheduleNextCheck = () => {
        if (fired) return;
        const remaining = dueAt - Date.now();
        if (remaining <= 0) fire();
        else timer = window.setTimeout(scheduleNextCheck, Math.min(remaining, 2_147_000_000));
      };
      document.addEventListener('visibilitychange', checkWhenVisible);
      scheduleNextCheck();
      cleanups.push(cancel);
    }
    return () => cleanups.forEach((cancel) => cancel());
  }, [raffleReminderKey, ps?.profile.id, update]);

  // Sync the profile into the graph, then load graph-derived data.
  const interestsKey = ps ? `${ps.profile.id}|${ps.profile.interests.join(',')}` : '';
  useEffect(() => {
    if (!backend || !ps) return;
    let cancelled = false;
    (async () => {
      try {
        await backend.upsertProfile({ id: ps.profile.id, interests: ps.profile.interests, fictional: ps.profile.fictional, name: ps.profile.fictional ? `${ps.profile.name} (fictional demo)` : 'My profile' });
        if (!ps.seeded) {
          // One-time: store the demo's fictional past meeting in the graph, then never re-create it.
          for (const p of DEMO_PAST.filter((x) => x.met)) {
            const pid = personId(p.met!.name, p.met!.company);
            await backend.recordMeeting(ps.profile.id, { meetingId: meetingIdFor(p.eventId, pid), personId: pid, eventId: p.eventId, at: SESSIONS.wad26na.find((s) => s.id === p.eventId)!.end, fictional: true, note: p.met!.note });
          }
          update((x) => ({ ...x, seeded: true }));
        }
        const [c, h, m, r] = await Promise.all([backend.candidates(ps.profile.id, conference), backend.hiringPaths(conference), backend.meetings(ps.profile.id), backend.roles()]);
        if (!cancelled) (setCandidates(c), setHiringPaths(h), setMeetings(m), setRoles(r), setError(undefined));
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [backend, interestsKey, conference, version]);

  const clock = DEMO_CLOCKS.find((c) => c.id === clockId) ?? DEMO_CLOCKS[0]!;
  const now = clock.now ?? new Date().toISOString();
  const sessions = [...SESSIONS[conference], ...(ps?.liveEvents ?? [])];
  const titles = Object.fromEntries([...Object.values(SESSIONS).flat(), ...(ps?.liveEvents ?? [])].map((s) => [s.id, s.title]));
  const allMeetings = [...meetings, ...(ps?.externalMeetings ?? [])];

  const derived = useMemo(() => {
    if (!ps || !backend) return undefined;
    const rewards = deriveRewards(ps, allMeetings, titles);
    const recs = rankRecommendations(candidates, SESSIONS[conference], { goals: ps.profile.goals, schedule: ps.schedule, now });
    const verifyAt = backend.mode === 'cached' ? roles.map((r) => r.checkedAt).sort().at(-1) : new Date().toISOString();
    const hiring = ps.profile.goals.includes('career') && CONFERENCES[conference].mode === 'upcoming'
      ? hiringConnections(hiringPaths, roles, SESSIONS[conference], { now, verifyAt, profile: { maxYearsExperience: ps.profile.maxYearsExperience } })
      : [];
    // Hiring touchpoints lead; don't repeat them in the general list.
    const hiringIds = new Set(hiring.map((h) => h.session.id));
    return { rewards, recs: recs.filter((r) => !hiringIds.has(r.session.id)), hiring };
  }, [ps, backend, allMeetings, candidates, hiringPaths, roles, sessions, now, conference, titles]);

  const showUndo = (message: string, previous: ScheduleItem[]) =>
    setToast({ message, action: 'Undo', onAction: () => (update((p) => ({ ...p, schedule: previous })), setToast(undefined)) });

  if (error && !backend) return <p className="entry">Couldn’t start: {error}</p>;
  if (!backend) return <p className="entry">Waking up your companion…</p>;

  if (!activeId || !ps || !derived) {
    return (
      <main className="entry">
        <div className="stack">
          <Companion kind="robot" color="#7c6cf2" size={140} label="Bolt the pocket robot" />
          <h1 className="brand" style={{ fontSize: '2rem' }}>
            ez<span>con</span>
          </h1>
          <p style={{ fontWeight: 800, fontSize: '1.15rem' }}>Turn a conference into a practical career opportunity plan.</p>
          <p className="small muted">A verified open role, the talk that connects you to that company, how to prepare, and an affordable way to get there.</p>
          <button className="btn primary" style={{ width: '100%' }} onClick={() => (save('active', DEMO_PROFILE.id), setActiveId(DEMO_PROFILE.id))}>
            Try the demo
          </button>
          <button
            className="btn"
            style={{ width: '100%' }}
            onClick={() => {
              save('active', BLANK_PROFILE.id);
              setActiveId(BLANK_PROFILE.id);
              setSheet({ kind: 'profile' });
            }}
          >
            Make it yours
          </button>
          <p className="tiny muted">No sign-up. The demo uses a fictional profile; your own profile stays in this browser.</p>
          <p className="tiny muted">{backend.label}</p>
        </div>
      </main>
    );
  }

  const psView: PState = { ...ps, rewards: derived.rewards };

  const ctx: Ctx = {
    backend,
    ps: psView,
    now,
    conference,
    sessions,
    recs: derived.recs,
    hiring: derived.hiring,
    candidates,
    meetings: allMeetings,
    exploreSection,
    setExploreSection,
    update,
    toggleGoal: (g: Goal) => update((p) => ({ ...p, profile: { ...p.profile, goals: p.profile.goals.includes(g) ? p.profile.goals.filter((x) => x !== g) : [...p.profile.goals, g] } })),
    add: (s) => {
      if (s.conference === 'external') update((p) => ({ ...p, liveEvents: [...(p.liveEvents ?? []).filter((e) => e.id !== s.id), s] }));
      const item = toScheduleItem(s);
      const r = addItem(ps.schedule, item, defaultBuffer);
      if (r.status === 'added') {
        update((p) => ({ ...p, schedule: r.schedule }));
        showUndo(`Added “${s.title}”`, r.previous);
      } else if (r.status === 'conflict') setSheet({ kind: 'conflict', item, conflicts: r.conflicts });
      else setToast({ message: 'Already on your schedule' });
    },
    remove: (eventId) => {
      const r = removeItem(ps.schedule, eventId);
      update((p) => ({ ...p, schedule: r.schedule }));
      showUndo('Removed from schedule', r.previous);
    },
    openWhy: (title, paths, note) => setSheet({ kind: 'why', title, paths, note }),
    openCheckIn: (item) => setSheet({ kind: 'checkin', item }),
    openPerson: (id) => setSheet({ kind: 'person', id }),
    openTravel: (session) => setSheet({ kind: 'travel', session }),
    openAchievements: () => setSheet({ kind: 'achievements' }),
    openRaffles: () => { setExploreSection('side-quests'); setTab('discover'); },
    openProfile: () => setSheet({ kind: 'profile' }),
    goTab: (nextTab) => { if (nextTab === 'discover') setExploreSection('quests'); setTab(nextTab); },
  };

  const checkIn = async (item: ScheduleItem, c: CheckIn, person?: { id: string; name: string }, note?: string) => {
    if (c === 'met' && person) {
      const meetingId = meetingIdFor(item.eventId, person.id);
      const input = { meetingId, personId: person.id, personName: person.name, eventId: item.eventId, at: item.end, fictional: ps.profile.fictional, note };
      if (item.eventId.startsWith('luma:')) {
        update((p) => ({ ...p, externalMeetings: [...(p.externalMeetings ?? []).filter((m) => m.meetingId !== meetingId), input] }));
      } else {
        try {
          await backend.recordMeeting(ps.profile.id, input);
        } catch (e) {
          setToast({ message: `Couldn’t save the meeting: ${(e as Error).message}` });
          return;
        }
        setVersion((v) => v + 1);
      }
      setToast({ message: `Saved: you met ${person.name}. It’s in your memory now.` });
    }
    update((p) => ({ ...p, checkins: { ...p.checkins, [item.eventId]: c } }));
    setSheet(null);
  };

  const undoMeeting = async (m: Meeting) => {
    if (m.eventId.startsWith('luma:')) {
      update((p) => {
        const followups = { ...p.followups };
        delete followups[m.meetingId];
        return { ...p, externalMeetings: (p.externalMeetings ?? []).filter((item) => item.meetingId !== m.meetingId), followups, checkins: { ...p.checkins, [m.eventId]: checkinAfterUndo(allMeetings, m.meetingId, m.eventId) } };
      });
      setSheet(null);
      setToast({ message: `Meeting with ${m.personName} removed; its badges were reversed.` });
      return;
    }
    await backend.removeMeeting(ps.profile.id, m.meetingId);
    update((p) => {
      const followups = { ...p.followups };
      delete followups[m.meetingId];
      return { ...p, followups, checkins: { ...p.checkins, [m.eventId]: checkinAfterUndo(allMeetings, m.meetingId, m.eventId) } };
    });
    setVersion((v) => v + 1);
    setSheet(null);
    setToast({ message: `Meeting with ${m.personName} removed; its badges were reversed.` });
  };

  const startFresh = async () => {
    await backend.reopen();
    window.location.reload();
  };

  const resetDemo = async () => {
    for (const m of allMeetings.filter((meeting) => !meeting.eventId.startsWith('luma:'))) await backend.removeMeeting(ps.profile.id, m.meetingId);
    clearAll();
    window.location.reload();
  };

  const conf = CONFERENCES[conference];
  const tabs: Array<[Tab, string, IconName]> = [
    ['today', 'Today', 'home'],
    ['discover', 'Explore', 'compass'],
    ['schedule', 'Schedule', 'calendar'],
    ['people', 'People', 'people'],
  ];

  return (
    <div className="app">
      <header className="header">
        <span className="brand">
          ez<span>con</span>
        </span>
        <select
          aria-label="Conference"
          value={conference}
          onChange={(e) => {
            const c = e.target.value as ConferenceId;
            save('conference', c);
            setConference(c);
          }}
          style={{ minHeight: 40, borderRadius: 999, border: '1px solid var(--line)', padding: '0 10px', background: 'var(--surface)', maxWidth: 170 }}
        >
          <option value="universe26">GitHub Universe 2026 · Upcoming</option>
          <option value="wad26na">WAD NA 2026 · Past</option>
        </select>
        <HeaderSearch
          now={now}
          onSelectConference={(c) => {
            save('conference', c);
            setConference(c);
            setExploreSection('quests');
            setTab('discover');
          }}
        />
        <button className="btn small primary" onClick={() => setSheet({ kind: 'qr' })} aria-label="My QR">
          My QR
        </button>
        <button className="icon-btn" style={{ padding: 0 }} onClick={() => setSheet({ kind: 'menu' })} aria-label="Companion menu">
          <Companion kind={ps.profile.companion} color={ps.profile.color} size={36} label="" />
        </button>
      </header>

      <div style={{ padding: '6px 16px 0', maxWidth: 1080, margin: '0 auto', width: '100%' }} className="row">
        <span className={`badge ${backend.mode === 'live' ? 'good' : 'info'}`}>{backend.label}</span>
        {ps.profile.fictional && <span className="badge warn">Fictional demo profile</span>}
        {clock.now && <span className="badge accent">Simulated clock: {clock.label.replace(' (simulated)', '')}</span>}
        {conf.mode === 'past' && <span className="badge">Past event · replay</span>}
        {error && <span className="badge bad">Graph unavailable: showing what loaded</span>}
      </div>

      <main className="main">
        <div>
          {tab === 'today' && <Today {...ctx} />}
          {tab === 'discover' && <Explore {...ctx} />}
          {tab === 'schedule' && <Schedule {...ctx} />}
          {tab === 'people' && <People {...ctx} />}
        </div>

      </main>

      <nav className="tabs" aria-label="Main">
        {tabs.map(([t, label, ico]) => (
          <button key={t} aria-current={tab === t ? 'page' : undefined} onClick={() => setTab(t)}>
            <Icon name={ico} size={22} />
            {label}
          </button>
        ))}
      </nav>

      {sheet?.kind === 'why' && <WhySheet title={sheet.title} paths={sheet.paths} note={sheet.note} onClose={() => setSheet(null)} />}
      {sheet?.kind === 'conflict' && (
        <ConflictSheet
          item={sheet.item}
          conflicts={sheet.conflicts}
          onChoose={(choice) => {
            const r = resolveConflict(ps.schedule, sheet.item, choice, defaultBuffer);
            if (choice === 'replace') {
              update((p) => ({ ...p, schedule: r.schedule }));
              showUndo(`Replaced with “${sheet.item.title}”`, r.previous);
            }
            setSheet(null);
          }}
        />
      )}
      {sheet?.kind === 'checkin' && <CheckInSheet ctx={ctx} item={sheet.item} onClose={() => setSheet(null)} onSubmit={(c, p, n) => checkIn(sheet.item, c, p, n)} />}
      {sheet?.kind === 'person' && <PersonSheet ctx={ctx} id={sheet.id} onClose={() => setSheet(null)} onUndoMeeting={undoMeeting} />}
      {sheet?.kind === 'achievements' && <AchievementsSheet ps={psView} onClose={() => setSheet(null)} onToggleAccessory={() => update((p) => ({ ...p, accessoryOn: !p.accessoryOn }))} onCustomize={() => setSheet({ kind: 'profile' })} />}
      {sheet?.kind === 'travel' && <TravelSheet ctx={ctx} session={sheet.session} onClose={() => setSheet(null)} />}
      {sheet?.kind === 'qr' && <QrSheet ps={psView} onClose={() => setSheet(null)} onEdit={() => setSheet({ kind: 'profile' })} />}
      {sheet?.kind === 'profile' && (
        <ProfileSheet
          ps={psView}
          onClose={() => setSheet(null)}
          onSave={(profile) => {
            update((p) => ({ ...p, profile }));
            setSheet(null);
            setToast({ message: 'Saved' });
          }}
        />
      )}
      {sheet?.kind === 'menu' && (
        <Sheet title={ps.profile.companionName} onClose={() => setSheet(null)}>
            <button className="btn" onClick={() => setSheet({ kind: 'profile' })}>
              My companion · Profile &amp; preferences
            </button>
            <label className="field">
              <span className="small">Demo clock</span>
              <select value={clockId} onChange={(e) => (save('clock', e.target.value), setClockId(e.target.value))}>
                {DEMO_CLOCKS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <button className="btn" onClick={startFresh}>
              Start a fresh session (reload memory)
            </button>
            <button
              className="btn"
              onClick={() => {
                save('active', undefined);
                setActiveId(undefined);
                setSheet(null);
              }}
            >
              Switch profile
            </button>
            <button className="btn ghost" onClick={resetDemo}>
              Reset demo data
            </button>
            <p className="tiny muted">{backend.mode === 'cached' ? 'Cached demo: your changes live only in this browser.' : 'Live local: meetings are stored in FalkorDB.'}</p>
        </Sheet>
      )}
      <SponsorActivity />
      {toast && <Toast message={toast.message} action={toast.action} onAction={toast.onAction} onDone={() => setToast(undefined)} />}
    </div>
  );
}
