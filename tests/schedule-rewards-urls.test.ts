import { addItem, resolveConflict, defaultBuffer, type ScheduleItem } from '../src/domain/schedule';
import { award, revokeAction, unlockedAccessories, emptyRewards } from '../src/domain/rewards';
import { validateProfileLink, isPublicFetchTarget } from '../src/domain/urls';

const item = (id: string, start: string, end: string, location = 'Cowell Theater @ Gateway Pavilion'): ScheduleItem => ({
  eventId: id,
  title: id,
  start: `2026-10-28T${start}:00-07:00`,
  end: `2026-10-28T${end}:00-07:00`,
  location,
  kind: 'fixed',
});

describe('schedule', () => {
  it('adds a conflict-free item immediately and keeps the previous schedule for Undo', () => {
    const r = addItem([], item('a', '10:00', '10:30'), defaultBuffer);
    expect(r.status).toBe('added');
    if (r.status !== 'added') return;
    expect(r.schedule.map((s) => s.eventId)).toEqual(['a']);
    expect(r.previous).toEqual([]);
  });

  it('keeps items in chronological order', () => {
    const one = addItem([], item('late', '14:00', '15:00'), defaultBuffer);
    const two = addItem(one.status === 'added' ? one.schedule : [], item('early', '09:00', '09:30'), defaultBuffer);
    expect(two.status === 'added' && two.schedule.map((s) => s.eventId)).toEqual(['early', 'late']);
  });

  it('reports overlap as a conflict instead of rearranging', () => {
    const base = [item('a', '12:10', '12:25', 'Demos & Donuts @ Gateway Pavilion, Level 2')];
    const r = addItem(base, item('b', '12:20', '12:35', 'Ship & Tell @ Firehouse'), defaultBuffer);
    expect(r).toMatchObject({ status: 'conflict', conflicts: [{ item: { eventId: 'a' }, reason: 'overlap' }] });
  });

  it('treats a too-short walk between different rooms as a travel-buffer conflict', () => {
    const base = [item('a', '12:00', '12:30', 'The Speakeasy @ GitHub Central, Festival Pavilion')];
    const r = addItem(base, item('b', '12:35', '13:00', 'Cowell Theater @ Gateway Pavilion'), defaultBuffer);
    expect(r).toMatchObject({ status: 'conflict', conflicts: [{ reason: 'travel-buffer' }] });
    // Same room back-to-back is fine.
    const same = addItem([item('a', '12:00', '12:30')], item('c', '12:30', '13:00'), defaultBuffer);
    expect(same.status).toBe('added');
  });

  it('rejects duplicates by canonical event id', () => {
    const base = [item('a', '10:00', '10:30')];
    expect(addItem(base, item('a', '10:00', '10:30'), defaultBuffer).status).toBe('duplicate');
  });

  it('Keep existing and Cancel leave the schedule untouched; Replace swaps only the conflicts', () => {
    const base = [item('a', '12:10', '12:25'), item('z', '16:00', '17:00')];
    const incoming = item('b', '12:20', '12:35');
    expect(resolveConflict(base, incoming, 'keep', defaultBuffer).schedule).toEqual(base);
    expect(resolveConflict(base, incoming, 'cancel', defaultBuffer).schedule).toEqual(base);
    const replaced = resolveConflict(base, incoming, 'replace', defaultBuffer);
    expect(replaced.schedule.map((s) => s.eventId)).toEqual(['b', 'z']);
    expect(replaced.previous).toEqual(base);
  });
});

describe('rewards', () => {
  it('awards a stamp once per action, however many times it is confirmed', () => {
    let s = emptyRewards();
    s = award(s, 'connection', 'meeting:andrea', 'Met Andrea');
    s = award(s, 'connection', 'meeting:andrea', 'Met Andrea');
    expect(s.awards).toHaveLength(1);
  });

  it('first Connection unlocks exactly one accessory', () => {
    let s = award(emptyRewards(), 'explorer', 'visit:a', 'Went to a session');
    expect(unlockedAccessories(s)).toEqual([]);
    s = award(s, 'connection', 'meeting:1', 'Met someone');
    s = award(s, 'connection', 'meeting:2', 'Met someone else');
    expect(unlockedAccessories(s)).toEqual(['star-scarf']);
  });

  it('undoing a meeting removes its stamp and any accessory that depended on it', () => {
    let s = award(emptyRewards(), 'connection', 'meeting:1', 'Met someone');
    s = award(s, 'follow-through', 'followup:meeting:1', 'Drafted follow-up');
    s = revokeAction(s, 'meeting:1');
    expect(s.awards.map((a) => a.stamp)).toEqual([]);
    expect(unlockedAccessories(s)).toEqual([]);
  });

  it('has no points, spending or prize fields', () => {
    const s = award(emptyRewards(), 'explorer', 'visit:a', 'Went');
    expect(Object.keys(s)).toEqual(['awards']);
    expect(Object.keys(s.awards[0]!).sort()).toEqual(['actionId', 'id', 'label', 'stamp']);
  });
});

describe('profile links for My QR', () => {
  it('accepts matching HTTPS links', () => {
    expect(validateProfileLink('github', 'https://github.com/octocat')).toEqual({ ok: true, url: 'https://github.com/octocat' });
    expect(validateProfileLink('linkedin', 'https://www.linkedin.com/in/example')).toMatchObject({ ok: true });
    expect(validateProfileLink('personal', 'https://example.dev/portfolio')).toMatchObject({ ok: true });
  });

  it.each([
    ['github', 'javascript:alert(1)'],
    ['personal', 'data:text/html,hi'],
    ['personal', 'http://example.dev'],
    ['personal', 'https://user:pass@example.dev'],
    ['github', 'https://github.com.evil.example/octocat'],
    ['linkedin', 'https://example.com/in/someone'],
    ['personal', 'https://localhost/me'],
    ['personal', 'https://192.168.1.10/me'],
    ['personal', ''],
    ['personal', '   '],
  ] as const)('rejects %s %j', (kind, url) => {
    expect(validateProfileLink(kind, url).ok).toBe(false);
  });

  it('trims whitespace before validating', () => {
    expect(validateProfileLink('github', '  https://github.com/octocat  ')).toEqual({ ok: true, url: 'https://github.com/octocat' });
  });
});

describe('server-side fetch targets (SSRF)', () => {
  const resolver = (map: Record<string, string[]>) => async (host: string) => map[host] ?? [];

  it('allows public HTTPS hosts that resolve to public addresses', async () => {
    expect(await isPublicFetchTarget('https://tailscale.com/universe-26', resolver({ 'tailscale.com': ['76.76.21.21'] }))).toEqual({ ok: true });
  });

  it.each([
    ['http://127.0.0.1:8790/', {}],
    ['https://localhost/', {}],
    ['https://[::1]/', {}],
    ['file:///etc/passwd', {}],
    ['https://metadata.internal/', {}],
    ['https://169.254.169.254/latest', {}],
    ['https://rebind.example/', { 'rebind.example': ['10.0.0.5'] }],
    ['https://v6.example/', { 'v6.example': ['fd00::1'] }],
    ['https://nowhere.example/', {}],
  ] as const)('rejects %s', async (url, map) => {
    expect((await isPublicFetchTarget(url, resolver(map as Record<string, string[]>))).ok).toBe(false);
  });
});
