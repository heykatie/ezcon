// @vitest-environment jsdom
// Core flow through the real UI: opportunity → schedule (undo, conflicts) → travel comparison.
import { act, cleanup, render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/web/App';

beforeEach(() => {
  localStorage.clear();
  // Deterministic simulated clock (Wed Oct 28, 8:00 AM PDT) so sessions are upcoming.
  localStorage.setItem('ezcon:v1:clock', JSON.stringify('wed-0800'));
  // No local API in tests: the app must fall back to the cached snapshot.
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const stored = () => JSON.parse(localStorage.getItem('ezcon:v1:profile/profile:demo/state') ?? '{}');
// Universe plan only; the demo also carries a finished WAD day as history.
const schedule = () => (stored().schedule ?? []).filter((s: { eventId: string }) => s.eventId.startsWith('universe26:')).map((s: { title: string }) => s.title);

async function startDemo() {
  const user = userEvent.setup();
  render(<App />);
  await user.click(await screen.findByRole('button', { name: 'Try the demo' }));
  await screen.findByRole('heading', { name: 'Today' });
  return user;
}

async function openExplore(user: ReturnType<typeof userEvent.setup>) {
  await user.click(within(screen.getByRole('navigation', { name: 'Main' })).getByRole('button', { name: /Explore/ }));
  await screen.findByRole('heading', { name: 'Hiring connections' });
}

describe('ezcon core flow', () => {
  it('opens the demo on Today with labeled cached data and a fictional profile', async () => {
    await startDemo();
    expect(screen.getByText('Cached snapshot · Oct 24, 2026')).toBeTruthy();
    expect(screen.getByText('Fictional demo profile')).toBeTruthy();
    expect(screen.getByText(/Simulated clock/)).toBeTruthy();
  });

  it('shows hiring connections only for the career goal, with an employer apply link kept separate from scheduling', async () => {
    const user = await startDemo();
    await openExplore(user);
    const card = screen.getAllByRole('article', { name: /Hiring connection: Software Engineer - Forward Deployed Engineer at Microsoft/ })[0]!;
    const apply = within(card).getByRole('link', { name: /View role & apply/ });
    expect(apply.getAttribute('href')).toMatch(/^https:\/\/apply\.careers\.microsoft\.com\/careers\/job\//);
    expect(apply.getAttribute('rel')).toContain('noopener');
    expect(within(card).getByRole('button', { name: 'Add event to Schedule' })).toBeTruthy();
    expect(within(card).getByText(/Open role · checked/)).toBeTruthy();
    // Cached mode must not claim a role is open now (Qodo re-review finding 4).
    expect(screen.queryByText(/currently open role/)).toBeNull();
    expect(screen.getAllByText(/open when last checked/).length).toBeGreaterThan(0);
    expect(within(card).getByText(/isn’t a referral/)).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Find my next opportunity' }));
    expect(screen.queryByRole('heading', { name: 'Hiring connections' })).toBeNull();
  });

  it('adds immediately with Undo, and Undo restores the previous schedule', async () => {
    const user = await startDemo();
    await openExplore(user);
    const card = screen.getByRole('heading', { name: /Build once, run on any agent/ }).closest('article')!;
    await user.click(within(card).getByRole('button', { name: 'Add to Schedule' }));
    expect(schedule()).toEqual(['Build once, run on any agent: a practical guide to agent skills']);
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(schedule()).toEqual([]);
  });

  it('dismisses the Undo toast on its own, even after re-renders', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />);
      await user.click(await screen.findByRole('button', { name: 'Try the demo' }));
      await user.click(await screen.findByRole('button', { name: 'Add event to Schedule' }));
      expect(screen.getByRole('button', { name: 'Undo' })).toBeTruthy();
      await user.hover(screen.getByRole('button', { name: 'Undo' })); // a tap on touch screens
      await act(() => vi.advanceTimersByTimeAsync(16_000));
      expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('asks Keep existing / Replace / Cancel on a conflict and never rearranges silently', async () => {
    const user = await startDemo();
    await openExplore(user);
    const buildOnce = screen.getByRole('heading', { name: /Build once, run on any agent/ }).closest('article')!;
    await user.click(within(buildOnce).getByRole('button', { name: 'Add to Schedule' }));

    const workshopCard = screen.getAllByRole('article').find((a) => within(a).queryByText('Building a developer knowledge base for GitHub Copilot'))!;
    await user.click(within(workshopCard).getByRole('button', { name: 'Add event to Schedule' }));
    const dialog = await screen.findByRole('dialog', { name: 'This overlaps your plan' });
    expect(within(dialog).getByRole('button', { name: 'Keep existing' })).toBeTruthy();
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeTruthy();

    await user.click(within(dialog).getByRole('button', { name: 'Keep existing' }));
    expect(schedule()).toEqual(['Build once, run on any agent: a practical guide to agent skills']);

    await user.click(within(workshopCard).getByRole('button', { name: 'Add event to Schedule' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Replace' }));
    expect(schedule()).toEqual(['Building a developer knowledge base for GitHub Copilot']);
  });

  it('compares up to three ways of getting to an event with cost and time', async () => {
    const user = await startDemo();
    await openExplore(user);
    const card = screen.getByRole('heading', { name: /Build once, run on any agent/ }).closest('article')!;
    await user.click(within(card).getByRole('button', { name: 'Getting there' }));
    const dialog = await screen.findByRole('dialog', { name: 'Getting there' });
    const options = within(dialog).getAllByRole('article');
    expect(options.length).toBeGreaterThan(0);
    expect(options.length).toBeLessThanOrEqual(3);
    expect(within(dialog).getByText('Cheapest overall')).toBeTruthy();
    expect(within(options[0]!).getByText('$14.70 est.')).toBeTruthy();
    expect(within(options[0]!).getByText(/min round trip door to door/)).toBeTruthy();
    expect(within(dialog).getAllByText(/may increase on high-attendance dates/).length).toBeGreaterThan(0);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('Today answers what to do now: a start-here opportunity, then the next item after adding it', async () => {
    const user = await startDemo();
    expect(screen.getByRole('heading', { name: 'Start here' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Add event to Schedule' }));
    expect(screen.getByRole('heading', { name: 'Next up' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Your day' })).toBeTruthy();
    expect(screen.getByText(/Get ready:/)).toBeTruthy();
  });

  it('shows the past WAD conference as a finished day with outcomes, not a plan', async () => {
    const user = await startDemo();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Conference' }), 'wad26na');
    await user.click(within(screen.getByRole('navigation', { name: 'Main' })).getByRole('button', { name: /Schedule/ }));
    expect(screen.getByText('What I did at this event')).toBeTruthy();
    expect(screen.getAllByText('Past event · replay').length).toBeGreaterThan(0);
    expect(screen.getByText(/Making “Works on All Machines”/)).toBeTruthy();
    expect(screen.getByText('✓ Went')).toBeTruthy();
    expect(screen.getByText('Skipped')).toBeTruthy();
    expect(await screen.findByText('Met Michael Irwin')).toBeTruthy();
    expect(within(screen.getByRole('main')).queryByText(/Build once|Fort Mason/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Remove' })).toBeNull();
  });

  it('Explore for a past event shows only what is still actionable', async () => {
    const user = await startDemo();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Conference' }), 'wad26na');
    await user.click(within(screen.getByRole('navigation', { name: 'Main' })).getByRole('button', { name: /Explore/ }));
    expect(screen.getByRole('heading', { name: 'Open roles at companies from this event' })).toBeTruthy();
    expect(screen.getByText(/No verified open roles yet at Docker/)).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Your applications from this event' })).toBeTruthy();
    expect(await screen.findByText('Michael Irwin')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Add to Schedule' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Quests' })).toBeNull();
  });

  it('expands a session card in place for more information', async () => {
    const user = await startDemo();
    await openExplore(user);
    const toggle = screen.getByRole('button', { name: /Build once, run on any agent/ });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    await user.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    const card = toggle.closest('article')!;
    expect(within(card).getByText(/Most developers use AI the same way/)).toBeTruthy();
    expect(within(card).getByText(/Shishir Tewari/)).toBeTruthy();
    expect(within(card).getByRole('link', { name: 'LinkedIn ↗' }).getAttribute('href')).toMatch(/^https:\/\/www\.linkedin\.com\/in\//);
  });

  it('lets you pick a route before adding the event', async () => {
    const user = await startDemo();
    await openExplore(user);
    const card = screen.getByRole('button', { name: /Build once, run on any agent/ }).closest('article')!;
    await user.click(within(card).getByRole('button', { name: 'Getting there' }));
    const dialog = await screen.findByRole('dialog', { name: 'Getting there' });
    await user.click(within(dialog).getAllByRole('button', { name: 'Use this route' })[1]!);
    await user.click(within(dialog).getByRole('button', { name: /Add to Schedule with Drive/ }));
    expect(schedule()).toEqual(['Build once, run on any agent: a practical guide to agent skills']);
    expect(stored().travelChoice).toBe('drive');
  });

  it('records a self-reported application without applying', async () => {
    const user = await startDemo();
    await openExplore(user);
    const card = screen.getAllByRole('article', { name: /Hiring connection/ })[0]!;
    await user.click(within(card).getByRole('button', { name: 'Mark as applied' }));
    expect(within(card).getByRole('button', { name: '✓ Applied' })).toBeTruthy();
    expect(stored().applications).toEqual([expect.objectContaining({ company: 'Microsoft', title: 'Software Engineer - Forward Deployed Engineer' })]);
    await user.click(within(card).getByRole('button', { name: '✓ Applied' }));
    expect(stored().applications).toEqual([]);
  });

  it('earns a Follow-through stamp for applying, shown in the Passport', async () => {
    const user = await startDemo();
    await openExplore(user);
    const card = screen.getAllByRole('article', { name: /Hiring connection/ })[0]!;
    await user.click(within(card).getByRole('button', { name: 'Mark as applied' }));
    await user.click(within(screen.getByRole('navigation', { name: 'Main' })).getByRole('button', { name: /Today/ }));
    await user.click(screen.getByRole('button', { name: /Level Up · \d+ stamps?/ }));
    const passport = await screen.findByRole('dialog', { name: 'Passport' });
    expect(within(passport).getByText(/Follow-through — Applied to Software Engineer - Forward Deployed Engineer at Microsoft/)).toBeTruthy();
  });

  it('saves a raffle ticket number with a confirmed entry', async () => {
    const user = await startDemo();
    await openExplore(user);
    const raffle = screen.getByRole('heading', { name: 'Tailscale keyboard raffle' }).closest('article')!;
    await user.type(within(raffle).getByRole('textbox', { name: /Ticket number/ }), '0427');
    await user.click(within(raffle).getByRole('button', { name: 'Save ticket' }));
    expect(within(raffle).getByText('Ticket #0427')).toBeTruthy();
    expect(stored().raffleTickets).toEqual([expect.objectContaining({ number: '0427' })]);
  });

  it('searches upcoming events from the header dropdown', async () => {
    const user = await startDemo();
    const search = screen.getByRole('combobox', { name: 'Search conferences & events' });
    await user.click(search);
    const list = screen.getByRole('listbox', { name: 'Upcoming events' });
    expect(within(list).getAllByRole('option')).toHaveLength(4);
    await user.type(search, 'kube');
    expect(within(list).getAllByRole('option').map((o) => o.textContent)).toEqual([expect.stringContaining('KubeCon')]);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('labels future features as previews, not working features', async () => {
    const user = await startDemo();
    await user.click(within(screen.getByRole('navigation', { name: 'Main' })).getByRole('button', { name: 'Next' }));
    const preview = screen.getByRole('heading', { name: 'Coming next', level: 3 }).closest('section')!;
    expect(within(preview).getByText('Concept preview — not working yet')).toBeTruthy();
    for (const f of ['Booth routing', 'Raffle ticket reading', 'Side quests']) expect(within(preview).getByText(f)).toBeTruthy();
    expect(within(preview).queryByRole('button')).toBeNull();
  });
});
